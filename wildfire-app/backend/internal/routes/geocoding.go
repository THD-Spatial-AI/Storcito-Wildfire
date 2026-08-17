package routes

import (
	"github.com/gin-gonic/gin"

	geocodinghandler "spatialhub_backend/internal/handler/geocoding"
)

func registerGeocodingRoutes(api *gin.RouterGroup, handler *geocodinghandler.Handler) {
	if handler == nil {
		return
	}

	geocodingRoutes := api.Group("/geocoding")
	geocodingRoutes.GET("/search", handler.Search)
	geocodingRoutes.GET("/reverse", handler.Reverse)
	geocodingRoutes.GET("/administrative-region", handler.GetAdministrativeRegion)
}
