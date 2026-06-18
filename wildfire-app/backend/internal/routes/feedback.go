package routes

import (
	"github.com/gin-gonic/gin"
	feedback "spatialhub_backend/internal/handler/feedback"
)

func registerFeedbackRoutes(api *gin.RouterGroup, handler *feedback.FeedbackHandler) {
	api.POST("/feedback", handler.CreateFeedback)
	api.GET("/feedback", handler.GetFeedbackList)
	api.GET("/feedback/my", handler.GetMyFeedback)
	api.GET("/feedback/stats", handler.GetFeedbackStats)
	api.GET("/feedback/user/:user_id", handler.GetUserFeedback)
	api.GET(routeFeedbackByID+"/image", handler.GetFeedbackImage)
	api.GET(routeFeedbackByID+"/images/:index", handler.GetFeedbackImageByIndex)
	api.GET(routeFeedbackByID, handler.GetFeedbackByID)
	api.PUT(routeFeedbackByID, handler.UpdateFeedback)
	api.DELETE(routeFeedbackByID, handler.DeleteFeedback)
}
