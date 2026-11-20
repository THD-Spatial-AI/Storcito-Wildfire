package areas

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	"platform.local/platform/logger"

	"spatialhub_backend/internal/areas"
	"spatialhub_backend/internal/services"
)

type Handler struct {
	svc   *areas.Service
	authz services.AuthorizationService
}

func NewHandler(svc *areas.Service, authz services.AuthorizationService) *Handler {
	return &Handler{svc: svc, authz: authz}
}

type setRequest struct {
	Areas []areas.Ref `json:"areas"`
}

func isManagerOrExpert(level string) bool {
	return level == constants.AccessLevelExpert || level == constants.AccessLevelManager
}

// own area summary
func (h *Handler) Mine(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	if user.AccessLevel == constants.AccessLevelExpert {
		httputil.SuccessResponse(c, areas.UserAreas{Direct: []areas.Ref{}, Groups: []areas.GroupAreas{}, Effective: []areas.Ref{}})
		return
	}
	h.respondUser(c, user.UserID)
}

// all grants overview
func (h *Handler) Overview(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	if !isManagerOrExpert(user.AccessLevel) {
		httputil.Forbidden(c, "Managers and experts only")
		return
	}
	users, err := h.svc.Grants(areas.SubjectUser)
	if err != nil {
		httputil.InternalError(c, "Failed to load area access")
		return
	}
	groups, err := h.svc.Grants(areas.SubjectGroup)
	if err != nil {
		httputil.InternalError(c, "Failed to load area access")
		return
	}
	userPeriods, err := h.svc.PeriodGrants(areas.SubjectUser)
	if err != nil {
		httputil.InternalError(c, "Failed to load period access")
		return
	}
	groupPeriods, err := h.svc.PeriodGrants(areas.SubjectGroup)
	if err != nil {
		httputil.InternalError(c, "Failed to load period access")
		return
	}
	httputil.SuccessResponse(c, gin.H{"users": users, "groups": groups, "user_periods": userPeriods, "group_periods": groupPeriods})
}

func (h *Handler) GetUser(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	id := c.Param("id")
	if id != user.UserID && h.authz.CanManageUser(c.Request.Context(), user, id) != nil {
		httputil.Forbidden(c, "You can only view areas of users in your groups")
		return
	}
	h.respondUser(c, id)
}

func (h *Handler) SetUser(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	id := c.Param("id")
	if !isManagerOrExpert(user.AccessLevel) || h.authz.CanManageUser(c.Request.Context(), user, id) != nil {
		httputil.Forbidden(c, "You can only set areas for users in your groups")
		return
	}
	// managers cannot widen
	if id == user.UserID && user.AccessLevel != constants.AccessLevelExpert {
		httputil.Forbidden(c, "Ask an expert to change your own areas")
		return
	}
	h.set(c, user, areas.SubjectUser, id)
}

func (h *Handler) GetGroup(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	id := c.Param("id")
	if !isManagerOrExpert(user.AccessLevel) || h.authz.CanManageGroup(c.Request.Context(), user, id) != nil {
		httputil.Forbidden(c, "You can only view areas of your groups")
		return
	}
	refs, err := h.svc.GroupGrants(id)
	if err != nil {
		httputil.InternalError(c, "Failed to load group areas")
		return
	}
	httputil.SuccessResponse(c, gin.H{"areas": refs})
}

func (h *Handler) SetGroup(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	id := c.Param("id")
	if !isManagerOrExpert(user.AccessLevel) || h.authz.CanManageGroup(c.Request.Context(), user, id) != nil {
		httputil.Forbidden(c, "You can only set areas for your groups")
		return
	}
	// own group fixed
	if user.AccessLevel != constants.AccessLevelExpert {
		own, err := h.svc.ForUser(c.Request.Context(), user.UserID)
		if err != nil {
			httputil.ErrorResponse(c, http.StatusServiceUnavailable, "Area data is unavailable right now")
			return
		}
		for _, g := range own.Groups {
			if g.GroupID == id {
				httputil.Forbidden(c, "Ask an expert to change the areas of your own group")
				return
			}
		}
	}
	h.set(c, user, areas.SubjectGroup, id)
}

func (h *Handler) set(c *gin.Context, user *httputil.UserContext, subjectType, id string) {
	var req setRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "Invalid request data")
		return
	}
	err := h.svc.Set(c.Request.Context(), user.UserID, user.AccessLevel, subjectType, id, req.Areas)
	h.respondSet(c, subjectType, id, err, gin.H{"areas": req.Areas})
}

// shared save result
func (h *Handler) respondSet(c *gin.Context, subjectType, id string, err error, ok gin.H) {
	switch {
	case err == nil:
		httputil.SuccessResponse(c, ok)
	case errors.Is(err, areas.ErrNotInScope):
		httputil.Forbidden(c, "You can only give access inside your own areas and periods")
	case errors.Is(err, areas.ErrAreaUnavailable):
		httputil.ErrorResponse(c, http.StatusServiceUnavailable, "Area data is unavailable right now")
	default:
		logger.ForComponent("areas").Warnf("set areas failed subject=%s:%s err=%v", subjectType, id, err)
		httputil.BadRequest(c, err.Error())
	}
}

func (h *Handler) respondUser(c *gin.Context, id string) {
	ua, err := h.svc.ForUser(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, areas.ErrAreaUnavailable) {
			httputil.ErrorResponse(c, http.StatusServiceUnavailable, "Area data is unavailable right now")
			return
		}
		httputil.InternalError(c, "Failed to load areas")
		return
	}
	httputil.SuccessResponse(c, ua)
}

// responds model check
func RespondCheckError(c *gin.Context, err error) {
	if errors.Is(err, areas.ErrOutsideArea) {
		httputil.Forbidden(c, "This area is outside the areas you have access to")
		return
	}
	logger.ForComponent("areas").Warnf("area check failed err=%v", err)
	httputil.ErrorResponse(c, http.StatusServiceUnavailable, "Could not check your area access right now. Try again shortly.")
}

type setPeriodsRequest struct {
	Periods []areas.Period `json:"periods"`
}

// own period summary
func (h *Handler) MyPeriods(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	if user.AccessLevel == constants.AccessLevelExpert {
		httputil.SuccessResponse(c, areas.UserPeriods{Direct: []areas.Period{}, Groups: []areas.GroupPeriods{}, Effective: []areas.Period{}})
		return
	}
	h.respondUserPeriods(c, user.UserID)
}

func (h *Handler) GetUserPeriods(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	id := c.Param("id")
	if id != user.UserID && h.authz.CanManageUser(c.Request.Context(), user, id) != nil {
		httputil.Forbidden(c, "You can only view periods of users in your groups")
		return
	}
	h.respondUserPeriods(c, id)
}

func (h *Handler) SetUserPeriods(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	id := c.Param("id")
	if !isManagerOrExpert(user.AccessLevel) || h.authz.CanManageUser(c.Request.Context(), user, id) != nil {
		httputil.Forbidden(c, "You can only set periods for users in your groups")
		return
	}
	if id == user.UserID && user.AccessLevel != constants.AccessLevelExpert {
		httputil.Forbidden(c, "Ask an expert to change your own periods")
		return
	}
	h.setPeriods(c, user, areas.SubjectUser, id)
}

func (h *Handler) GetGroupPeriods(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	id := c.Param("id")
	if !isManagerOrExpert(user.AccessLevel) || h.authz.CanManageGroup(c.Request.Context(), user, id) != nil {
		httputil.Forbidden(c, "You can only view periods of your groups")
		return
	}
	periods, err := h.svc.GroupPeriodGrants(id)
	if err != nil {
		httputil.InternalError(c, "Failed to load group periods")
		return
	}
	httputil.SuccessResponse(c, gin.H{"periods": periods})
}

func (h *Handler) SetGroupPeriods(c *gin.Context) {
	user, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}
	id := c.Param("id")
	if !isManagerOrExpert(user.AccessLevel) || h.authz.CanManageGroup(c.Request.Context(), user, id) != nil {
		httputil.Forbidden(c, "You can only set periods for your groups")
		return
	}
	// own group fixed
	if user.AccessLevel != constants.AccessLevelExpert {
		own, err := h.svc.PeriodsForUser(c.Request.Context(), user.UserID)
		if err != nil {
			httputil.ErrorResponse(c, http.StatusServiceUnavailable, "Access data is unavailable right now")
			return
		}
		for _, g := range own.Groups {
			if g.GroupID == id {
				httputil.Forbidden(c, "Ask an expert to change the periods of your own group")
				return
			}
		}
	}
	h.setPeriods(c, user, areas.SubjectGroup, id)
}

func (h *Handler) setPeriods(c *gin.Context, user *httputil.UserContext, subjectType, id string) {
	var req setPeriodsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "Invalid request data")
		return
	}
	err := h.svc.SetPeriods(c.Request.Context(), user.UserID, user.AccessLevel, subjectType, id, req.Periods)
	h.respondSet(c, subjectType, id, err, gin.H{"periods": req.Periods})
}

func (h *Handler) respondUserPeriods(c *gin.Context, id string) {
	up, err := h.svc.PeriodsForUser(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, areas.ErrAreaUnavailable) {
			httputil.ErrorResponse(c, http.StatusServiceUnavailable, "Access data is unavailable right now")
			return
		}
		httputil.InternalError(c, "Failed to load periods")
		return
	}
	httputil.SuccessResponse(c, up)
}

// responds period check
func RespondPeriodError(c *gin.Context, err error) {
	if errors.Is(err, areas.ErrOutsidePeriod) {
		httputil.Forbidden(c, "These dates are outside the periods you have access to")
		return
	}
	logger.ForComponent("areas").Warnf("period check failed err=%v", err)
	httputil.ErrorResponse(c, http.StatusServiceUnavailable, "Could not check your date access right now. Try again shortly.")
}
