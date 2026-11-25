import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LoginForm, RegisterForm, ForgotPasswordForm } from "./features/authentication";
import { LayoutProvider } from "@/providers/layout-provider";
import { AppLayout } from "@/components/app-layout/AppLayout";
import { Middleware } from "@/middleware/middleware";
import { ensureCSRFToken } from "@/utils/csrf";
import { useDataDisplayStore, TEXT_SIZE_PX } from "@/features/settings/store/data-display";
import { useAccessibilityStore } from "@/features/settings/store/accessibility";
import { TooltipProvider } from "@spatialhub/ui";
import { Loader2 } from 'lucide-react';

// lazy loaded components
const MapComponent = lazy(() => import("./features/interactive-map").then(module => ({ default: module.MapComponent })));
const ModelDashboard = lazy(() => import("@/features/model-dashboard/components").then(module => ({ default: module.ModelDashboard })));
const Dashboard = lazy(() => import("@/features/admin-dashboard").then(module => ({ default: module.Dashboard })));
const FeedbackComponent = lazy(() => import("@/features/user-feedback").then(module => ({ default: module.FeedbackComponent })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));
const NotificationsPage = lazy(() => import("@/features/notifications/NotificationsPage"));
const AreaSelect = lazy(() => import("@/features/configurator/region-selector/AreaSelect").then(module => ({ default: module.AreaSelect })));
const ModelResultsViewer = lazy(() => import("@/features/model-results").then(module => ({ default: module.ModelResultsViewer })));
const ComparisonPage = lazy(() => import("@/features/comparison").then(module => ({ default: module.ComparisonPage })));
const LegalPage = lazy(() => import("@/pages/legal/LegalPage"));
const DocsPage = lazy(() => import("@/pages/docs/DocsPage"));
const LandingPage = lazy(() => import("@/features/landing").then(module => ({ default: module.LandingPage })));

import { ProductTour } from "@/features/guided-tour/ProductTour";
import NotificationProvider from "@/features/notifications/components/NotificationProvider";

const PageLoader = () => (
  <div className="h-[100dvh] w-full flex items-center justify-center bg-background/50 backdrop-blur-sm">
    <div className="text-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
    </div>
  </div>
);

type AppProps = Record<string, never>;

// legal pages
const LEGAL_PATHS = ["/legal", "/privacy", "/consent", "/impressum", "/disclaimer", "/terms-and-conditions"];

const App: React.FC<AppProps> = () => {
  const textSize = useDataDisplayStore((s) => s.textSize);

  // initialize csrf token
  useEffect(() => {
    ensureCSRFToken().catch((err) => {
      if (import.meta.env.DEV) console.error('Failed to initialize CSRF token:', err);
    });
  }, []);

  // rem text size
  useEffect(() => {
    document.documentElement.style.fontSize = TEXT_SIZE_PX[textSize] ?? TEXT_SIZE_PX.normal;
  }, [textSize]);

  // accessibility classes
  const { highContrast, motion, largeTargets, palette } = useAccessibilityStore();
  useEffect(() => {
    const root = document.documentElement.classList;
    root.toggle("a11y-contrast", highContrast);
    root.toggle("a11y-reduce-motion", motion === "reduce");
    root.toggle("a11y-large-targets", largeTargets);
    root.toggle("a11y-colorblind", palette === "colorblind");
  }, [highContrast, motion, largeTargets, palette]);

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

                {/* map publicly viewable */}
                <Route path="/app/map" element={<AppLayout><MapComponent /></AppLayout>} />

                <Route element={<Middleware type="auth" />}>
                  <Route path="/app/feedback" element={<FeedbackComponent />} />
                </Route>

                <Route path="/docs/:section?" element={<AppLayout><DocsPage /></AppLayout>} />
                {LEGAL_PATHS.map((path) => (
                  <Route key={path} path={path} element={<AppLayout><LegalPage /></AppLayout>} />
                ))}

                <Route element={<Middleware type="auth" />}>
                  <Route path="/app/model-dashboard" element={<ModelDashboard />} />
                  <Route path="/app/model-dashboard/new-model" element={<AreaSelect />} />
                  <Route path="/app/model-dashboard/edit/:id" element={<AreaSelect editMode={true} />} />
                  <Route path="/app/model-results/:id" element={<ModelResultsViewer />} />
                  {/* profile moved settings */}
                  <Route path="/app/profile" element={<Navigate to="/app/settings?tab=profile" replace />} />
                  <Route path="/app/admin-dashboard" element={<Dashboard />} />
                  <Route path="/app/settings" element={<SettingsPage />} />
                  <Route path="/app/notifications" element={<NotificationsPage />} />
                </Route>

                <Route
                  element={(
                    <Middleware
                      type="auth"
                      minimumAccess="manager"
                      accessDeniedTo="/app/model-dashboard"
                    />
                  )}
                >
                  <Route path="/app/comparison" element={<ComparisonPage />} />
                  <Route path="/app/comparison/:modelId" element={<ComparisonPage />} />
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
