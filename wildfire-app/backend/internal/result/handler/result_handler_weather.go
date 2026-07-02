package result

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"

	"platform.local/common/pkg/httputil"
	commonModels "platform.local/common/pkg/models"
	"platform.local/platform/logger"
)

const fwiAreaSummaryPath = "/api/webservices/fwi-area"

func (h *ResultHandler) GetModelFireWeather(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	modelID := c.Param("id")
	model, ok := h.fetchModelByID(c, modelID)
	if !ok {
		return
	}
	if !h.userHasModelAccess(c, model, userCtx) {
		return
	}

	requestedDate := strings.TrimSpace(c.Query("date"))
	if requestedDate != "" {
		if _, err := time.Parse("2006-01-02", requestedDate); err != nil {
			httputil.BadRequest(c, "date must be YYYY-MM-DD")
			return
		}
	}

	results, err := h.fetchResults(c, modelID)
	if err != nil {
		return
	}
	if len(results) == 0 {
		c.JSON(http.StatusOK, gin.H{"data": nil, "ready": false})
		return
	}

	latestResult := results[0]
	if requestedDate == "" {
		if summary, ok := weatherSummaryFromMetadata(latestResult.Metadata); ok {
			c.JSON(http.StatusOK, gin.H{
				"data":  gin.H{"weather_summary": summary, "source": "result_metadata"},
				"ready": true,
			})
			return
		}
	}

	if !modelFireWeatherEnabled(model.Config) {
		c.JSON(http.StatusOK, gin.H{
			"data":   nil,
			"ready":  false,
			"reason": "fire weather was disabled for this model",
		})
		return
	}
	if modelUsesStationWeather(model.Config) {
		c.JSON(http.StatusOK, gin.H{
			"data":   nil,
			"ready":  false,
			"reason": "this model used uploaded station weather data",
		})
		return
	}

	payload, ok := modelFWIAreaPayload(c, model, requestedDate)
	if !ok {
		return
	}
	summary, err := h.fetchFWIAreaSummary(c.Request.Context(), payload)
	if err != nil {
		logger.ForComponent("result").Warnf("failed to fetch model fire weather model_id=%d err=%v", model.ID, err)
		httputil.BadGateway(c, "Failed to fetch model fire weather")
		return
	}

	annotateModelWeatherSummary(summary, model)
	source := "database_fallback"
	if requestedDate != "" {
		source = "database_daily"
	} else {
		h.persistWeatherSummary(latestResult.ID, latestResult.Metadata, summary)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  gin.H{"weather_summary": summary, "source": source},
		"ready": true,
	})
}

func weatherSummaryFromMetadata(raw datatypes.JSON) (map[string]interface{}, bool) {
	if len(raw) == 0 || strings.TrimSpace(string(raw)) == "" || strings.TrimSpace(string(raw)) == "null" {
		return nil, false
	}

	var metadata map[string]json.RawMessage
	if err := json.Unmarshal(raw, &metadata); err != nil {
		return nil, false
	}

	rawSummary, ok := metadata["weather_summary"]
	if !ok || len(rawSummary) == 0 || strings.TrimSpace(string(rawSummary)) == "null" {
		return nil, false
	}

	var summary map[string]interface{}
	if err := json.Unmarshal(rawSummary, &summary); err != nil || len(summary) == 0 {
		return nil, false
	}
	return summary, true
}

func modelFWIAreaPayload(c *gin.Context, model *commonModels.Model, dateOverride string) (map[string]interface{}, bool) {
	if len(model.Coordinates) == 0 || strings.TrimSpace(string(model.Coordinates)) == "" || strings.TrimSpace(string(model.Coordinates)) == "null" {
		httputil.BadRequest(c, "Model has no coordinates")
		return nil, false
	}

	var aoi interface{}
	if err := json.Unmarshal(model.Coordinates, &aoi); err != nil {
		httputil.BadRequest(c, "Model coordinates are invalid")
		return nil, false
	}

	summaryDate := model.ToDate.Format("2006-01-02")
	if dateOverride != "" {
		summaryDate = dateOverride
	}

	return map[string]interface{}{
		"date":       summaryDate,
		"aoi":        aoi,
		"hour_index": 15,
	}, true
}

func (h *ResultHandler) fetchFWIAreaSummary(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	if h.wsClient == nil {
		return nil, fmt.Errorf("webservice client is not configured")
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	headers := make(http.Header)
	headers.Set("Content-Type", "application/json")
	headers.Set("Accept", "application/json")

	resp, err := h.wsClient.Forward(ctx, http.MethodPost, fwiAreaSummaryPath, body, headers)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 4*1024*1024))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("webservice response status=%d body=%s", resp.StatusCode, string(respBody))
	}

	var envelope struct {
		Success bool                   `json:"success"`
		Data    map[string]interface{} `json:"data"`
		Error   string                 `json:"error"`
	}
	if err := json.Unmarshal(respBody, &envelope); err != nil {
		return nil, fmt.Errorf("invalid webservice response: %w", err)
	}
	if !envelope.Success || envelope.Data == nil {
		if envelope.Error != "" {
			return nil, fmt.Errorf("webservice error: %s", envelope.Error)
		}
		return nil, fmt.Errorf("webservice returned no fire weather data")
	}
	return envelope.Data, nil
}

func annotateModelWeatherSummary(summary map[string]interface{}, model *commonModels.Model) {
	modelID := strconv.FormatUint(uint64(model.ID), 10)
	summary["summary_type"] = "model_fire_weather"
	summary["model_id"] = modelID
	summary["source_model_id"] = modelID
	summary["fwi_end_date"] = model.ToDate.Format("2006-01-02")
	summary["included_in_risk"] = true
	if mode := modelCalculationMode(model.Config); mode != "" {
		summary["calculation_mode"] = mode
	}
}

func (h *ResultHandler) persistWeatherSummary(resultID uint, raw datatypes.JSON, summary map[string]interface{}) {
	metadata := map[string]interface{}{}
	if len(raw) > 0 && strings.TrimSpace(string(raw)) != "" && strings.TrimSpace(string(raw)) != "null" {
		_ = json.Unmarshal(raw, &metadata)
	}
	metadata["weather_summary"] = summary

	encoded, err := json.Marshal(metadata)
	if err != nil {
		logger.ForComponent("result").Warnf("failed to encode weather metadata result_id=%d err=%v", resultID, err)
		return
	}
	if err := h.store.DB().
		Model(&commonModels.ModelResult{}).
		Where("id = ?", resultID).
		Update("metadata", datatypes.JSON(encoded)).Error; err != nil {
		logger.ForComponent("result").Warnf("failed to persist weather metadata result_id=%d err=%v", resultID, err)
	}
}

func modelFireWeatherEnabled(raw datatypes.JSON) bool {
	cfg := decodeModelConfig(raw)
	params := asObject(cfg["parameters"])
	optionalLayers := asObject(params["optional_layers"])
	if optionalLayers == nil {
		return true
	}
	enabled, ok := optionalLayers["weather_overlay"].(bool)
	return ok && enabled
}

func modelUsesStationWeather(raw datatypes.JSON) bool {
	cfg := decodeModelConfig(raw)
	if hasNonEmptyStringValue(asObject(cfg["user_inputs"]), "station_data") {
		return true
	}

	params := asObject(cfg["parameters"])
	return hasNonEmptyStringValue(asObject(params["user_inputs"]), "station_data")
}

func modelCalculationMode(raw datatypes.JSON) string {
	cfg := decodeModelConfig(raw)
	params := asObject(cfg["parameters"])
	if mode, ok := params["calculation_mode"].(string); ok {
		return strings.TrimSpace(mode)
	}
	return ""
}

func decodeModelConfig(raw datatypes.JSON) map[string]interface{} {
	if len(raw) == 0 || strings.TrimSpace(string(raw)) == "" || strings.TrimSpace(string(raw)) == "null" {
		return map[string]interface{}{}
	}

	var cfg map[string]interface{}
	if err := json.Unmarshal(raw, &cfg); err != nil || cfg == nil {
		return map[string]interface{}{}
	}
	return cfg
}

func asObject(value interface{}) map[string]interface{} {
	if obj, ok := value.(map[string]interface{}); ok {
		return obj
	}
	return nil
}

func hasNonEmptyStringValue(obj map[string]interface{}, key string) bool {
	value, ok := obj[key]
	if !ok || value == nil {
		return false
	}
	if s, ok := value.(string); ok {
		return strings.TrimSpace(s) != ""
	}
	return true
}
