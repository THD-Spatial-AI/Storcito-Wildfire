import MapSearchBar from "@/features/interactive-map/MapSearchBar";
import type { FC } from "react";
import { useTranslation } from "@/i18n";
import { Loader2, MapPinned } from "lucide-react";

interface MapOverlaysProps {
    showDrawHint: boolean;
    cursorPos: { x: number; y: number } | null;
    regionSelectionActive: boolean;
    regionSelectionLoading: boolean;
    selectedRegionName?: string;
}

export const MapOverlays: FC<MapOverlaysProps> = ({
    showDrawHint,
    cursorPos,
    regionSelectionActive,
    regionSelectionLoading,
    selectedRegionName,
}) => {
    const { t } = useTranslation();

    return (
        <>
            <MapSearchBar className="absolute top-4 right-4 z-50 flex justify-end" />

            {regionSelectionActive && (
                <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
                    <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm">
                        {regionSelectionLoading ? (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                        ) : (
                            <MapPinned className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>
                            {regionSelectionLoading
                                ? t("configurator.layer2.regionResolving", "Finding administrative boundary…")
                                : selectedRegionName
                                  ? t("configurator.layer2.regionMapSelected", {
                                      name: selectedRegionName,
                                      defaultValue: `${selectedRegionName} selected · click another region to replace it`,
                                  })
                                  : t("configurator.layer2.regionMapPrompt", "Click inside a region to select its complete boundary")}
                        </span>
                    </div>
                </div>
            )}

            {showDrawHint && cursorPos && (
                <div
                    className="absolute pointer-events-none z-20"
                    style={{ left: cursorPos.x, top: cursorPos.y }}
                >
                    <div className="bg-background/90 dark:bg-gray-800/90 backdrop-blur-sm border border-border rounded px-2 py-1 shadow-sm text-xs text-foreground opacity-90">
                        {t("drawing.clickToDraw")}
                    </div>
                </div>
            )}
        </>
    );
};
