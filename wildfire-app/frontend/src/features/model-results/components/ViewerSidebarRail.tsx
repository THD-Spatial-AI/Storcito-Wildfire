import { FC } from "react";
import {
  ChartArea,
  Check,
  Eye,
  EyeOff,
  Keyboard,
  Layers2,
  Maximize2,
  Minimize2,
  Mountain,
} from "lucide-react";
import { useTranslation } from "@/i18n";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@spatialhub/ui";
import SidebarButton from "@/components/ui/SidebarButton";
import type { AvailableLayer } from "../viewer-config";

interface ViewerSidebarRailProps {
  show3D: boolean;
  can3D: boolean;
  onToggle3D: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  showTimelineButton: boolean;
  showTimeline: boolean;
  onToggleTimeline: () => void;
  hasRiskLayers: boolean;
  layerVisible: boolean;
  onToggleLayerVisible: () => void;
  switcherLayers: AvailableLayer[];
  activeLayerKey: string;
  onSelectLayer: (key: string) => void;
  showShortcuts: boolean;
  onToggleShortcuts: () => void;
}

// Right-hand button rail: 3D, fullscreen, timeline, visibility, dataset switcher.
export const ViewerSidebarRail: FC<ViewerSidebarRailProps> = ({
  show3D,
  can3D,
  onToggle3D,
  isFullscreen,
  onToggleFullscreen,
  showTimelineButton,
  showTimeline,
  onToggleTimeline,
  hasRiskLayers,
  layerVisible,
  onToggleLayerVisible,
  switcherLayers,
  activeLayerKey,
  onSelectLayer,
  showShortcuts,
  onToggleShortcuts,
}) => {
  const { t } = useTranslation();

  return (
    <aside className="absolute right-0 bottom-0 bg-card border-l border-border shadow-lg z-[51] w-[var(--sidebar-width)] top-0">
      <div className="flex flex-col items-center gap-3 py-4">
        <SidebarButton
          icon={Mountain}
          tooltip={
            show3D
              ? t("modelResults.layer.viewMap", "Map")
              : t("modelResults.layer.viewTerrain", "Terrain")
          }
          onClick={onToggle3D}
          isActive={show3D}
          disabled={!can3D}
        />
        <SidebarButton
          icon={isFullscreen ? Minimize2 : Maximize2}
          tooltip={
            isFullscreen
              ? t("modelResults.layer.exitFullscreen", "Exit fullscreen")
              : t("modelResults.layer.fullscreen", "Fullscreen")
          }
          onClick={onToggleFullscreen}
          isActive={isFullscreen}
        />
        {showTimelineButton && (
          <SidebarButton
            icon={ChartArea}
            tooltip={t("modelResults.timeline.title", "Risk Over Time")}
            onClick={onToggleTimeline}
            isActive={showTimeline}
          />
        )}
        {hasRiskLayers && (
          <SidebarButton
            icon={layerVisible ? Eye : EyeOff}
            tooltip={
              layerVisible
                ? t("modelResults.layer.visible", "Visible")
                : t("modelResults.layer.hidden", "Hidden")
            }
            onClick={onToggleLayerVisible}
            isActive={layerVisible}
          />
        )}
        {hasRiskLayers && switcherLayers.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative">
                <SidebarButton
                  icon={Layers2}
                  tooltip={t("modelResults.layer.dataset", "Layer")}
                  onClick={() => {}}
                  isActive={true}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="left" align="start" sideOffset={16} className="w-48 z-[60]">
              {switcherLayers.map((l) => (
                <DropdownMenuItem
                  key={l.key}
                  onClick={() => onSelectLayer(l.key)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span>{l.title}</span>
                  {activeLayerKey === l.key && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <SidebarButton
          icon={Keyboard}
          tooltip={t("modelResults.shortcuts.title", "Keyboard shortcuts")}
          onClick={onToggleShortcuts}
          isActive={showShortcuts}
        />
      </div>
    </aside>
  );
};
