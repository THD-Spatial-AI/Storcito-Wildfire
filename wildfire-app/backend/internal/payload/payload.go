package payload

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
	_ "time/tzdata"

	"platform.local/common/pkg/models"
)

// CalculationPayload defines the generic structure for a calculation request.
type CalculationPayload struct {
	UserID         string                 `json:"user_id"`
	ModelID        string                 `json:"model_id"`
	SessionID      string                 `json:"session_id"`
	Country        *string                `json:"country,omitempty"`
	Lkr            *string                `json:"lkr,omitempty"`
	CallbackURL    string                 `json:"callback_url"`
	StartDate      string                 `json:"start_date"`
	EndDate        string                 `json:"end_date"`
	BufferDistance *int                   `json:"buffer_distance,omitempty"`
	Coordinates    interface{}            `json:"coordinates,omitempty"`
	Topology       []interface{}          `json:"topology,omitempty"`
	Parameters     map[string]interface{} `json:"parameters,omitempty"`
}

// BuildCalculationPayload constructs the generic calculation payload dispatched to the webservice.
func BuildCalculationPayload(model *models.Model) interface{} {
	runTimestamp := time.Now().Unix()
	sessionID := getSessionID(model.ID, runTimestamp)
	uniqueModelID := fmt.Sprintf("%d_%d", model.ID, runTimestamp)

	payload := CalculationPayload{
		UserID:      model.UserID,
		ModelID:     uniqueModelID,
		SessionID:   fmt.Sprintf("%d", sessionID),
		CallbackURL: buildCallbackURL(model.ID),
		StartDate:   formatBerlinWindowBoundary(model.FromDate, 16),
		EndDate:     formatBerlinWindowBoundary(model.ToDate, 17),
		Country:     model.Country,
		Lkr:         model.Region,
		Parameters:  map[string]interface{}{},
	}

	var configMap map[string]interface{}
	if len(model.Config) > 0 && json.Unmarshal(model.Config, &configMap) == nil && configMap != nil {
		if topo, ok := configMap["topology"].([]interface{}); ok {
			payload.Topology = topo
		}
		if params, ok := configMap["parameters"].(map[string]interface{}); ok {
			payload.Parameters = params
		}
		if bd, ok := extractBufferDistance(configMap["buffer_distance"]); ok {
			payload.BufferDistance = &bd
		}
	}

	if payload.BufferDistance == nil && model.BufferDistance != nil {
		bd := *model.BufferDistance
		payload.BufferDistance = &bd
	}

	if len(model.Coordinates) > 0 && string(model.Coordinates) != "null" {
		var coords interface{}
		if err := json.Unmarshal(model.Coordinates, &coords); err == nil {
			payload.Coordinates = coords

			if len(payload.Topology) == 0 {
				payload.Topology = []interface{}{
					map[string]interface{}{"geometry": coords},
				}
			}
		}
	}

	return payload
}

func extractBufferDistance(v interface{}) (int, bool) {
	switch n := v.(type) {
	case float64:
		return int(n), true
	case int:
		return n, true
	case json.Number:
		if i, err := n.Int64(); err == nil {
			return int(i), true
		}
	}
	return 0, false
}

func buildCallbackURL(modelID uint) string {
	callbackBaseURL := os.Getenv("CALLBACK_URL")
	if callbackBaseURL == "" {
		callbackBaseURL = os.Getenv("APP_URL")
		if callbackBaseURL != "" {
			callbackBaseURL = strings.Replace(callbackBaseURL, "https://", "http://", 1)
		}
	}
	if callbackBaseURL == "" {
		callbackBaseURL = "http://backend:8000"
	}
	url := fmt.Sprintf("%s/api/v1/calculation/callback/%d", callbackBaseURL, modelID)

	if secret := os.Getenv("CALLBACK_SECRET"); secret != "" {
		url = fmt.Sprintf("%s?secret=%s", url, secret)
	}
	return url
}

func getSessionID(modelID uint, runTimestamp int64) int64 {
	return int64(modelID)*1000000000 + runTimestamp%1000000000
}

func formatBerlinWindowBoundary(day time.Time, hour int) string {
	location, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		location = time.FixedZone("Europe/Berlin", 0)
	}
	local := time.Date(day.Year(), day.Month(), day.Day(), hour, 0, 0, 0, location)
	return local.Format("2006-01-02T15:04:05.000Z07:00")
}
