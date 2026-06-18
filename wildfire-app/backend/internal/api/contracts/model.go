package contracts

import (
	"encoding/json"

	"gorm.io/datatypes"
)

type CreateModelRequest struct {
	Title         string          `json:"title" binding:"required"`
	Description   *string         `json:"description"`
	WorkspaceID   *uint           `json:"workspace_id"`
	Coordinates   json.RawMessage `json:"coordinates"`
	Region        *string         `json:"region"`
	Country       *string         `json:"country"`
	FromDate      string          `json:"from_date" binding:"required"`
	ToDate        string          `json:"to_date" binding:"required"`
	Config        json.RawMessage `json:"config"`
	GroupID       *uint           `json:"group_id"`
	ParentModelID *uint           `json:"parent_model_id"`
	IsCopy        *bool           `json:"is_copy"`
	IsActive      *bool           `json:"is_active"`
}

type UpdateModelRequest struct {
	Title       *string         `json:"title"`
	Description *string         `json:"description"`
	Status      *string         `json:"status"`
	WorkspaceID *uint           `json:"workspace_id"`
	Coordinates json.RawMessage `json:"coordinates"`
	Region      *string         `json:"region"`
	Country     *string         `json:"country"`
	FromDate    *string         `json:"from_date"`
	ToDate      *string         `json:"to_date"`
	Config      json.RawMessage `json:"config"`
	Results     json.RawMessage `json:"results"`
	SessionID   *int64          `json:"session_id"`
	CallbackURL *string         `json:"callback_url"`
}

// ToMap returns only fields that should be updated in the database.
func (r UpdateModelRequest) ToMap() map[string]interface{} {
	updates := make(map[string]interface{})
	if r.Title != nil {
		updates["title"] = *r.Title
	}
	if r.Description != nil {
		updates["description"] = *r.Description
	}
	if r.Status != nil {
		updates["status"] = *r.Status
	}
	if r.Region != nil {
		updates["region"] = *r.Region
	}
	if r.Country != nil {
		updates["country"] = *r.Country
	}
	if r.CallbackURL != nil {
		updates["callback_url"] = *r.CallbackURL
	}
	if r.SessionID != nil {
		updates["session_id"] = *r.SessionID
	}
	if len(r.Coordinates) > 0 {
		updates["coordinates"] = datatypes.JSON(r.Coordinates)
	}
	if len(r.Config) > 0 {
		updates["config"] = datatypes.JSON(r.Config)
	}
	if len(r.Results) > 0 {
		updates["results"] = datatypes.JSON(r.Results)
	}
	return updates
}

type UpdateModelActivationRequest struct {
	IsActive bool `json:"is_active"`
}

// ToMap returns the activation update payload.
func (r UpdateModelActivationRequest) ToMap() map[string]interface{} {
	return map[string]interface{}{"is_active": r.IsActive}
}

type MoveModelRequest struct {
	WorkspaceID *uint `json:"workspace_id"`
}

type BulkMoveModelsRequest struct {
	ModelIDs    []uint `json:"model_ids" binding:"required"`
	WorkspaceID *uint  `json:"workspace_id"`
}

type ShareModelRequest struct {
	Email      string `json:"email" binding:"required,email"`
	Permission string `json:"permission"`
}

type ModelStatsResponse struct {
	Total       int64 `json:"total"`
	Draft       int64 `json:"draft"`
	Queue       int64 `json:"queue"`
	Running     int64 `json:"running"`
	Completed   int64 `json:"completed"`
	Published   int64 `json:"published"`
	Failed      int64 `json:"failed"`
	Cancelled   int64 `json:"cancelled"`
	ModelLimit  int   `json:"model_limit"`
	Remaining   int   `json:"remaining"`
	IsUnlimited bool  `json:"is_unlimited"`
}

type BulkMoveModelsResponse struct {
	SuccessCount int `json:"success_count"`
	FailedCount  int `json:"failed_count"`
	Total        int `json:"total"`
}
