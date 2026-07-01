import { WorkspaceSelector } from "@/components/workspace";
import { RegionSelector, type AvailableRegion } from "./RegionSelector";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { Workspace } from "@/components/workspace";
import type { FC } from "react";

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
}) => {
    const { t } = useTranslation();
    return (
        <div className="bg-background dark:bg-gray-800 border-b border-border px-2 py-1 flex items-center justify-between h-10">
            <div className="flex items-center gap-2">
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
                            Select or create a workspace to organize your models
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
                    <div className="flex items-center gap-2 px-2 py-1 border border-border rounded bg-background dark:bg-gray-700 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        <span className="font-medium text-foreground">Loading workspace...</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                {allPolygonsCount > 0 && (
                    <div className="bg-muted border border-border rounded px-2 py-1 flex items-center gap-2">
                        <button
                            onClick={onClearAllPolygons}
                            className="text-xs font-medium text-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                            {t('simulation.mapHeader.clearAll')} ({allPolygonsCount})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
