package services

import "testing"

func TestBuildModelStatusNotificationResultLink(t *testing.T) {
	tests := []struct {
		name        string
		status      string
		wantType    string
		wantModelID bool
	}{
		{name: "completed links to results", status: "completed", wantType: "success", wantModelID: true},
		{name: "failed stays on notification details", status: "failed", wantType: "error", wantModelID: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			notification := buildModelStatusNotification("user-1", "Galicia", 42, tt.status)
			if notification.Type != tt.wantType {
				t.Fatalf("notification type = %q, want %q", notification.Type, tt.wantType)
			}
			if (notification.ModelID != nil) != tt.wantModelID {
				t.Fatalf("model ID presence = %v, want %v", notification.ModelID != nil, tt.wantModelID)
			}
			if notification.ModelID != nil && *notification.ModelID != 42 {
				t.Fatalf("model ID = %d, want 42", *notification.ModelID)
			}
		})
	}
}
