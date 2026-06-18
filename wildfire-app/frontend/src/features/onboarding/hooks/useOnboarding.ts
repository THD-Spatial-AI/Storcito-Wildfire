import { useState, useEffect } from 'react';
import { settingsService } from '@/features/settings/services/settings';
import { useAuthStore } from '@/store/auth-store';

interface UserSettings {
  onboarding_completed: boolean;
  privacy_accepted: boolean;
  product_tour_completed: boolean;
  area_select_tour_completed: boolean;
  theme: string;
  language: string;
}

export const useOnboarding = () => {
  const { user } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Always fetch from server (service handles caching + dedup)
        const settings = (await settingsService.getAllSettings()) as unknown as UserSettings;

        // Show onboarding only if not completed and privacy is accepted
        setShowOnboarding(!settings.onboarding_completed && settings.privacy_accepted);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error checking onboarding status:', error);
        // Don't show onboarding if we can't verify
        setShowOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();

    // Listen for privacy acceptance event to re-check onboarding status
    const handlePrivacyAccepted = () => {
      // Delay to allow transition
      setTimeout(() => {
        checkOnboardingStatus();
      }, 300);
    };

    globalThis.addEventListener('privacy-accepted', handlePrivacyAccepted);

    return () => {
      globalThis.removeEventListener('privacy-accepted', handlePrivacyAccepted);
    };
  }, [user]);

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
  };
};

