package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"

	feedback "spatialhub_backend/internal/handler/feedback"
	grouphandler "spatialhub_backend/internal/handler/group"
	notificationshandler "spatialhub_backend/internal/handler/notifications"
	settingshandler "spatialhub_backend/internal/handler/settings"
	usershandler "spatialhub_backend/internal/handler/users"
	"spatialhub_backend/internal/handler/weather"
	"spatialhub_backend/internal/middleware"
	modelhandler "spatialhub_backend/internal/model/handler"
	resulthandler "spatialhub_backend/internal/result/handler"
	riskmetricshandler "spatialhub_backend/internal/risk_metrics/handler"
	"spatialhub_backend/internal/webservice"
	workspacehandler "spatialhub_backend/internal/workspace/handler"

	"platform.local/platform/proxy"
	"platform.local/platform/server"
)

const (
	routeSettings      = "/settings"
	routeFeedbackByID  = "/feedback/:id"
	routeUsersByID     = "/users/:id"
	routeWorkspaceByID = "/workspaces/:id"
	routeGroupByID     = "/groups/:id"
	routeMembers       = "/members"
	routeGroups        = "/groups"
	routeModelByID     = "/models/:id"
)

const (
	headerContentType                   = "Content-Type"
	headerAccept                        = "Accept"
	headerAccessControlAllowOrigin      = "access-control-allow-origin"
	headerAccessControlAllowCredentials = "access-control-allow-credentials"
	headerAccessControlAllowMethods     = "access-control-allow-methods"
	headerAccessControlAllowHeaders     = "access-control-allow-headers"
	headerAccessControlExposeHeaders    = "access-control-expose-headers"
)

type Deps struct {
	AuthServiceURL             string
	SessionCookieMaxAgeSeconds int
	CookieDomain               string
	IsProduction               bool

	// APITokenValidator enables personal access tokens on the protected API when non-nil.
	APITokenValidator middleware.APITokenValidator

	ResultHandler         *resulthandler.ResultHandler
	PublicFeedbackHandler *feedback.FeedbackHandler
	FeedbackHandler       *feedback.FeedbackHandler
	UsersHandler          *usershandler.Handler
	SettingsHandler       *settingshandler.SettingsHandler
	NotificationsHandler  *notificationshandler.Handler
	WorkspaceHandler      *workspacehandler.WorkspaceHandler
	GroupHandler          *grouphandler.GroupHandler
	ModelHandler          *modelhandler.ModelHandler
	RiskHandler           *riskmetricshandler.Handler
	WeatherHandler        *weather.WeatherHandler
	WebserviceClient      *webservice.Client
}

func Register(r *gin.Engine, deps Deps) {
	RegisterPublic(r, deps)
	RegisterProtected(r, deps)
	registerFrontend(r)
}

func RegisterPublic(r *gin.Engine, deps Deps) {
	api := r.Group("/api")

	api.GET("/health", server.HealthHandler("backend"))

	authProxy := proxy.MustNewHandler(deps.AuthServiceURL, proxy.HandlerOptions{
		Component:            "auth_proxy",
		ForwardCookies:       true,
		RequestHeaderMutator: proxy.CopyHeadersExcept("Cookie"),
		ResponseHeaderMutator: proxy.CopyHeadersSkipping(map[string]struct{}{
			headerAccessControlAllowOrigin:      {},
			headerAccessControlAllowCredentials: {},
			headerAccessControlAllowMethods:     {},
			headerAccessControlAllowHeaders:     {},
			headerAccessControlExposeHeaders:    {},
		}),
	})
	registerAuthRoutes(api, authProxy)

	api.POST("/v1/calculation/callback/:id", middleware.CallbackAuthMiddleware(), deps.ResultHandler.CallbackUpload)
	api.POST("/feedback/public", deps.PublicFeedbackHandler.CreatePublicFeedback)

	registerInternalRoutes(r, deps)
}

// registerInternalRoutes mounts the internal lifecycle API other services use to change model status.
func registerInternalRoutes(r *gin.Engine, deps Deps) {
	internal := r.Group("/api/internal")
	internal.Use(middleware.CallbackAuthMiddleware())
	internal.GET("/models/active", deps.ModelHandler.ActiveModels)
	internal.POST("/models/:id/mark-running", deps.ModelHandler.MarkRunning)
	internal.POST("/models/:id/mark-failed", deps.ModelHandler.MarkFailed)
	internal.PATCH("/models/:id/run-session", deps.ModelHandler.SetRunSession)
}

func RegisterProtected(r *gin.Engine, deps Deps) {
	protectedAPI := r.Group("/api")
	if deps.APITokenValidator != nil {
		// Must run before the session middleware.
		protectedAPI.Use(middleware.APITokenAuth(deps.APITokenValidator))
	}
	protectedAPI.Use(middleware.AuthServiceMiddleware(middleware.AuthServiceOptions{
		AuthServiceURL:             deps.AuthServiceURL,
		SessionCookieMaxAgeSeconds: deps.SessionCookieMaxAgeSeconds,
		CookieDomain:               deps.CookieDomain,
		IsProduction:               deps.IsProduction,
	}))

	protectedAPI.GET("/auth/keep-alive", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	registerProfileRoutes(protectedAPI, deps.UsersHandler)
	registerSettingsRoutes(protectedAPI, deps.SettingsHandler)
	registerFeedbackRoutes(protectedAPI, deps.FeedbackHandler)
	registerUserManagementRoutes(protectedAPI, deps.UsersHandler)
	registerWebserviceProxyRoutes(protectedAPI, deps.WebserviceClient)
	registerNotificationRoutes(protectedAPI, deps.NotificationsHandler)
	registerWorkspaceRoutes(protectedAPI, deps.WorkspaceHandler)
	ensureDefaultGroupExists(deps.GroupHandler)
	registerGroupRoutes(protectedAPI, deps.GroupHandler)
	registerModelRoutes(protectedAPI, deps.ModelHandler, deps.ResultHandler, deps.RiskHandler)
	registerWeatherRoutes(protectedAPI, deps.WeatherHandler)
}

func registerFrontend(r *gin.Engine) {
	r.Static("/assets", "./www/assets")
	r.Static("/images", "./www/images")
	r.StaticFile("/vite.svg", "./www/vite.svg")

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if len(path) >= 4 && path[:4] == "/api" {
			c.JSON(404, gin.H{"error": "API endpoint not found"})
			return
		}
		c.File("./www/index.html")
	})
}
