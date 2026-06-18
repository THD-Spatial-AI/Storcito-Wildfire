import type { FC } from "react";
import { CloudRain, Mountain, Flame, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayerShell } from "./shared/LayerShell";
import type { ConfiguratorContext, OptionalLayerKey } from "./types";

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
                                "group relative flex items-center gap-3 rounded-xl border bg-gradient-to-br p-3.5 transition-all",
                                enabled
                                    ? cn("border-foreground/15 shadow-sm", it.accent)
                                    : "border-border bg-muted/30 from-transparent to-transparent",
                            )}
                        >
                            <span
                                className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                                    enabled
                                        ? "border-current bg-background/60"
                                        : "border-border bg-background/40 text-muted-foreground",
                                )}
                            >
                                <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">{it.label}</span>
                                    <span className="rounded-full border border-border bg-background/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                                        {it.weight}
                                    </span>
                                </div>
                                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{it.hint}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => ctx.toggleOptionalLayer(it.id)}
                                role="switch"
                                aria-checked={enabled}
                                aria-label={`Toggle ${it.label}`}
                                className={cn(
                                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                    enabled ? "bg-emerald-500" : "bg-muted-foreground/30 hover:bg-muted-foreground/40",
                                )}
                            >
                                <span
                                    className={cn(
                                        "inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform",
                                        enabled ? "translate-x-[22px]" : "translate-x-0.5",
                                    )}
                                />
                            </button>
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
        </LayerShell>
    );
};
