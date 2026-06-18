package routes

import (
	"github.com/gin-gonic/gin"
	"spatialhub_backend/internal/handler/weather"
)

func registerWeatherRoutes(api *gin.RouterGroup, handler *weather.WeatherHandler) {
	weatherRoutes := api.Group("/weather")
	weatherRoutes.GET("", handler.GetWeather)
	weatherRoutes.GET("/current", handler.GetCurrentWeather)
}
