package model

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"platform.local/common/pkg/contracts"
	"platform.local/common/pkg/httputil"
	commonModels "platform.local/common/pkg/models"
	platformlogger "platform.local/platform/logger"

	"spatialhub_backend/internal/events"
)

// Internal lifecycle endpoints — the only way other services may change a model's status.

func parseModelID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		httputil.BadRequest(c, "Invalid model id")
		return 0, false
	}
	return uint(id), true
}

// MarkRunning moves a queued model to running; answers 409 if it was already claimed.
func (h *ModelHandler) MarkRunning(c *gin.Context) {
	log := platformlogger.ForComponent("model:internal")
	id, ok := parseModelID(c)
	if !ok {
		return
	}
	var req contracts.MarkRunningRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "Invalid request body")
		return
	}
	if !contracts.CanTransition(contracts.StatusQueue, contracts.StatusRunning) {
		httputil.BadRequest(c, "Illegal transition")
		return
	}

	now := time.Now().UTC()
	extra := map[string]interface{}{
		"webservice_id":            req.WebserviceID,
		"calculation_started_at":   now,
		"calculation_completed_at": nil,
	}
	ev, _ := events.NewModelEvent(events.ModelRunning, id, "",
		map[string]interface{}{"webservice_id": req.WebserviceID})
	claimed, err := h.store.TransitionStatusTx(id,
		[]string{commonModels.ModelStatusQueue}, commonModels.ModelStatusRunning, extra, ev)
	if err != nil {
		log.Errorf("mark-running failed model_id=%d err=%v", id, err)
		httputil.InternalError(c, "Failed to mark model running")
		return
	}
	if !claimed {
		// Not in queue anymore — already dispatched, cancelled or finished.
		c.JSON(http.StatusConflict, contracts.TransitionResponse{
			ModelID: id, Status: "", Claimed: false,
		})
		return
	}
	c.JSON(http.StatusOK, contracts.TransitionResponse{
		ModelID: id, Status: commonModels.ModelStatusRunning, Claimed: true,
	})
}

// MarkFailed marks an in-flight model as failed with a reason (idempotent).
func (h *ModelHandler) MarkFailed(c *gin.Context) {
	log := platformlogger.ForComponent("model:internal")
	id, ok := parseModelID(c)
	if !ok {
		return
	}
	var req contracts.MarkFailedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "Invalid request body")
		return
	}
	reason := req.Reason
	if reason == "" {
		reason = "Calculation failed"
	}
	now := time.Now().UTC()
	extra := map[string]interface{}{
		"webservice_id":            nil,
		"calculation_completed_at": now,
		"results":                  map[string]interface{}{"error": reason},
	}
	ev, _ := events.NewModelEvent(events.ModelFailed, id, "",
		map[string]interface{}{"reason": reason})
	// Only fail models that are queued or running. A model in 'processing' is
	// being ingested by the backend itself and must not be failed externally.
	_, err := h.store.TransitionStatusTx(id,
		[]string{commonModels.ModelStatusQueue, commonModels.ModelStatusRunning},
		commonModels.ModelStatusFailed, extra, ev)
	if err != nil {
		log.Errorf("mark-failed failed model_id=%d err=%v", id, err)
		httputil.InternalError(c, "Failed to mark model failed")
		return
	}
	c.JSON(http.StatusOK, contracts.TransitionResponse{
		ModelID: id, Status: commonModels.ModelStatusFailed, Claimed: true,
	})
}

// ActiveModels returns all queued/running models for the webservice scheduler.
func (h *ModelHandler) ActiveModels(c *gin.Context) {
	log := platformlogger.ForComponent("model:internal")
	rows, err := h.store.FindActiveModels()
	if err != nil {
		log.Errorf("active-models query failed err=%v", err)
		httputil.InternalError(c, "Failed to list active models")
		return
	}
	out := make([]contracts.ActiveModel, 0, len(rows))
	for i := range rows {
		out = append(out, contracts.ActiveModel{
			ModelID:              rows[i].ID,
			WebserviceID:         rows[i].WebserviceID,
			Status:               rows[i].Status,
			CalculationStartedAt: rows[i].CalculationStartedAt,
		})
	}
	c.JSON(http.StatusOK, contracts.ActiveModelsResponse{Models: out})
}

// SetRunSession saves session metadata from the compute instance; never changes status.
func (h *ModelHandler) SetRunSession(c *gin.Context) {
	log := platformlogger.ForComponent("model:internal")
	id, ok := parseModelID(c)
	if !ok {
		return
	}
	var req contracts.RunSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "Invalid request body")
		return
	}
	updates := map[string]interface{}{"updated_at": time.Now().UTC()}
	if req.SessionID != nil {
		updates["session_id"] = *req.SessionID
	}
	if req.CallbackURL != nil {
		updates["callback_url"] = *req.CallbackURL
	}
	if len(updates) > 1 {
		if err := h.store.PatchByID(id, updates); err != nil {
			log.Errorf("set-run-session failed model_id=%d err=%v", id, err)
			httputil.InternalError(c, "Failed to persist session metadata")
			return
		}
	}
	c.JSON(http.StatusOK, contracts.TransitionResponse{ModelID: id, Status: "", Claimed: true})
}
