package routes

import (
	"github.com/gin-gonic/gin"
	modelhandler "spatialhub_backend/internal/model/handler"
	resulthandler "spatialhub_backend/internal/result/handler"
	riskmetricshandler "spatialhub_backend/internal/risk_metrics/handler"
)

func registerModelRoutes(api *gin.RouterGroup, modelHandler *modelhandler.ModelHandler, resultHandler *resulthandler.ResultHandler, riskHandler *riskmetricshandler.Handler) {
	api.GET("/models/stats", modelHandler.GetModelStats)
	api.GET("/models", modelHandler.GetModels)
	api.POST("/models", modelHandler.CreateModel)
	api.PATCH("/models/bulk-move", modelHandler.BulkMoveModels)
	api.GET(routeModelByID, modelHandler.GetModel)
	api.PUT(routeModelByID, modelHandler.UpdateModel)
	api.DELETE(routeModelByID, modelHandler.DeleteModel)
	api.PUT(routeModelByID+"/activation", modelHandler.UpdateModelActivation)
	api.PATCH(routeModelByID+"/move", modelHandler.MoveModel)
	api.POST(routeModelByID+"/share", modelHandler.ShareModel)
	api.POST(routeModelByID+"/inputs", modelHandler.UploadModelInputs)
	api.GET(routeModelByID+"/results", resultHandler.GetModelResults)
	api.GET(routeModelByID+"/risk-metrics", riskHandler.Get)
	api.GET(routeModelByID+"/risk-map-samples", riskHandler.GetMapSamples)
	api.GET(routeModelByID+"/download", resultHandler.DownloadModelResult)
	api.POST("/calculation/start/:id", modelHandler.StartCalculation)
	api.GET("/results/:id/layer", resultHandler.GetResultLayer)
}
