package result

import (
	"platform.local/common/pkg/httputil"
	"platform.local/platform/logger"
	"spatialhub_backend/internal/geoserver"
	"spatialhub_backend/internal/services"
	resultStore "spatialhub_backend/internal/store/result"
	"spatialhub_backend/internal/webservice"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"gorm.io/gorm"
)

const (
	errAccessDenied         = "Access denied"
	errModelNotFound        = "Model not found"
	errFailedToFetchModel   = "Failed to fetch model"
	maxCallbackZipSizeBytes = int64(500 * 1024 * 1024) // 500 MB
)

type ResultHandler struct {
	store               *resultStore.Store
	db                  *gorm.DB
	notificationService *services.NotificationService
	wsClient            *webservice.Client
	geoClient           geoserver.Client
	callbackSecret      string
	asynqClient         *asynq.Client
	geoserverPublicURL  string
}

// NewResultHandler constructs a ResultHandler. geoClient may be nil in
// environments that do not run the geoservice.
func NewResultHandler(
	db *gorm.DB,
	notificationService *services.NotificationService,
	wsClient *webservice.Client,
	callbackSecret string,
	asynqClient *asynq.Client,
	geoClient geoserver.Client,
	geoserverPublicURL string,
) *ResultHandler {
	return &ResultHandler{
		store:               resultStore.NewStore(db),
		db:                  db,
		notificationService: notificationService,
		wsClient:            wsClient,
		geoClient:           geoClient,
		callbackSecret:      callbackSecret,
		asynqClient:         asynqClient,
		geoserverPublicURL:  geoserverPublicURL,
	}
}

func (h *ResultHandler) GetModelResults(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	modelID := c.Param("id")

	model, ok := h.fetchModelByID(c, modelID)
	if !ok {
		return
	}

	if !h.userHasModelAccess(c, model, userCtx) {
		return
	}

	results, err := h.fetchResults(c, modelID)
	if err != nil {
		return
	}

	httputil.SuccessResponse(c, results)
}

func (h *ResultHandler) DownloadModelResult(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	modelID := c.Param("id")
	model, ok := h.fetchModelByID(c, modelID)
	if !ok {
		return
	}

	if !h.userHasModelAccess(c, model, userCtx) {
		return
	}

	results, err := h.fetchResults(c, modelID)
	if err != nil {
		return
	}

	if len(results) == 0 {
		httputil.NotFound(c, "No results found for this model")
		return
	}

	latestResult := results[0]

	if h.tryDownloadFromTifPath(c, modelID, latestResult.TifFilePath) {
		return
	}

	if h.tryDownloadFromStorageDir(c, modelID) {
		return
	}

	if h.tryDownloadTifFile(c, latestResult) {
		return
	}

	httputil.NotFound(c, "No downloadable file found for this model")
}

func (h *ResultHandler) CallbackUpload(c *gin.Context) {
	log := logger.ForComponent("callback")

	model, ok := h.findModelForCallback(c, log)
	if !ok {
		return
	}

	if respondIfAlreadyProcessed(c, model) {
		return
	}

	if h.handleFailureStatusIfNeeded(c, model, log) {
		return
	}

	targetPath, ok := h.saveResultFile(c, model, log)
	if !ok {
		return
	}

	h.processResultUpload(c, model, targetPath, log)
}
