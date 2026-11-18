// Package riskmetricshandler serves the risk-metrics HTTP endpoints.
package riskmetricshandler

import (
	"errors"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/sirupsen/logrus"
	"platform.local/common/pkg/httputil"
	"platform.local/platform/logger"

	"spatialhub_backend/internal/access"
	riskmetricsservice "spatialhub_backend/internal/risk_metrics/service"
)

// Handler serves GET /models/:id/risk-metrics.
type Handler struct {
	service     *riskmetricsservice.Service
	accessStore access.ModelAccessStore
}

// NewHandler constructs the handler. Both dependencies are required.
func NewHandler(service *riskmetricsservice.Service, accessStore access.ModelAccessStore) *Handler {
	return &Handler{service: service, accessStore: accessStore}
}

// Get handles GET /models/:id/risk-metrics.
func (h *Handler) Get(c *gin.Context) {
	log := logger.ForComponent("risk_metrics")

	modelID, ok := h.authorizedModelID(c, log)
	if !ok {
		return
	}

	metrics, err := h.service.CalculateForModel(c.Request.Context(), modelID)
	respond(c, log, modelID, metrics, err, "risk metrics calculation failed", "Failed to calculate risk metrics")
}

// GetMapSamples handles GET /models/:id/risk-map-samples.
func (h *Handler) GetMapSamples(c *gin.Context) {
	log := logger.ForComponent("risk_metrics")

	modelID, ok := h.authorizedModelID(c, log)
	if !ok {
		return
	}

	sampleCount := parseSampleCount(c.Query("sample_count"))
	samples, err := h.service.SampleMapForModel(c.Request.Context(), modelID, sampleCount)
	respond(c, log, modelID, samples, err, "risk map sampling failed", "Failed to sample risk map")
}

// GetDailyDistributions handles GET /models/:id/risk-daily-distribution.
func (h *Handler) GetDailyDistributions(c *gin.Context) {
	log := logger.ForComponent("risk_metrics")

	modelID, ok := h.authorizedModelID(c, log)
	if !ok {
		return
	}

	series, err := h.service.DailyDistributionsForModel(c.Request.Context(), modelID)
	respond(c, log, modelID, series, err, "daily risk distribution failed", "Failed to compute daily risk distribution")
}

// check model access
func (h *Handler) authorizedModelID(c *gin.Context, log *logrus.Entry) (uint, bool) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return 0, false
	}

	modelID, ok := parseModelID(c)
	if !ok {
		return 0, false
	}

	if _, err := access.EnsureModelAccess(h.accessStore, userCtx, modelID); err != nil {
		switch {
		case errors.Is(err, access.ErrModelNotFound):
			httputil.NotFound(c, "Model not found")
		case errors.Is(err, access.ErrForbidden):
			httputil.Forbidden(c, "Access denied")
		default:
			log.Errorf("access check failed model_id=%d err=%v", modelID, err)
			httputil.InternalError(c, "Failed to verify access")
		}
		return 0, false
	}
	return modelID, true
}

// send ready data
func respond(c *gin.Context, log *logrus.Entry, modelID uint, data any, err error, logMsg, userMsg string) {
	if err != nil {
		if errors.Is(err, riskmetricsservice.ErrNoConfiguredResult) || errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusOK, gin.H{"data": nil, "ready": false})
			return
		}
		log.Errorf("%s model_id=%d err=%v", logMsg, modelID, err)
		httputil.InternalError(c, userMsg)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": data, "ready": true})
}

func parseModelID(c *gin.Context) (uint, bool) {
	raw := c.Param("id")
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		httputil.BadRequest(c, "Invalid model id")
		return 0, false
	}
	return uint(id), true
}

func parseSampleCount(raw string) int {
	const defaultSampleCount = 625
	const minSampleCount = 100
	const maxSampleCount = 1600

	if raw == "" {
		return defaultSampleCount
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return defaultSampleCount
	}
	return int(math.Max(minSampleCount, math.Min(maxSampleCount, float64(value))))
}
