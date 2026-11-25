import { Fragment } from "react";
import { useNavigate } from "react-router-dom";

import OnboardingWizard from "@/features/onboarding/OnboardingWizard";
import { Authorized } from "@/middleware/authorized";
import { SessionExpiryBanner } from "@/components/ui/SessionExpiryBanner";
import { AppLayoutSidebar } from "./app-layout/AppLayoutSidebar";
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
    navExpanded,
    toggleNav,
    getUserInitial,
    handleSmartRestartTour,
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
        // pages read nav
        data-nav={navExpanded ? "expanded" : "collapsed"}
        className="group/app relative flex h-full w-full overflow-hidden bg-background text-foreground"
        style={cssVariables}
      >
        <AppLayoutSidebar
          accessibleBaseLayers={accessibleBaseLayers}
          selectedBaseLayerId={selectedBaseLayerId}
          changeBaseLayer={changeBaseLayer}
          sidebarItems={sidebarItems}
          isActive={isActive}
          navigationHandlers={navigationHandlers}
          onRestartTour={handleSmartRestartTour}
          utilityItems={utilityItems}
          navigateTo={navigate}
          userMenuItems={userMenuItems}
          getUserInitial={getUserInitial}
          navigateHome={() => navigate("/")}
          expanded={navExpanded}
          onToggleExpanded={toggleNav}
          userName={user?.name}
          userEmail={user?.email}
          isGuest={!user}
        />

        <main
          // own layer dialogs
          className="relative isolate flex-1 min-w-0 bg-background text-foreground transition-[padding] duration-200 ease-out"
          style={{
            paddingTop: "var(--topbar-height)",
            paddingLeft: "var(--nav-width)",
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
