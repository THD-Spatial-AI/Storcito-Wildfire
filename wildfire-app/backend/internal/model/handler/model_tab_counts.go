package model

import (
	"platform.local/common/pkg/httputil"
	"platform.local/common/pkg/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// statuses per tab
var tabStatuses = map[string][]string{
	"running":   {"queue", "calculating", "running", "processing"},
	"completed": {"completed", "published"},
	"drafts":    {"draft", "modified"},
	"failed":    {"failed", "cancelled"},
	// admin tabs
	"queue":          {"queue"},
	"in_progress":    {"calculating", "running", "processing"},
	"completed_only": {"completed"},
	"published":      {"published"},
}

// count per tab
func (h *ModelHandler) GetTabCounts(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	_, _, search, workspaceIDStr, _, _, fromDate, toDate := parseGetModelsParams(c)
	base, ok := h.buildQueryWithWorkspaceFilter(c, userCtx, workspaceIDStr, 1, 0)
	if !ok {
		return
	}
	base = applyOwnerTerritoryFilters(c, base)
	pinnedIDs := parsePinnedIDs(c)

	count := func(q *gorm.DB) (int64, error) {
		var n int64
		err := q.Model(&models.Model{}).Count(&n).Error
		return n, err
	}
	// families only
	families := func() *gorm.DB {
		q := base.Session(&gorm.Session{}).Where("parent_model_id IS NULL")
		return h.applyFamilyListFilters(q, search, fromDate, toDate, nil)
	}

	counts := map[string]int64{}
	var err error
	if counts["all"], err = count(families()); err != nil {
		httputil.InternalError(c, "Failed to count models")
		return
	}
	if len(pinnedIDs) > 0 {
		if counts["pinned"], err = count(families().Where(pinnedFamilyCondition(pinnedIDs))); err != nil {
			httputil.InternalError(c, "Failed to count models")
			return
		}
	} else {
		counts["pinned"] = 0
	}
	// split by status
	for tab, statuses := range tabStatuses {
		if counts[tab], err = count(families().Where("status IN ?", statuses)); err != nil {
			httputil.InternalError(c, "Failed to count models")
			return
		}
	}

	httputil.SuccessResponse(c, counts)
}
