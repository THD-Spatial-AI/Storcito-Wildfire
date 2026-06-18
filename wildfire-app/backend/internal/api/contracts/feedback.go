package contracts

import "time"

// FeedbackUpdate captures partial feedback updates.
type FeedbackUpdate struct {
	Status        *string    `json:"status,omitempty"`
	Priority      *string    `json:"priority,omitempty"`
	AdminResponse *string    `json:"admin_response,omitempty"`
	RespondedAt   *time.Time `json:"responded_at,omitempty"`
	RespondedBy   *string    `json:"responded_by,omitempty"`
	ImagePath     *string    `json:"image_path,omitempty"`
	ImageMimeType *string    `json:"image_mime_type,omitempty"`
	ImageSize     *int64     `json:"image_size,omitempty"`
	Images        *string    `json:"images,omitempty"`
}

// ToMap returns only fields that should be updated in the database.
func (u FeedbackUpdate) ToMap() map[string]interface{} {
	updates := make(map[string]interface{})
	if u.Status != nil && *u.Status != "" {
		updates["status"] = *u.Status
	}
	if u.Priority != nil && *u.Priority != "" {
		updates["priority"] = *u.Priority
	}
	if u.AdminResponse != nil {
		updates["admin_response"] = *u.AdminResponse
	}
	if u.RespondedAt != nil {
		updates["responded_at"] = *u.RespondedAt
	}
	if u.RespondedBy != nil {
		updates["responded_by"] = *u.RespondedBy
	}
	if u.ImagePath != nil {
		updates["image_path"] = *u.ImagePath
	}
	if u.ImageMimeType != nil {
		updates["image_mime_type"] = *u.ImageMimeType
	}
	if u.ImageSize != nil {
		updates["image_size"] = *u.ImageSize
	}
	if u.Images != nil {
		updates["images"] = *u.Images
	}
	return updates
}
