package contracts

// SettingsUpdate captures partial user settings updates.
type SettingsUpdate struct {
	OnboardingCompleted     *bool   `json:"onboarding_completed,omitempty"`
	PrivacyAccepted         *bool   `json:"privacy_accepted,omitempty"`
	ProductTourCompleted    *bool   `json:"product_tour_completed,omitempty"`
	AreaSelectTourCompleted *bool   `json:"area_select_tour_completed,omitempty"`
	ModelIntroCardDismissed *bool   `json:"model_intro_card_dismissed,omitempty"`
	Theme                   *string `json:"theme,omitempty"`
	Language                *string `json:"language,omitempty"`
	EmailNotifications      *bool   `json:"email_notifications,omitempty"`
	BrowserNotifications    *bool   `json:"browser_notifications,omitempty"`
}

// ToMap returns only fields that should be updated in the database.
func (u SettingsUpdate) ToMap() map[string]interface{} {
	updates := make(map[string]interface{})
	if u.OnboardingCompleted != nil {
		updates["onboarding_completed"] = *u.OnboardingCompleted
	}
	if u.PrivacyAccepted != nil {
		updates["privacy_accepted"] = *u.PrivacyAccepted
	}
	if u.ProductTourCompleted != nil {
		updates["product_tour_completed"] = *u.ProductTourCompleted
	}
	if u.AreaSelectTourCompleted != nil {
		updates["area_select_tour_completed"] = *u.AreaSelectTourCompleted
	}
	if u.ModelIntroCardDismissed != nil {
		updates["model_intro_card_dismissed"] = *u.ModelIntroCardDismissed
	}
	if u.Theme != nil {
		updates["theme"] = *u.Theme
	}
	if u.Language != nil {
		updates["language"] = *u.Language
	}
	if u.EmailNotifications != nil {
		updates["email_notifications"] = *u.EmailNotifications
	}
	if u.BrowserNotifications != nil {
		updates["browser_notifications"] = *u.BrowserNotifications
	}
	return updates
}
