package routes

import (
	"github.com/gin-gonic/gin"
	usershandler "spatialhub_backend/internal/handler/users"
)

func registerProfileRoutes(api *gin.RouterGroup, handler *usershandler.Handler) {
	api.GET("/users/profile", handler.GetProfile)
	api.PUT("/users/profile", handler.UpdateProfile)
}

func registerUserManagementRoutes(api *gin.RouterGroup, handler *usershandler.Handler) {
	api.GET("/users", handler.ListUsers)
	api.GET("/users/count", handler.CountUsers)
	api.POST("/users", handler.CreateUser)
	api.GET(routeUsersByID, handler.GetUser)
	api.PUT(routeUsersByID, handler.UpdateUser)
	api.PUT(routeUsersByID+"/verify-email", handler.VerifyEmail)
	api.DELETE(routeUsersByID, handler.DeleteUser)
	api.PUT(routeUsersByID+"/disable", handler.DisableUser)
	api.PUT(routeUsersByID+"/enable", handler.EnableUser)
	api.POST("/users/bulk-delete", handler.BulkDeleteUsers)

	// Personal access tokens, managed by experts for each user.
	api.POST(routeUsersByID+"/tokens", handler.CreateUserToken)
	api.GET(routeUsersByID+"/tokens", handler.ListUserTokens)
	api.DELETE(routeUsersByID+"/tokens/:tokenId", handler.RevokeUserToken)
}
