package services

import (
	"time"

	backendModels "spatialhub_backend/internal/models"
)

// NotificationStore captures the persistence operations the notifications handler uses.
type NotificationStore interface {
	CreateNotification(notif *backendModels.Notification) error
	GetNotificationByID(id uint) (*backendModels.Notification, error)
	CreateUserNotification(notif *backendModels.UserNotification) error
	GetUserNotifications(userID string, limit int, cutoff time.Time) ([]backendModels.UserNotification, error)
	MarkAsRead(id uint, userID string) (int64, error)
	MarkAllAsRead(userID string) (int64, error)
	ClearAllUserNotifications(userID string) (int64, error)
	GetAllUserIDs() ([]string, error)
}
