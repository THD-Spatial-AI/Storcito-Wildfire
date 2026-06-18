import MapSearchBar from "@/features/interactive-map/MapSearchBar";
import type { FC } from "react";
import { useTranslation } from "@/i18n";

interface MapOverlaysProps {
    showDrawHint: boolean;
    cursorPos: { x: number; y: number } | null;
}

export const MapOverlays: FC<MapOverlaysProps> = ({
    showDrawHint,
    cursorPos,
}) => {
    const { t } = useTranslation();

    return (
        <>
            <MapSearchBar className="absolute top-4 right-4 z-50 flex justify-end" />

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
