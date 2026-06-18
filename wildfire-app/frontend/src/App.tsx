import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LoginForm, RegisterForm, ForgotPasswordForm } from "./features/authentication";
import { LayoutProvider } from "@/providers/layout-provider";
import { AppLayout } from "@/components/app-layout/AppLayout";
import { Middleware } from "@/middleware/middleware";
import { ensureCSRFToken } from "@/utils/csrf";
import { TooltipProvider } from "@spatialhub/ui";
import { Loader2 } from 'lucide-react';

// Lazy loaded components for code splitting
const MapComponent = lazy(() => import("./features/interactive-map").then(module => ({ default: module.MapComponent })));
const ModelDashboard = lazy(() => import("@/features/model-dashboard/components").then(module => ({ default: module.ModelDashboard })));
const Dashboard = lazy(() => import("@/features/admin-dashboard").then(module => ({ default: module.Dashboard })));
const FeedbackComponent = lazy(() => import("@/features/user-feedback").then(module => ({ default: module.FeedbackComponent })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));
const WeatherSettings = lazy(() => import("@/features/weather/WeatherSettings"));
const ProfilePage = lazy(() => import("@/features/profile").then(module => ({ default: module.ProfilePage })));
const NotificationsPage = lazy(() => import("@/features/notifications/NotificationsPage"));
const AreaSelect = lazy(() => import("@/features/configurator/region-selector/AreaSelect").then(module => ({ default: module.AreaSelect })));
const ModelResultsViewer = lazy(() => import("@/features/model-results").then(module => ({ default: module.ModelResultsViewer })));
const ComparisonPage = lazy(() => import("@/features/comparison").then(module => ({ default: module.ComparisonPage })));
const LegalPage = lazy(() => import("@/pages/legal/LegalPage"));
const LandingPage = lazy(() => import("@/features/landing").then(module => ({ default: module.LandingPage })));

import { ProductTour } from "@/features/guided-tour/ProductTour";
import NotificationProvider from "@/features/notifications/components/NotificationProvider";

const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-background/50 backdrop-blur-sm">
    <div className="text-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
    </div>
  </div>
);

type AppProps = Record<string, never>;

const App: React.FC<AppProps> = () => {
  // Initialize CSRF token on app load
  useEffect(() => {
    ensureCSRFToken().catch((err) => {
      if (import.meta.env.DEV) console.error('Failed to initialize CSRF token:', err);
    });
  }, []);

  return (
    <Router>
      <TooltipProvider delayDuration={0}>
      <LayoutProvider>
        <NotificationProvider>
        <ProductTour>
          <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route element={<Middleware />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginForm />} />
                  <Route path="/register" element={<RegisterForm />} />
                  <Route path="/forgot-password" element={<ForgotPasswordForm />} />
                </Route>

                {/* Map is publicly viewable; guests are prompted to sign in via the top-bar icon */}
                <Route path="/app/map" element={<AppLayout><MapComponent /></AppLayout>} />

                <Route element={<Middleware type="auth" />}>
                  <Route path="/app/feedback" element={<FeedbackComponent />} />
                </Route>

                <Route path="/legal" element={<AppLayout><LegalPage /></AppLayout>} />
                <Route path="/privacy" element={<LegalPage />} />
                <Route path="/consent" element={<LegalPage />} />
                <Route path="/impressum" element={<LegalPage />} />
                <Route path="/disclaimer" element={<LegalPage />} />
                <Route path="/terms-and-conditions" element={<LegalPage />} />

                <Route element={<Middleware type="auth" />}>
                  <Route path="/app/model-dashboard" element={<ModelDashboard />} />
                  <Route path="/app/model-dashboard/new-model" element={<AreaSelect />} />
                  <Route path="/app/model-dashboard/edit/:id" element={<AreaSelect editMode={true} />} />
                  <Route path="/app/model-results/:id" element={<ModelResultsViewer />} />
                  <Route path="/app/comparison" element={<ComparisonPage />} />
                  <Route path="/app/comparison/:modelId" element={<ComparisonPage />} />
                  <Route path="/app/profile" element={<ProfilePage />} />
                  <Route path="/app/admin-dashboard" element={<Dashboard />} />
                  <Route path="/app/settings" element={<SettingsPage />} />
                  <Route path="/app/settings/weather" element={<WeatherSettings />} />
                  <Route path="/app/notifications" element={<NotificationsPage />} />
                </Route>
              </Routes>
            </Suspense>
          </ProductTour>
        </NotificationProvider>
      </LayoutProvider>
      </TooltipProvider>
      </Router>
  )
}

export default App
