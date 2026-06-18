package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"platform.local/platform/email"
	"platform.local/platform/keycloak"
	"platform.local/platform/logger"
	backendModels "spatialhub_backend/internal/models"
	notificationStore "spatialhub_backend/internal/store/notification"
)

type NotificationService struct {
	store        *notificationStore.Store
	emailService *email.EmailService
	redisClient  *goredis.Client
	kc           *keycloak.Client
	log          *logrus.Entry
}

func NewNotificationService(db *gorm.DB, emailService *email.EmailService, redisClient *goredis.Client, kc *keycloak.Client) *NotificationService {
	return &NotificationService{
		store:        notificationStore.NewStore(db),
		emailService: emailService,
		redisClient:  redisClient,
		kc:           kc,
		log:          logger.ForComponent("notification"),
	}
}


func (s *NotificationService) SendModelCompletionNotification(ctx context.Context, userID, userEmail, modelTitle string, modelID uint, status string) error {
	// Get user settings
	settings, err := s.store.GetUserSettings(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Default to enabled if no settings found
			settings = &notificationStore.UserSettings{
				EmailNotifications:   true,
				BrowserNotifications: true,
			}
		} else {
			s.log.Errorf("Failed to get user settings user_id=%s err=%v", userID, err)
			return err
		}
	}

	// Get user name from email (simple extraction)
	userName := "User"
	if userEmail != "" {
		parts := strings.Split(userEmail, "@")
		if len(parts) > 0 {
			userName = parts[0]
		}
	}

	// Send email notification
	if settings.EmailNotifications && userEmail != "" {
		go func() {
			if err := s.emailService.SendModelCompletionEmail(userEmail, userName, modelTitle, status); err != nil {
				s.log.Warnf("Email send failed: to=%s err=%v", userEmail, err)
			}
		}()
	}

	// Send browser notification
	if settings.BrowserNotifications {
		if err := s.createBrowserNotification(ctx, userID, modelTitle, modelID, status); err != nil {
			s.log.Errorf("Browser notification creation failed: user_id=%s err=%v", userID, err)
			return err
		}
	}

	return nil
}

// SendModelSharedNotification notifies a recipient that a model has been
// shared with them, via email and (when the recipient is a registered user)
// the in-app notification bar. recipientUserID may be empty when the model is
// shared with an email that does not yet belong to a registered user — in that
// case only the email is sent.
func (s *NotificationService) SendModelSharedNotification(ctx context.Context, recipientUserID, recipientEmail, modelTitle, sharedByName, permission string) error {
	// Resolve recipient notification settings. Default to enabled when the
	// recipient has no settings row yet (or is not a registered user).
	settings := &notificationStore.UserSettings{EmailNotifications: true, BrowserNotifications: true}
	if recipientUserID != "" {
		if found, err := s.store.GetUserSettings(recipientUserID); err == nil {
			settings = found
		} else if err != gorm.ErrRecordNotFound {
			s.log.Warnf("Failed to get recipient settings, defaulting to enabled: user_id=%s err=%v", recipientUserID, err)
		}
	}

	recipientName := "there"
	if recipientEmail != "" {
		if parts := strings.Split(recipientEmail, "@"); len(parts) > 0 && parts[0] != "" {
			recipientName = parts[0]
		}
	}

	// Send email notification.
	if settings.EmailNotifications && recipientEmail != "" {
		go func() {
			if err := s.emailService.SendModelSharedEmail(recipientEmail, recipientName, modelTitle, sharedByName, permission); err != nil {
				s.log.Warnf("Share email send failed: to=%s err=%v", recipientEmail, err)
			}
		}()
	}

	// Send in-app/browser notification (only possible for registered users).
	if settings.BrowserNotifications && recipientUserID != "" {
		userNotif := backendModels.UserNotification{
			UserID:  recipientUserID,
			Title:   "A model was shared with you",
			Message: fmt.Sprintf("%s shared the model '%s' with you (%s access).", sharedByName, modelTitle, permission),
			Type:    "info",
			Read:    false,
		}

		if err := s.store.CreateUserNotification(&userNotif); err != nil {
			s.log.Errorf("Failed to create share notification: user_id=%s err=%v", recipientUserID, err)
			return fmt.Errorf("failed to create share notification: %w", err)
		}

		if s.redisClient != nil {
			s.publishRealtimeNotification(ctx, recipientUserID, userNotif)
		}
	}

	return nil
}

func (s *NotificationService) createBrowserNotification(ctx context.Context, userID, modelTitle string, modelID uint, status string) error {
	var title, message, notifType string

	if status == "completed" {
		title = "Model Calculation Complete"
		message = fmt.Sprintf("Your model '%s' has been successfully calculated and is ready to view.", modelTitle)
		notifType = "success"
	} else {
		title = "Model Calculation Failed"
		message = fmt.Sprintf("The calculation for model '%s' has failed. Please check the model configuration and try again.", modelTitle)
		notifType = "error"
	}

	userNotif := backendModels.UserNotification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Type:    notifType,
		Read:    false,
	}

	if err := s.store.CreateUserNotification(&userNotif); err != nil {
		s.log.Errorf("Failed to insert UserNotification into DB: user_id=%s err=%v", userID, err)
		return fmt.Errorf("failed to create user notification: %w", err)
	}

	// Publish real-time event to Redis if available
	if s.redisClient != nil {
		s.publishRealtimeNotification(ctx, userID, userNotif)
	}

	return nil
}

func (s *NotificationService) publishRealtimeNotification(ctx context.Context, userID string, notif backendModels.UserNotification) {
	channel := fmt.Sprintf("user_notifications:%s", userID)

	// Use consistent timestamp format with Z suffix for UTC
	// Treat the time value's components as UTC since DB stores UTC without timezone
	const timestampFormat = "2006-01-02T15:04:05Z"
	t := notif.CreatedAt
	utcTime := time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), t.Nanosecond(), time.UTC)
	
	payload, err := json.Marshal(map[string]interface{}{
		"id":         notif.ID,
		"title":      notif.Title,
		"message":    notif.Message,
		"type":       notif.Type,
		"read":       notif.Read,
		"created_at": utcTime.Format(timestampFormat),
	})

	if err != nil {
		s.log.Errorf("Failed to marshal notification payload: user_id=%s err=%v", userID, err)
		return
	}

	if err := s.redisClient.Publish(ctx, channel, payload).Err(); err != nil {
		s.log.Errorf("Redis publish failed: channel=%s user_id=%s err=%v", channel, userID, err)
	}
}
