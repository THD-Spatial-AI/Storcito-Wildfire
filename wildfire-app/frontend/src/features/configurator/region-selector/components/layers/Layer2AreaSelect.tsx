import type { ChangeEvent, FC } from "react";
import { AlertCircle, Download, MapPin, MapPinned, Mountain, Pencil, Ruler, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

import { BufferDistanceField } from "../BufferDistanceField";
import { LayerShell } from "./shared/LayerShell";
import { FileUploadField } from "./shared/FileUploadField";
import type { ConfiguratorContext } from "./types";

const modeButtonClass = (active: boolean) =>
    cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
        active
            ? "border-foreground bg-foreground text-background shadow-sm"
            : "border-border bg-card text-foreground hover:bg-muted/60",
    );

const getStatusMessage = (
    hasError: boolean,
    error: string | undefined,
    isUploadMode: boolean,
    drawn: boolean,
    fileName: string | undefined,
) => {
    if (hasError) return error;
    if (isUploadMode && drawn) {
        return `GeoJSON boundary loaded${fileName ? ` from ${fileName}` : ""}.`;
    }
    if (isUploadMode) return "Upload a GeoJSON file with Polygon or MultiPolygon geometry.";
    if (drawn) return "Area defined. You can keep adjusting it or move on.";
    return "Click on the map to draw your area. Close the polygon to finish.";
};

export const Layer2AreaSelect: FC<{ ctx: ConfiguratorContext }> = ({ ctx }) => {
    const { state, actions, allPolygonsCount, areaStats } = ctx;
    const drawn = allPolygonsCount > 0;
    const isUploadMode = state.areaInputMode === "upload";
    const isDrawMode = state.areaInputMode === "draw";
    const hasUploadError = Boolean(state.geoJsonUploadError);
    const StatusIcon = hasUploadError ? AlertCircle : isUploadMode ? UploadCloud : Pencil;
    const statusMessage = getStatusMessage(
        hasUploadError,
        state.geoJsonUploadError,
        isUploadMode,
        drawn,
        state.uploadedGeoJsonName,
    );

    const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        void actions.handleGeoJsonUpload(file);
        event.target.value = "";
    };

    const handleDownloadSample = () => {
        const sample = {
            type: "FeatureCollection",
            name: "wildfire-area-sample",
            crs: {
                type: "name",
                properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
            },
            features: [
                {
                    type: "Feature",
                    properties: { name: "Sample area" },
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [
                                [-7.8120, 42.1880],
                                [-7.8005, 42.1895],
                                [-7.7930, 42.1860],
                                [-7.7920, 42.1790],
                                [-7.8015, 42.1745],
                                [-7.8110, 42.1770],
                                [-7.8150, 42.1825],
                                [-7.8120, 42.1880],
                            ],
                        ],
                    },
                },
            ],
        };
        const blob = new Blob([JSON.stringify(sample, null, 2)], {
            type: "application/geo+json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "wildfire-area-sample.geojson";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <LayerShell
            purpose="Optionally upload a DTM to see its coverage, then draw inside it — or just draw on the bundled data."
            nextStepHint="Next we'll validate the selected area and model inputs."
        >
            <div className="mb-3 rounded-lg border border-border bg-muted/30 p-2.5">
                <FileUploadField
                    label="Terrain model (DTM)"
                    accept=".tif,.tiff"
                    hint="Optional GeoTIFF (.tif) — its coverage is shown on the map"
                    info="A Digital Terrain Model — a GeoTIFF where each pixel is the ground elevation. Upload it first to see its coverage outline on the map, then draw your area inside it. Used to derive slope/aspect and as the spatial reference grid. If omitted, the bundled regional terrain is used."
                    icon={Mountain}
                    fileName={ctx.state.dtmName}
                    error={ctx.state.dtmError}
                    processing={ctx.state.dtmProcessing}
                    processingLabel="Reading DTM coverage…"
                    onSelect={(f) => ctx.actions.setDtmFile(f)}
                />
                {ctx.state.dtmFootprint && !ctx.state.dtmProcessing && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] leading-snug text-emerald-600 dark:text-emerald-400">
                        <MapPinned className="h-3 w-3 shrink-0" /> Coverage shown on the map — draw your area inside the outline.
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2" data-tour="area-input-mode">
                <button
                    type="button"
                    onClick={() => actions.setAreaInputMode("draw")}
                    className={modeButtonClass(isDrawMode)}
                >
                    <Pencil className="h-3 w-3 shrink-0" />
                    <span className="text-[11px] font-semibold leading-tight whitespace-nowrap">Draw area</span>
                </button>

                <label
                    onClick={() => actions.setAreaInputMode("upload")}
                    className={cn(modeButtonClass(isUploadMode), "cursor-pointer")}
                >
                    <UploadCloud className="h-3 w-3 shrink-0" />
                    <span className="text-[11px] font-semibold leading-tight whitespace-nowrap">Upload GeoJSON</span>
                    <input
                        type="file"
                        accept=".geojson,.json,application/geo+json,application/json"
                        className="sr-only"
                        onChange={handleUploadChange}
                    />
                </label>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs">
                <div className="min-w-0">
                    <p className="font-semibold text-foreground">Not sure about the format?</p>
                    <p className="text-muted-foreground leading-snug">
                        Polygon or MultiPolygon, WGS84 (EPSG:4326), <code className="font-mono">[lon, lat]</code> order.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-foreground bg-foreground px-2.5 py-1.5 text-[11px] font-semibold text-background transition-colors hover:bg-foreground/90"
                >
                    <Download className="h-3 w-3" />
                    Sample
                </button>
            </div>

            <div
                className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs",
                    drawn && !hasUploadError
                        ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
                )}
                data-tour="area-status"
            >
                <StatusIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="min-w-0 break-words leading-snug">{statusMessage}</span>
            </div>

            <BufferDistanceField value={state.bufferDistance} onChange={actions.setBufferDistance} />

            <div className="rounded-lg border border-border bg-card overflow-hidden" data-tour="area-summary">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                    <MapPin className="w-3.5 h-3.5 text-foreground" />
                    <span className="text-xs font-semibold text-foreground">Area summary</span>
                    {areaStats && areaStats.regions > 1 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-muted rounded ml-auto">
                            {areaStats.regions} regions
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2.5 text-xs">
                    <SummaryRow label="Status">
                        <span
                            className={cn(
                                "font-medium",
                                drawn ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                            )}
                        >
                            {drawn ? (isUploadMode ? "Uploaded" : "Drawn") : "Not set"}
                        </span>
                    </SummaryRow>
                    <SummaryRow label="Area">{areaStats?.area ?? "—"}</SummaryRow>
                    <SummaryRow label="Perimeter">{areaStats?.perimeter ?? "—"}</SummaryRow>
                </div>
            </div>
        </LayerShell>
    );
};

const SummaryRow: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <>
        <div className="flex items-center gap-1.5">
            <Ruler className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">{label}</span>
        </div>
        <span className="font-medium text-foreground text-right">{children}</span>
    </>
);
