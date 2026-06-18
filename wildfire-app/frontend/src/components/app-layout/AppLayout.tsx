import { Fragment } from "react";
import { useNavigate } from "react-router-dom";

import OnboardingWizard from "@/features/onboarding/OnboardingWizard";
import { Authorized } from "@/middleware/authorized";
import { SessionExpiryBanner } from "@/components/ui/SessionExpiryBanner";
import { AppLayoutSidebar } from "./app-layout/AppLayoutSidebar";
import { AppLayoutTopbar } from "./app-layout/AppLayoutTopbar";
import { useAppLayoutState } from "./app-layout/hooks/useAppLayoutState";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const {
    accessibleBaseLayers,
    changeBaseLayer,
    completeOnboarding,
    cssVariables,
    getUserInitial,
    handleSmartRestartTour,
    hasAccessToLayer,
    isActive,
    navigationHandlers,
    selectedBaseLayerId,
    showOnboarding,
    sidebarItems,
    user,
    userMenuItems,
    utilityItems,
  } = useAppLayoutState();

  return (
    <Fragment>
      <OnboardingWizard isOpen={showOnboarding} onComplete={completeOnboarding} />

      <div
        className="relative flex h-full w-full overflow-hidden bg-background text-foreground"
        style={cssVariables}
      >
        <AppLayoutTopbar
          user={user}
          navigationHandlers={navigationHandlers}
          navigateHome={() => navigate("/")}
        />

        <AppLayoutSidebar
          accessibleBaseLayers={accessibleBaseLayers}
          selectedBaseLayerId={selectedBaseLayerId}
          changeBaseLayer={changeBaseLayer}
          hasAccessToLayer={hasAccessToLayer}
          sidebarItems={sidebarItems}
          isActive={isActive}
          navigationHandlers={navigationHandlers}
          onRestartTour={handleSmartRestartTour}
          utilityItems={utilityItems}
          navigateTo={navigate}
          userMenuItems={userMenuItems}
          getUserInitial={getUserInitial}
        />

        <main
          className="relative flex-1 bg-background text-foreground"
          style={{
            paddingTop: "var(--topbar-height)",
            paddingLeft: "var(--sidebar-width)",
          }}
        >
          <Authorized>
            <SessionExpiryBanner />
          </Authorized>
          <div className="w-full h-full overflow-y-auto overflow-x-hidden">{children}</div>
        </main>
      </div>
    </Fragment>
  );
};
