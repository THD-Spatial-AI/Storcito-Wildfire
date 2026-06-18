// Package riskmetricshandler exposes the HTTP endpoint that serves
// computed risk metrics for a model.
package riskmetricshandler

import (
	"errors"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

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

	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	modelID, ok := parseModelID(c)
	if !ok {
		return
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
		return
	}

	metrics, err := h.service.CalculateForModel(c.Request.Context(), modelID)
	if err != nil {
		if errors.Is(err, riskmetricsservice.ErrNoConfiguredResult) || errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusOK, gin.H{"data": nil, "ready": false})
			return
		}
		log.Errorf("risk metrics calculation failed model_id=%d err=%v", modelID, err)
		httputil.InternalError(c, "Failed to calculate risk metrics")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": metrics, "ready": true})
}

// GetMapSamples handles GET /models/:id/risk-map-samples.
func (h *Handler) GetMapSamples(c *gin.Context) {
	log := logger.ForComponent("risk_metrics")

	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	modelID, ok := parseModelID(c)
	if !ok {
		return
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
		return
	}

	sampleCount := parseSampleCount(c.Query("sample_count"))
	samples, err := h.service.SampleMapForModel(c.Request.Context(), modelID, sampleCount)
	if err != nil {
		if errors.Is(err, riskmetricsservice.ErrNoConfiguredResult) || errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusOK, gin.H{"data": nil, "ready": false})
			return
		}
		log.Errorf("risk map sampling failed model_id=%d err=%v", modelID, err)
		httputil.InternalError(c, "Failed to sample risk map")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": samples, "ready": true})
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
