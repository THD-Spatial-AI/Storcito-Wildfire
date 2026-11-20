package routes

import (
	"github.com/gin-gonic/gin"

	areashandler "spatialhub_backend/internal/handler/areas"
)

// area access routes
func registerAreaRoutes(api *gin.RouterGroup, handler *areashandler.Handler) {
	if handler == nil {
		return
	}
	api.GET("/areas/me", handler.Mine)
	api.GET("/areas/grants", handler.Overview)
	api.GET("/areas/users/:id", handler.GetUser)
	api.PUT("/areas/users/:id", handler.SetUser)
	api.GET("/areas/groups/:id", handler.GetGroup)
	api.PUT("/areas/groups/:id", handler.SetGroup)
	api.GET("/periods/me", handler.MyPeriods)
	api.GET("/periods/users/:id", handler.GetUserPeriods)
	api.PUT("/periods/users/:id", handler.SetUserPeriods)
	api.GET("/periods/groups/:id", handler.GetGroupPeriods)
	api.PUT("/periods/groups/:id", handler.SetGroupPeriods)
}
