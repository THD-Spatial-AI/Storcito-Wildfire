package routes

import (
	"github.com/gin-gonic/gin"

	emergencyhandler "spatialhub_backend/internal/emergency/handler"
)

func registerEmergencyRoutes(api *gin.RouterGroup, handler *emergencyhandler.Handler) {
	if handler == nil {
		return
	}

	api.GET(routeModelByID+"/emergency-services/nearest", handler.GetNearest)
}
