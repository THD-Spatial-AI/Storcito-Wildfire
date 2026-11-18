package model

import (
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"platform.local/common/pkg/httputil"
	"spatialhub_backend/internal/events"
	"platform.local/common/pkg/models"
)

type adminMetrics struct {
	TotalModels   int64    `json:"total_models"`
	CreatedToday  int64    `json:"created_today"`
	Runs24h       int64    `json:"runs_24h"`
	Failed24h     int64    `json:"failed_24h"`
	Queued        int64    `json:"queued"`
	Running       int64    `json:"running"`
	AvgRunSeconds *float64 `json:"avg_run_seconds"`
}

// admin page numbers
func (h *ModelHandler) GetAdminMetrics(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	if !httputil.RequireManagerOrExpertAccess(nil, c) {
		return
	}
	base, ok := h.buildQueryWithWorkspaceFilter(c, userCtx, "", 1, 0)
	if !ok {
		return
	}
	scope := func() *gorm.DB {
		return base.Session(&gorm.Session{}).Model(&models.Model{}).Where("deleted_at IS NULL")
	}

	now := time.Now()
	dayAgo := now.Add(-24 * time.Hour)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var m adminMetrics
	counts := []struct {
		query *gorm.DB
		dst   *int64
	}{
		{scope().Where("parent_model_id IS NULL"), &m.TotalModels},
		{scope().Where("parent_model_id IS NULL AND created_at >= ?", today), &m.CreatedToday},
		{scope().Where("status = ?", "queue"), &m.Queued},
		{scope().Where("status IN ?", []string{"calculating", "running", "processing"}), &m.Running},
	}
	for _, item := range counts {
		if err := item.query.Count(item.dst).Error; err != nil {
			httputil.InternalError(c, "Failed to load admin metrics")
			return
		}
	}

	// one event per run
	runs := func(eventType string) *gorm.DB {
		return h.store.DB().Table("outbox_events").
			Where("event_type = ? AND created_at >= ?", eventType, dayAgo).
			Where("aggregate_id IN (?)", scope().Select("id"))
	}
	if err := runs(events.ModelQueued).Count(&m.Runs24h).Error; err != nil {
		httputil.InternalError(c, "Failed to load admin metrics")
		return
	}
	if err := runs(events.ModelFailed).Count(&m.Failed24h).Error; err != nil {
		httputil.InternalError(c, "Failed to load admin metrics")
		return
	}

	// last 30 days
	err := scope().
		Where("status IN ? AND calculation_started_at IS NOT NULL AND calculation_completed_at > calculation_started_at AND calculation_completed_at >= ?",
			[]string{"completed", "published"}, now.AddDate(0, 0, -30)).
		Select("AVG(EXTRACT(EPOCH FROM (calculation_completed_at - calculation_started_at)))").
		Scan(&m.AvgRunSeconds).Error
	if err != nil {
		httputil.InternalError(c, "Failed to load admin metrics")
		return
	}

	httputil.SuccessResponse(c, m)
}
