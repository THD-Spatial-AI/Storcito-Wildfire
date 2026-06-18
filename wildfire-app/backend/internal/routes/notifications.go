package routes

import (
	"github.com/gin-gonic/gin"
	notificationshandler "spatialhub_backend/internal/handler/notifications"
)

func registerNotificationRoutes(api *gin.RouterGroup, handler *notificationshandler.Handler) {
	api.POST("/notifications/send", handler.SendNotification)
	api.GET("/notifications", handler.GetUserNotifications)
	api.GET("/notifications/stream", handler.StreamNotifications)
	api.PATCH("/notifications/:id/read", handler.MarkAsRead)
	api.POST("/notifications/read-all", handler.MarkAllAsRead)
	api.DELETE("/notifications/clear-all", handler.ClearAllNotifications)
}
