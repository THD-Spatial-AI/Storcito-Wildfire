package routes

import (
	"github.com/gin-gonic/gin"
	workspacehandler "spatialhub_backend/internal/workspace/handler"
)

func registerWorkspaceRoutes(api *gin.RouterGroup, handler *workspacehandler.WorkspaceHandler) {
	api.GET("/workspaces", handler.GetUserWorkspaces)
	api.GET("/workspaces/default", handler.CreateOrGetDefaultWorkspace)
	api.GET("/workspaces/preferred", handler.GetPreferredWorkspace)
	api.PUT("/workspaces/preferred", handler.SetPreferredWorkspace)
	api.GET(routeWorkspaceByID, handler.GetWorkspace)
	api.POST("/workspaces", handler.CreateWorkspace)
	api.POST(routeWorkspaceByID+"/copy", handler.CopyWorkspace)
	api.PUT(routeWorkspaceByID, handler.UpdateWorkspace)
	api.DELETE(routeWorkspaceByID, handler.DeleteWorkspace)
	api.POST(routeWorkspaceByID+routeMembers, handler.AddMember)
	api.DELETE(routeWorkspaceByID+routeMembers+"/:memberID", handler.RemoveMember)
	api.POST(routeWorkspaceByID+routeGroups, handler.AddGroup)
	api.DELETE(routeWorkspaceByID+routeGroups+"/:groupID", handler.RemoveGroup)
}
