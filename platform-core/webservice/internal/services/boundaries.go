package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"platform.local/common/pkg/models"
)

// keeps engine status
type BoundaryUpstreamError struct {
	Status  int
	Message string
}

func (e *BoundaryUpstreamError) Error() string {
	return fmt.Sprintf("boundary request failed with status %d: %s", e.Status, e.Message)
}

// engine boundary proxy
func (s *WebserviceService) GetBoundaries(ctx context.Context, subPath string, query url.Values) (map[string]interface{}, error) {
	var instance models.WebserviceInstance
	if err := s.db.
		Where("status = ?", models.StatusActive).
		Order("available DESC, current_concurrency ASC, id ASC").
		First(&instance).Error; err != nil {
		return nil, err
	}

	endpoint := "/boundaries" + subPath
	if encoded := query.Encode(); encoded != "" {
		endpoint += "?" + encoded
	}
	status, _, respBytes, err := s.doJSON(ctx, http.MethodGet, buildURL(&instance, endpoint), nil)
	if err != nil {
		return nil, err
	}
	if status < 200 || status >= 300 {
		var detail struct {
			Detail string `json:"detail"`
		}
		_ = json.Unmarshal(respBytes, &detail)
		if detail.Detail == "" {
			detail.Detail = http.StatusText(status)
		}
		return nil, &BoundaryUpstreamError{Status: status, Message: detail.Detail}
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return nil, fmt.Errorf("invalid boundaries response: %w", err)
	}
	return result, nil
}
