package routes

import (
	"github.com/gin-gonic/gin"
	settingshandler "spatialhub_backend/internal/handler/settings"
)

func registerSettingsRoutes(api *gin.RouterGroup, handler *settingshandler.SettingsHandler) {
	api.GET(routeSettings, handler.GetUserSettings)
	api.PATCH(routeSettings, handler.UpdateSettings)
	api.PUT(routeSettings+"/privacy-accepted", handler.UpdatePrivacyAccepted)
	api.PUT(routeSettings+"/product-tour-completed", handler.UpdateProductTourCompleted)
	api.PUT(routeSettings+"/map-location", handler.UpdateMapLocation)
	api.PUT(routeSettings+"/weather-location", handler.UpdateWeatherLocation)
	api.PUT(routeSettings+"/theme", handler.UpdateTheme)
	api.PUT(routeSettings+"/language", handler.UpdateLanguage)
	api.DELETE(routeSettings, handler.DeleteAllSettings)
	api.GET(routeSettings+"/polygon-limits", handler.GetPolygonLimits)
	api.GET(routeSettings+"/polygon-limits/me", handler.GetMyPolygonLimit)
	api.PUT(routeSettings+"/polygon-limits", handler.UpdatePolygonLimits)
	api.PUT(routeSettings+"/polygon-limit", handler.UpdatePolygonLimit)
	api.GET(routeSettings+"/model-limits", handler.GetModelLimits)
	api.GET(routeSettings+"/model-limits/me", handler.GetMyModelLimit)
	api.PUT(routeSettings+"/model-limits", handler.UpdateModelLimits)
	api.PUT(routeSettings+"/model-limit", handler.UpdateModelLimit)
}
