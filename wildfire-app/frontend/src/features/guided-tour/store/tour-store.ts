import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TourMode = 'full' | 'whatsNew' | 'dashboard';

type TourState = {
  showTour: boolean;
  tourStep: number;
  tourMode: TourMode;
  startTour: () => void;
  startWhatsNewTour: () => void;
  startDashboardTour: () => void;
  setTourStep: (index: number) => void;
  setShowTour: (show: boolean) => void;
  setTourMode: (mode: TourMode) => void;
};

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      showTour: false,
      tourStep: 0,
      tourMode: 'full' as TourMode,
      startTour: () => set({ showTour: true, tourStep: 0, tourMode: 'full' }),
      startWhatsNewTour: () => set({ showTour: true, tourStep: 0, tourMode: 'whatsNew' }),
      startDashboardTour: () => set({ showTour: true, tourStep: 0, tourMode: 'dashboard' }),
      setTourStep: (index: number) => set({ tourStep: index }),
      setShowTour: (show: boolean) => set({ showTour: show }),
      setTourMode: (mode: TourMode) => set({ tourMode: mode }),
    }),
    {
      name: 'product-tour-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        showTour: state.showTour,
        tourStep: state.tourStep,
        tourMode: state.tourMode,
      }),
    }
  )
);
