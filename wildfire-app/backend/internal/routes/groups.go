package routes

import (
	"context"

	"github.com/gin-gonic/gin"
	"platform.local/platform/logger"
	grouphandler "spatialhub_backend/internal/handler/group"
)

func registerGroupRoutes(api *gin.RouterGroup, handler *grouphandler.GroupHandler) {
	api.GET(routeGroups+"/my", handler.GetMyGroup)
	api.GET(routeGroups, handler.GetGroups)
	api.GET(routeGroupByID, handler.GetGroup)
	api.POST(routeGroups, handler.CreateGroup)
	api.PUT(routeGroupByID, handler.UpdateGroup)
	api.DELETE(routeGroupByID, handler.DeleteGroup)
	api.PUT(routeGroupByID+"/disable", handler.DisableGroup)
	api.PUT(routeGroupByID+"/enable", handler.EnableGroup)
	api.GET(routeGroupByID+routeMembers, handler.GetGroupMembers)
	api.POST(routeGroupByID+routeMembers, handler.AddMember)
	api.DELETE(routeGroupByID+routeMembers+"/:memberID", handler.RemoveMember)
}

func ensureDefaultGroupExists(handler *grouphandler.GroupHandler) {
	if err := handler.EnsureDefaultGroup(context.Background()); err != nil {
		logger.Logger.Warnf("Failed to ensure Default group exists: %v", err)
	}
}
