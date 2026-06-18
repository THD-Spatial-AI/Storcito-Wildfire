package routes

import "github.com/gin-gonic/gin"

func registerAuthRoutes(api *gin.RouterGroup, handler gin.HandlerFunc) {
	api.POST("/login", handler)
	api.POST("/register", handler)
	api.POST("/logout", handler)
	api.GET("/callback-auth", handler)
	api.GET("/csrf-token", handler)
	api.POST("/auth/refresh", handler)
	api.POST("/auth/resend-verification", handler)
	api.POST("/auth/forgot-password", handler)
	api.POST("/auth/reset-password", handler)
	api.POST("/auth/change-password", handler)
	api.GET("/auth/tour-status", handler)
	api.POST("/auth/complete-tour", handler)
	api.POST("/auth/refresh-token", handler)
}
