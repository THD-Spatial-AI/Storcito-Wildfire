import { useEffect } from 'react';
import { useTourStore } from '@/features/guided-tour/store/tour-store';
import { settingsService } from '@/features/settings';

const USER_COOKIE_NAME = 'user_email';
const SHOW_DELAY_MS = 1500;
const WHATS_NEW_SEEN_KEY = 'tour-dashboard-whats-new-seen';

const hasSeenWhatsNew = (): boolean => {
  try {
    return localStorage.getItem(WHATS_NEW_SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

const markWhatsNewSeen = () => {
  try {
    localStorage.setItem(WHATS_NEW_SEEN_KEY, '1');
  } catch {
    /* storage unavailable */
  }
};

export const useProductTour = () => {
  const showTour = useTourStore((s) => s.showTour);
  const tourStep = useTourStore((s) => s.tourStep);
  const tourMode = useTourStore((s) => s.tourMode);
  const setTourStep = useTourStore((s) => s.setTourStep);
  const setShowTour = useTourStore((s) => s.setShowTour);
  const startTourStore = useTourStore((s) => s.startTour);
  const startWhatsNewTour = useTourStore((s) => s.startWhatsNewTour);

  const readCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const safeName = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const regex = new RegExp(`(^|; )${safeName}=([^;]*)`);
    const match = regex.exec(document.cookie);
    return match ? decodeURIComponent(match[2]) : null;
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const checkAndShowTour = async () => {
      if (cancelled) return;

      const userEmail = readCookie(USER_COOKIE_NAME);
      if (!userEmail) {
        return;
      }

      try {
        const data = (await settingsService.getAllSettings()) as Record<string, unknown>;

        if (!data?.privacy_accepted) {
          return;
        }

        if (!data.onboarding_completed) {
          return;
        }

        if (data.product_tour_completed) {
          // Show what's-new once.
          if (!hasSeenWhatsNew() && !cancelled) {
            timer = setTimeout(() => {
              if (!cancelled) {
                startWhatsNewTour();
              }
            }, SHOW_DELAY_MS);
          }
          return;
        }

        const params = new URLSearchParams(globalThis.location.search);
        if (params.get('showTour') === '1') {
          setShowTour(true);
          return;
        }

        if (!cancelled) {
          timer = setTimeout(() => {
            if (!cancelled) {
              setShowTour(true);
            }
          }, SHOW_DELAY_MS);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to fetch user settings for tour:', err);
      }
    };

    checkAndShowTour();

    const scheduleRecheck = () => setTimeout(checkAndShowTour, 100);
    const handlePrivacyAccepted = () => { scheduleRecheck(); };
    const handleOnboardingCompleted = () => { scheduleRecheck(); };
    globalThis.addEventListener('privacy-accepted', handlePrivacyAccepted);
    globalThis.addEventListener('onboarding-completed', handleOnboardingCompleted);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      globalThis.removeEventListener('privacy-accepted', handlePrivacyAccepted);
      globalThis.removeEventListener('onboarding-completed', handleOnboardingCompleted);
    };
  }, [setShowTour, startWhatsNewTour]);

  const completeTour = async () => {
    if (tourMode === 'full') {
      await settingsService.markProductTourCompleted();
    }
    markWhatsNewSeen();

    setShowTour(false);
    setTourStep(0);
    useTourStore.getState().setTourMode('full');
  };

  const startTour = () => {
    startTourStore();
  };

  const startDashboardTour = () => {
    useTourStore.getState().startDashboardTour();
  };

  const skipTour = () => completeTour();

  const restartAreaSelectTour = async () => {
    globalThis.dispatchEvent(new CustomEvent('restart-area-select-tour'));
  };

  return {
    showTour,
    tourStep,
    tourMode,
    setTourStep,
    completeTour,
    startTour,
    startDashboardTour,
    skipTour,
    restartAreaSelectTour,
  };
};
