import SidebarButton from "@/components/ui/SidebarButton";
import { Authorized } from "@/middleware/authorized";
import { LayoutGrid, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";
import { NotificationDropdown } from "@/components/ui/NotificationDropdown";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { ADMIN_PATH, GITHUB_URL } from "./constants";
import { LayersSheet } from "./LayersSheet";
import { ProfileMenu } from "./ProfileMenu";
import { GuestControls } from "./GuestControls";
import { HelpMenu } from "./HelpMenu";
import { WhatsNewDialog } from "./WhatsNewDialog";
import type { NavigationHandlers, SidebarItem, UserMenuItem } from "./types";
import { APP_VERSION } from "@/version";

type BaseLayerInfo = {
  id: string;
  name: string;
  description: string;
};

interface AppLayoutSidebarProps {
  accessibleBaseLayers: BaseLayerInfo[];
  changeBaseLayer: (layerId: string) => void;
  isActive: (path: string) => boolean;
  navigationHandlers: NavigationHandlers;
  onRestartTour: () => void;
  selectedBaseLayerId: string;
  sidebarItems: SidebarItem[];
  utilityItems: {
    documentation: LucideIcon;
    restartTour: LucideIcon;
    feedback: LucideIcon;
  };
  navigateTo: (path: string) => void;
  userMenuItems: UserMenuItem[];
  getUserInitial: () => string;
  topbarHeight?: string;
  navigateHome?: () => void;
  /** wide nav labels */
  expanded?: boolean;
  navWidth?: string;
  onToggleExpanded?: () => void;
  userName?: string | null;
  userEmail?: string | null;
  /** signed out view */
  isGuest?: boolean;
}

export const AppLayoutSidebar: React.FC<AppLayoutSidebarProps> = ({
  accessibleBaseLayers,
  changeBaseLayer,
  isActive,
  navigationHandlers,
  onRestartTour,
  selectedBaseLayerId,
  sidebarItems,
  utilityItems,
  navigateTo,
  userMenuItems,
  getUserInitial,
  topbarHeight,
  navigateHome,
  expanded = false,
  navWidth,
  onToggleExpanded,
  userName,
  userEmail,
  isGuest = false,
}) => {
  const { t } = useTranslation();
  const goHome = (e: React.MouseEvent) => {
    if (!e.ctrlKey && !e.metaKey && e.button === 0) {
      e.preventDefault();
      navigateHome?.();
    }
  };
  const flame = <img src="/images/logo/storcito-flame.png" alt="" className="size-6 object-contain brightness-[0.6] saturate-150" />;
  const divider = <div className={cn("h-px bg-border", expanded ? "mx-1 w-auto" : "w-6")} />;

  return (
    <aside
      className="fixed left-0 bottom-0 z-[51] flex flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 ease-out w-[var(--nav-width)] top-[var(--topbar-height)]"
    >
      {/* header brand expand */}
        <div className={cn("flex shrink-0 items-center pt-3 pb-2", expanded ? "justify-between px-2" : "flex-col gap-3")}>
          {expanded ? (
            <>
              <div className="flex min-w-0 items-center gap-1.5">
                <a href="/" onClick={goHome} className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 hover:bg-accent">
                  <span className="flex size-8 shrink-0 items-center justify-center">{flame}</span>
                  <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">Storcito</span>
                </a>
                {/* version beside name */}
                <WhatsNewDialog version={APP_VERSION} />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleExpanded}
                    aria-label={t("common.sidebar.collapse", "Collapse sidebar")}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <PanelLeftClose className="size-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("common.sidebar.collapse", "Collapse sidebar")}</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              {/* flame goes home */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="/"
                    onClick={goHome}
                    aria-label={t("common.appName", "Wildfire Risk Assessment")}
                    className="flex size-9 items-center justify-center rounded-xl border border-border bg-background shadow-sm transition-colors hover:bg-accent"
                  >
                    {flame}
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">Storcito</TooltipContent>
              </Tooltip>
              {/* visible open button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleExpanded}
                    aria-label={t("common.sidebar.expand", "Open sidebar")}
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <PanelLeftOpen className="size-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("common.sidebar.expand", "Open sidebar")}</TooltipContent>
              </Tooltip>
              {divider}
            </>
          )}
        </div>

      {/* main menu */}
      {expanded && <div className="mx-3 mb-1 mt-1 h-px bg-border" />}
      <nav className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto", expanded ? "px-2 pt-2" : "items-center gap-3 pt-1")}>
        <Authorized>
          {sidebarItems.map((item) => (
            <SidebarButton
              key={item.path}
              icon={item.icon}
              tooltip={item.title}
              onClick={() => navigateTo(item.path)}
              isActive={isActive(item.path)}
              dataTour={item.dataTour}
              expanded={expanded}
            />
          ))}
        </Authorized>

        <Authorized>{divider}</Authorized>

        <LayersSheet
          baseLayers={accessibleBaseLayers}
          selectedBaseLayerId={selectedBaseLayerId}
          changeBaseLayer={changeBaseLayer}
          topbarHeight={topbarHeight}
          navWidth={navWidth}
          expanded={expanded}
        />
      </nav>

      {/* utilities and profile */}
      <div className={cn("flex shrink-0 flex-col gap-1 pb-4 pt-2", expanded ? "px-2" : "items-center gap-3")}>
          <Authorized>
            <div data-tour="notifications" className={cn(expanded && "w-full")}>
              <NotificationDropdown rail expanded={expanded} />
            </div>
          </Authorized>
        <SidebarButton
          icon={GithubIcon}
          tooltip="GitHub"
          onClick={() => window.open(GITHUB_URL, "_blank", "noopener,noreferrer")}
          dataTour="github"
          expanded={expanded}
        />

        <HelpMenu
          documentationIcon={utilityItems.documentation}
          restartTourIcon={utilityItems.restartTour}
          feedbackIcon={utilityItems.feedback}
          onDocumentation={navigationHandlers.documentation}
          onRestartTour={onRestartTour}
          onFeedback={() => navigationHandlers.feedback()}
          expanded={expanded}
        />

        <Authorized>
          <SidebarButton
            icon={LayoutGrid}
            tooltip={t("common.sidebar.admin", "Admin")}
            onClick={navigationHandlers.dashboard}
            isActive={isActive(ADMIN_PATH)}
            dataTour="dashboard"
            expanded={expanded}
          />
        </Authorized>

        {expanded && <div className="mx-1 my-1 h-px bg-border" />}

        {isGuest && <GuestControls expanded={expanded} onSignIn={navigationHandlers.login} />}

        <ProfileMenu
          userMenuItems={userMenuItems}
          getUserInitial={getUserInitial}
          expanded={expanded}
          userName={userName}
          userEmail={userEmail}
        />

        {/* collapsed version bottom */}
        {!expanded && <WhatsNewDialog version={APP_VERSION} />}
      </div>
    </aside>
  );
};
