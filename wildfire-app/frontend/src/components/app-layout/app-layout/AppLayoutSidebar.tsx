import SidebarButton from "@/components/ui/SidebarButton";
import { Authorized } from "@/middleware/authorized";
import { LayerInfo } from "@/features/interactive-map/store/map-store";
import { LayoutGrid, type LucideIcon } from "lucide-react";
import { ADMIN_PATH } from "./constants";
import { LayersSheet } from "./LayersSheet";
import { ProfileMenu } from "./ProfileMenu";
import { HelpMenu } from "./HelpMenu";
import type { NavigationHandlers, SidebarItem, UserMenuItem } from "./types";
import { APP_VERSION } from "@/version";

type BaseLayerInfo = {
  id: string;
  name: string;
  description: string;
};

interface AppLayoutSidebarProps {
  accessibleBaseLayers: BaseLayerInfo[];
  changeBaseLayer: (index: number) => void;
  hasAccessToLayer: (layer: LayerInfo) => boolean;
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
}

export const AppLayoutSidebar: React.FC<AppLayoutSidebarProps> = ({
  accessibleBaseLayers,
  changeBaseLayer,
  hasAccessToLayer,
  isActive,
  navigationHandlers,
  onRestartTour,
  selectedBaseLayerId,
  sidebarItems,
  utilityItems,
  navigateTo,
  userMenuItems,
  getUserInitial,
}) => {
  return (
    <aside className="fixed left-0 bottom-0 bg-card border-r border-border shadow-lg z-[51] w-[var(--sidebar-width)] top-[var(--topbar-height)]">
      <div className="flex flex-col items-center gap-3 py-4">
        <Authorized>
          {sidebarItems.map((item) => (
            <SidebarButton
              key={item.path}
              icon={item.icon}
              tooltip={item.title}
              onClick={() => navigateTo(item.path)}
              isActive={isActive(item.path)}
              dataTour={item.dataTour}
            />
          ))}
        </Authorized>

        {/* Separate primary navigation (above) from the Layers map tool (below) */}
        <Authorized>
          <div className="w-6 h-px bg-border" />
        </Authorized>

        <LayersSheet
          baseLayers={accessibleBaseLayers}
          selectedBaseLayerId={selectedBaseLayerId}
          changeBaseLayer={changeBaseLayer}
          hasAccessToLayer={hasAccessToLayer}
        />
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 text-center">
        <HelpMenu
          documentationIcon={utilityItems.documentation}
          restartTourIcon={utilityItems.restartTour}
          feedbackIcon={utilityItems.feedback}
          onDocumentation={navigationHandlers.documentation}
          onRestartTour={onRestartTour}
          onFeedback={() => navigationHandlers.feedback()}
        />

        <Authorized>
          <SidebarButton
            icon={LayoutGrid}
            tooltip="Dashboard"
            onClick={navigationHandlers.dashboard}
            isActive={isActive(ADMIN_PATH)}
            dataTour="dashboard"
          />
        </Authorized>

        <ProfileMenu userMenuItems={userMenuItems} getUserInitial={getUserInitial} />

        <span className="text-[9px] font-medium tabular-nums text-muted-foreground/60" title={`App version ${APP_VERSION}`}>
          v{APP_VERSION}
        </span>
      </div>
    </aside>
  );
};
