package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	"go.uber.org/automaxprocs/maxprocs"

	"spatialhub_backend/internal/apitoken"
	"spatialhub_backend/internal/cache"
	"spatialhub_backend/internal/config"
	"spatialhub_backend/internal/events"
	geoserverclient "spatialhub_backend/internal/geoserver"
	feedback "spatialhub_backend/internal/handler/feedback"
	grouphandler "spatialhub_backend/internal/handler/group"
	notificationshandler "spatialhub_backend/internal/handler/notifications"
	settingshandler "spatialhub_backend/internal/handler/settings"
	usershandler "spatialhub_backend/internal/handler/users"
	"spatialhub_backend/internal/handler/weather"
	"spatialhub_backend/internal/jobs"
	"spatialhub_backend/internal/middleware"
	modelhandler "spatialhub_backend/internal/model/handler"
	resulthandler "spatialhub_backend/internal/result/handler"
	riskmetricshandler "spatialhub_backend/internal/risk_metrics/handler"
	riskmetricsservice "spatialhub_backend/internal/risk_metrics/service"
	"spatialhub_backend/internal/routes"
	"spatialhub_backend/internal/services"
	apitokenstore "spatialhub_backend/internal/store/apitoken"
	feedbackstore "spatialhub_backend/internal/store/feedback"
	resultStore "spatialhub_backend/internal/store/result"
	"spatialhub_backend/internal/webservice"
	"spatialhub_backend/internal/worker"
	workspacehandler "spatialhub_backend/internal/workspace/handler"

	authplatform "platform.local/platform/auth"
	platformconfig "platform.local/platform/config"
	platformdatabase "platform.local/platform/database"
	platformemail "platform.local/platform/email"
	platformlogger "platform.local/platform/logger"
	platformsecurity "platform.local/platform/security"
	platformserver "platform.local/platform/server"
	redisstore "platform.local/platform/session/redis"
	platformworker "platform.local/platform/worker"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	goredis "github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

const (
	headerContentType = "Content-Type"
	headerAccept      = "Accept"
)

func main() {
	// Set GIN to release mode to disable debug messages
	gin.SetMode(gin.ReleaseMode)

	// Automatically set GOMAXPROCS to match container CPU quota (silenced)
	maxprocs.Set(maxprocs.Logger(func(string, ...interface{}) {}))

	if err := platformlogger.Init("logs", "app"); err != nil {
		panic(fmt.Sprintf("failed to init logger: %v", err))
	}
	log := platformlogger.Logger

	cfg, err := config.LoadFromEnv()
	if err != nil {
		log.Fatalf("failed to load and parse config : %v", err)
		return
	}

	platformconfig.SetupTimezone(cfg.AppTimezone, log)
	serverAddr := fmt.Sprintf("%s:%s", cfg.AppHost, cfg.AppPort)

	appDeps := initializeInfrastructure(cfg, log)
	defer appDeps.Close()

	r := setupGinEngine(cfg, log)

	configureRoutes(r, cfg, appDeps)

	// Start background cleanup for old closed/resolved feedback (every 24h, deletes after 7 days)
	go startFeedbackCleanup(appDeps.DB, log)

	// Start the outbox relay that publishes domain events to the async queue.
	outboxRelay := events.NewRelay(
		events.NewOutboxStore(appDeps.DB),
		jobs.NewAsynqEventPublisher(appDeps.AsynqClient),
	)
	outboxRelay.Start(5 * time.Second)
	defer outboxRelay.Stop()

	runHTTPServer(serverAddr, r, log)
}

// AppDependencies holds all infrastructure connections and their cleanup functions
type AppDependencies struct {
	DB                  *gorm.DB
	SQLdb               *sql.DB
	RedisClient         *goredis.Client
	AsynqClient         *asynq.Client
	AsynqServer         *asynq.Server
	AdminTokenProvider  *authplatform.AdminTokenProvider
	NotificationService *services.NotificationService
	WebserviceClient    *webservice.Client
	GeoserverClient     geoserverclient.Client
	KeycloakCache       *cache.KeycloakCacheService
	SyncCache           *cache.SyncCacheService
	Cfg                 *config.Config
}

// Close properly closes all infrastructure connections
func (d *AppDependencies) Close() {
	if d.SQLdb != nil {
		_ = d.SQLdb.Close()
	}
	if d.RedisClient != nil {
		_ = d.RedisClient.Close()
	}
	if d.AsynqClient != nil {
		_ = d.AsynqClient.Close()
	}
	if d.AsynqServer != nil {
		d.AsynqServer.Shutdown()
	}
}

// initializeInfrastructure sets up database, Redis, auth, and async workers
func initializeInfrastructure(cfg *config.Config, log *logrus.Logger) *AppDependencies {
	db, sqlDB, err := platformdatabase.ConnectWithPing(cfg.Database)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	log.WithField("component", "startup").Info("Database connection successful")

	// Configure connection pool
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(time.Hour)

	ctx := context.Background()
	redisClient, err := platformdatabase.ConnectRedis(ctx, cfg.RedisConfig)
	if err != nil {
		log.Fatalf("failed to connect to Redis: %v", err)
	}

	asynqRedisOpt := asynq.RedisClientOpt{
		Addr:     cfg.RedisConfig.Addr,
		Password: cfg.RedisConfig.Password,
		DB:       cfg.RedisConfig.DB,
	}

	asynqClient := platformworker.NewClient(asynqRedisOpt)

	asynqServer := platformworker.NewServer(platformworker.ServerConfig{
		RedisOpt:    asynqRedisOpt,
		Concurrency: 10,
		Queues: map[string]int{
			"notifications": 5,
			"results":       3,
		},
	})

	adminTokenProvider := authplatform.NewAdminTokenProvider(
		cfg.Auth.BaseURL,
		cfg.Auth.Realm,
		cfg.Auth.ClientID,
		cfg.Auth.ClientSecret,
	)

	emailService := platformemail.NewEmailService(platformemail.SMTPConfig{
		Host:      cfg.Email.SMTPHost,
		Port:      cfg.Email.SMTPPort,
		Username:  cfg.Email.SMTPUsername,
		Password:  cfg.Email.SMTPPassword,
		FromEmail: cfg.Email.SMTPFromEmail,
		FromName:  cfg.Email.SMTPFromName,
		UseTLS:    cfg.Email.SMTPUseTLS,
	})

	notificationService := services.NewNotificationService(db, emailService, redisClient, nil)
	webserviceClient := webservice.NewClient(cfg.WebserviceServiceURL)
	var geoserverClient geoserverclient.Client
	if cfg.GeoserverServiceURL != "" {
		geoserverClient = geoserverclient.NewHTTPClient(cfg.GeoserverServiceURL)
	}

	taskProcessor := worker.NewTaskProcessor(db, redisClient, notificationService, webserviceClient, geoserverClient)

	go func() {
		if err := asynqServer.Run(taskProcessor.ServeMux()); err != nil {
			log.Fatalf("Failed to run Asynq server: %v", err)
		}
	}()

	keycloakCache := cache.NewKeycloakCacheService(redisClient)
	syncCache := cache.NewSyncCacheService(redisClient)

	return &AppDependencies{
		DB:                  db,
		SQLdb:               sqlDB,
		RedisClient:         redisClient,
		AsynqClient:         asynqClient,
		AsynqServer:         asynqServer,
		AdminTokenProvider:  adminTokenProvider,
		NotificationService: notificationService,
		WebserviceClient:    webserviceClient,
		GeoserverClient:     geoserverClient,
		KeycloakCache:       keycloakCache,
		SyncCache:           syncCache,
		Cfg:                 cfg,
	}
}

// setupGinEngine creates and configures the Gin engine with middleware
func setupGinEngine(cfg *config.Config, log *logrus.Logger) *gin.Engine {
	trusted := []string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"}

	r, err := platformserver.InitGin(trusted, platformsecurity.SecurityHeaders())
	if err != nil {
		log.Warnf("Failed to set trusted proxies: %v", err)
	}

	extraOrigins := strings.Fields(os.Getenv("CORS_EXTRA_ORIGINS"))
	allowedOrigins := platformserver.BuildCORSOrigins(cfg.AppURL, extraOrigins...)
	originSet := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		originSet[origin] = struct{}{}
	}

	corsConfig := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", headerContentType, headerAccept, "Authorization", "X-Requested-With", "X-CSRF-Token"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
	}

	corsConfig.AllowOriginFunc = func(origin string) bool {
		if origin == "" {
			return false
		}
		if len(originSet) == 0 {
			return false
		}
		_, ok := originSet[origin]
		return ok
	}

	r.Use(cors.New(corsConfig))
	r.Use(middleware.RequestMetrics())
	r.Use(middleware.RateLimit())

	return r
}

// configureRoutes sets up all application routes.
func configureRoutes(r *gin.Engine, cfg *config.Config, deps *AppDependencies) {
	routes.Register(r, buildRouteDeps(cfg, deps))
}

func runHTTPServer(addr string, engine *gin.Engine, log *logrus.Logger) {
	srv := platformserver.NewHTTPServer(platformserver.HTTPServerConfig{
		Addr:         addr,
		Handler:      engine,
		ReadTimeout:  300 * time.Second,
		WriteTimeout: 60 * time.Second,
	})

	platformserver.RunWithGracefulShutdown(srv, log, 10*time.Second)
}

func buildRouteDeps(cfg *config.Config, deps *AppDependencies) routes.Deps {
	sessionStore := redisstore.NewSessionRedisManager(deps.RedisClient, cfg.SessionTTLMinutes)

	feedbackHandler := feedback.NewFeedbackHandler(deps.DB)
	usersHandler := usershandler.New(cfg, deps.DB, sessionStore, deps.AdminTokenProvider)
	settingsHandler := settingshandler.NewSettingsHandler(deps.DB)
	notificationsHandler := notificationshandler.NewHandlerWithAsynqAndRedis(deps.DB, deps.AsynqClient, deps.RedisClient)
	workspaceHandler := workspacehandler.NewWorkspaceHandler(deps.DB, deps.AdminTokenProvider, cfg.Auth.BaseURL, cfg.Auth.Realm, deps.KeycloakCache)
	groupHandler := grouphandler.NewGroupHandler(deps.DB, deps.AdminTokenProvider, cfg.Auth.BaseURL, cfg.Auth.Realm, sessionStore)
	modelHandler := modelhandler.NewModelHandlerWithCache(deps.DB, deps.AsynqClient, deps.AdminTokenProvider, cfg.Auth.BaseURL, cfg.Auth.Realm, deps.WebserviceClient, deps.KeycloakCache, deps.SyncCache, deps.NotificationService)
	resultHandler := resulthandler.NewResultHandler(deps.DB, deps.NotificationService, deps.WebserviceClient, cfg.CallbackSecret, deps.AsynqClient, deps.GeoserverClient, cfg.GeoserverPublicURL)
	riskStore := riskmetricsservice.NewGormResultStore(deps.DB)
	riskService := riskmetricsservice.NewService(riskStore, deps.GeoserverClient)
	riskHandler := riskmetricshandler.NewHandler(riskService, resultStore.NewStore(deps.DB))
	weatherHandler := weather.NewWeatherHandler()

	return routes.Deps{
		AuthServiceURL:             cfg.AuthServiceURL,
		SessionCookieMaxAgeSeconds: cfg.SessionTTLMinutes * 60,
		CookieDomain:               cfg.CookieDomain,
		IsProduction:               cfg.AppEnv == "production",
		APITokenValidator:          apitoken.NewService(apitokenstore.NewStore(deps.DB)),
		ResultHandler:              resultHandler,
		PublicFeedbackHandler:      feedback.NewFeedbackHandler(deps.DB),
		FeedbackHandler:            feedbackHandler,
		UsersHandler:               usersHandler,
		SettingsHandler:            settingsHandler,
		NotificationsHandler:       notificationsHandler,
		WorkspaceHandler:           workspaceHandler,
		GroupHandler:               groupHandler,
		ModelHandler:               modelHandler,
		RiskHandler:                riskHandler,
		WeatherHandler:             weatherHandler,
		WebserviceClient:           deps.WebserviceClient,
	}
}

func startFeedbackCleanup(db *gorm.DB, log *logrus.Logger) {
	store := feedbackstore.NewStore(db)
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	// Run once at startup, then every 24h
	for {
		deleted, err := store.DeleteClosedOlderThan(7)
		if err != nil {
			log.Errorf("feedback cleanup failed: %v", err)
		} else if deleted > 0 {
			log.Infof("feedback cleanup: deleted %d closed/resolved items older than 7 days", deleted)
		}
		<-ticker.C
	}
}
