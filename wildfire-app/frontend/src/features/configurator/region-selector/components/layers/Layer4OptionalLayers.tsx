import type { FC } from "react";
import { CloudRain, Mountain, Flame, AlertCircle, FileCheck2, X, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { cn } from "@/lib/utils";
import { LayerShell } from "./shared/LayerShell";
import type { ConfiguratorContext, OptionalLayerKey } from "./types";

interface FileUploadFieldProps {
    label: string;
    accept: string;
    hint: string;
    info: string;
    icon: typeof CloudRain;
    fileName?: string;
    error?: string;
    onSelect: (file: File | null) => void;
}

const FileUploadField: FC<FileUploadFieldProps> = ({ label, accept, hint, info, icon: Icon, fileName, error, onSelect }) => (
    <div className={cn("rounded-lg border px-3 py-2.5", error ? "border-red-500/50 bg-red-500/5" : "border-border bg-card")}>
        <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground">
                <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                    {label}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" aria-label={`About ${label}`} className="text-muted-foreground transition-colors hover:text-foreground focus:outline-none">
                                <Info className="h-3 w-3" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[260px] text-xs">{info}</TooltipContent>
                    </Tooltip>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                    {fileName ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                            <FileCheck2 className="h-3 w-3 text-emerald-500" /> {fileName}
                        </span>
                    ) : (
                        hint
                    )}
                </div>
            </div>
            {fileName ? (
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    aria-label={`Remove ${label}`}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            ) : (
                <label className="shrink-0 cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted">
                    Choose
                    <input
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(e) => {
                            onSelect(e.target.files?.[0] ?? null);
                            e.target.value = "";
                        }}
                    />
                </label>
            )}
        </div>
        {error && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" /> {error}
            </p>
        )}
    </div>
);

interface OptionalLayerItem {
    id: OptionalLayerKey;
    label: string;
    hint: string;
    icon: typeof CloudRain;
    weight: string;
    accent: string;
}

const ITEMS: OptionalLayerItem[] = [
    {
        id: "weather_overlay",
        label: "Fire-weather (FWI)",
        hint: "Wind, humidity, temperature, drought — the strongest fire driver",
        icon: CloudRain,
        weight: "30% weight",
        accent: "from-sky-500/15 to-sky-500/0 text-sky-600 dark:text-sky-400",
    },
    {
        id: "terrain_analysis",
        label: "Terrain & slope",
        hint: "Elevation, slope and aspect influence on spread",
        icon: Mountain,
        weight: "6% weight",
        accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
    },
    {
        id: "historical_fires",
        label: "Historical fires",
        hint: "Recurrence based on past fire incidents in the area",
        icon: Flame,
        weight: "4% weight",
        accent: "from-orange-500/15 to-orange-500/0 text-orange-600 dark:text-orange-400",
    },
];

export const Layer4OptionalLayers: FC<{ ctx: ConfiguratorContext }> = ({ ctx }) => {
    const weatherDisabled = !ctx.optionalLayers.weather_overlay;
    return (
        <LayerShell
            purpose="These signals feed the AHP-weighted risk model. All three are enabled by default and recommended for an accurate forest-fire risk assessment."
            nextStepHint="Next we'll do a final review before saving."
        >
            <div className="space-y-2.5" data-tour="optional-layers">
                {ITEMS.map((it) => {
                    const enabled = ctx.optionalLayers[it.id];
                    const Icon = it.icon;
                    return (
                        <div
                            key={it.id}
                            className={cn(
                                "group relative flex items-start gap-2.5 rounded-xl border bg-gradient-to-br p-3 transition-all",
                                enabled
                                    ? cn("border-foreground/15 shadow-sm", it.accent)
                                    : "border-border bg-muted/30 from-transparent to-transparent",
                            )}
                        >
                            <span
                                className={cn(
                                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                                    enabled
                                        ? "border-current bg-background/60"
                                        : "border-border bg-background/40 text-muted-foreground",
                                )}
                            >
                                <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-foreground">{it.label}</span>
                                    <button
                                        type="button"
                                        onClick={() => ctx.toggleOptionalLayer(it.id)}
                                        role="switch"
                                        aria-checked={enabled}
                                        aria-label={`Toggle ${it.label}`}
                                        className={cn(
                                            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                            enabled ? "bg-emerald-500" : "bg-muted-foreground/30 hover:bg-muted-foreground/40",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform",
                                                enabled ? "translate-x-[18px]" : "translate-x-0.5",
                                            )}
                                        />
                                    </button>
                                </div>
                                <span className="mt-1 inline-block rounded-full border border-border bg-background/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                                    {it.weight}
                                </span>
                                <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{it.hint}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {weatherDisabled && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                        Fire-weather is the main risk signal. Disabling it makes the date selection irrelevant and produces a
                        drastically under-estimated risk map. Keep it on unless you specifically need a baseline without weather.
                    </span>
                </div>
            )}

            <div className="mt-4 border-t border-border pt-4">
                <h4 className="text-xs font-semibold text-foreground">Custom data (optional)</h4>
                <p className="mb-2 mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    Bring your own inputs for this area. If left empty, the bundled regional data is used.
                </p>
                <div className="space-y-2">
                    <FileUploadField
                        label="Weather station data"
                        accept=".xlsx,.xls,.csv"
                        hint="Excel or CSV station export (.xlsx / .csv)"
                        info="Hourly weather measurements from a local station — temperature, humidity, wind and precipitation. Used to compute the Fire Weather Index for this area. Upload an Excel or CSV export; if omitted, the bundled regional weather data is used."
                        icon={CloudRain}
                        fileName={ctx.state.stationDataName}
                        error={ctx.state.stationDataError}
                        onSelect={(f) => ctx.actions.setStationDataFile(f)}
                    />
                    <FileUploadField
                        label="Terrain model (DTM)"
                        accept=".tif,.tiff"
                        hint="GeoTIFF elevation raster (.tif)"
                        info="A Digital Terrain Model — a GeoTIFF where each pixel is the ground elevation. Used to derive slope and aspect and as the spatial reference grid for the area. If omitted, the bundled regional terrain is used."
                        icon={Mountain}
                        fileName={ctx.state.dtmName}
                        error={ctx.state.dtmError}
                        onSelect={(f) => ctx.actions.setDtmFile(f)}
                    />
                </div>
            </div>
        </LayerShell>
    );
};
