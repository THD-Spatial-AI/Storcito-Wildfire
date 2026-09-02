import { WorkspaceSelector } from "@/components/workspace";
import { RegionSelector, type AvailableRegion } from "./RegionSelector";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { Workspace } from "@/components/workspace";
import type { FC, ReactNode } from "react";

interface MapHeaderProps {
    allPolygonsCount: number;
    onClearAllPolygons: () => void;
    isLoadingPreference: boolean;
    wsReloadKey: number;
    currentWorkspace: Workspace | null;
    preferredWorkspaceId?: number;
    normalizedWorkspaceId?: number;
    onWorkspaceChange: (workspace: Workspace | null) => void;
    onOpenCreateWorkspace: () => void;
    availableRegions?: AvailableRegion[];
    onRegionSelect?: (region: AvailableRegion) => void;
    /** Step breadcrumb. */
    steps?: ReactNode;
}

export const MapHeader: FC<MapHeaderProps> = ({
    allPolygonsCount,
    onClearAllPolygons,
    isLoadingPreference,
    wsReloadKey,
    currentWorkspace,
    preferredWorkspaceId,
    normalizedWorkspaceId,
    onWorkspaceChange,
    onOpenCreateWorkspace,
    availableRegions = [],
    onRegionSelect,
    steps,
}) => {
    const { t } = useTranslation();
    return (
        <div className="bg-background border-b border-border px-3 py-1.5 flex items-center justify-between gap-3 h-11">
            <div className="flex min-w-0 items-center gap-2">
                {!isLoadingPreference && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <WorkspaceSelector
                                    onWorkspaceChange={onWorkspaceChange}
                                    onCreateWorkspace={onOpenCreateWorkspace}
                                    reloadKey={wsReloadKey}
                                    initialWorkspaceId={normalizedWorkspaceId ?? preferredWorkspaceId ?? undefined}
                                    activeWorkspace={currentWorkspace}
                                    compact={true}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {t("workspace.selectorHint", "Select or create a workspace to organize your models")}
                        </TooltipContent>
                    </Tooltip>
                )}
                {onRegionSelect && availableRegions.length > 0 && (
                    <RegionSelector
                        regions={availableRegions}
                        onRegionSelect={onRegionSelect}
                    />
                )}
                {isLoadingPreference && (
                    <div className="md-fade-in flex items-center gap-2 px-2 py-1 border border-border rounded bg-background text-xs">
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        <span className="font-medium text-foreground">{t("model.loadingWorkspace", "Loading workspace...")}</span>
                    </div>
                )}
            </div>

            {steps && <div className="min-w-0 flex-1 overflow-x-auto">{steps}</div>}

            <div className="flex shrink-0 items-center gap-2">
                {allPolygonsCount > 0 && (
                    <div className="md-fade-in bg-muted border border-border rounded-lg px-2 py-1 flex items-center gap-2">
                        <button
                            onClick={onClearAllPolygons}
                            className="text-xs font-medium text-foreground transition-colors duration-150 hover:text-destructive"
                        >
                            {t('simulation.mapHeader.clearAll')} ({allPolygonsCount})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
