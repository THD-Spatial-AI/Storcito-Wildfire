import type { FC } from "react";
import { CloudRain, Mountain, Flame, AlertCircle, Zap, Info } from "lucide-react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { LayerShell } from "./shared/LayerShell";
import { FileUploadField } from "./shared/FileUploadField";
import type { ConfiguratorContext, OptionalLayerKey } from "./types";

interface OptionalLayerItem {
  id: OptionalLayerKey;
  label: string;
  hint: string;
  icon: typeof CloudRain;
  weight: string;
  accent: string;
}

export const Layer4OptionalLayers: FC<{ ctx: ConfiguratorContext }> = ({ ctx }) => {
  const { t } = useTranslation();
  const weatherDisabled = !ctx.optionalLayers.weather_overlay;
  const { fromDate, toDate, calculationMode, availablePrecomputedDates, usePrecomputed } =
    ctx.state;
  const precomputedAvailable =
    calculationMode === "dynamic" &&
    fromDate === toDate &&
    availablePrecomputedDates.includes(fromDate);
  const precomputedOn = usePrecomputed && precomputedAvailable;

  const ITEMS: OptionalLayerItem[] = [
    {
      id: "weather_overlay",
      label: t("configurator.layer3.fwiLabel", "Fire-weather (FWI)"),
      hint: t(
        "configurator.layer3.fwiHint",
        "Wind, humidity, temperature, drought — the strongest fire driver"
      ),
      icon: CloudRain,
      weight: t("configurator.layer3.fwiWeight", "30% weight"),
      accent: "from-sky-500/15 to-sky-500/0 text-sky-600 dark:text-sky-400",
    },
    {
      id: "terrain_analysis",
      label: t("configurator.layer3.terrainLabel", "Terrain & slope"),
      hint: t("configurator.layer3.terrainHint", "Elevation, slope and aspect influence on spread"),
      icon: Mountain,
      weight: t("configurator.layer3.terrainWeight", "6% weight"),
      accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "historical_fires",
      label: t("configurator.layer3.historicalLabel", "Historical fires"),
      hint: t(
        "configurator.layer3.historicalHint",
        "Recurrence based on past fire incidents in the area"
      ),
      icon: Flame,
      weight: t("configurator.layer3.historicalWeight", "4% weight"),
      accent: "from-orange-500/15 to-orange-500/0 text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <LayerShell
      purpose={t(
        "configurator.layer3.purpose",
        "These signals feed the AHP-weighted risk model. All three are enabled by default and recommended for an accurate forest-fire risk assessment."
      )}
      nextStepHint={t(
        "configurator.layer3.nextStepHint",
        "Next we'll do a final review before saving."
      )}
    >
      <div
        className={cn(
          "mb-3 rounded-xl border p-3 transition-all",
          precomputedOn
            ? "border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-violet-500/0"
            : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                precomputedOn
                  ? "border-violet-500/50 text-violet-600 dark:text-violet-400 bg-background/60"
                  : "border-border text-muted-foreground bg-background/40"
              )}
            >
              <Zap className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">
                {t("configurator.layer3.precomputedLabel", "Precomputed regional map")}
              </span>
              <span
                className="cursor-help text-muted-foreground"
                title={t(
                  "configurator.layer3.precomputedInfo",
                  "Every night the whole region is analysed with all risk layers enabled. When your date is covered, your area's result is clipped from that map and arrives in seconds. Disable it (or toggle individual layers below) to compute every step specifically for your area (~1-2 minutes)."
                )}
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={precomputedOn}
            disabled={!precomputedAvailable}
            onClick={() => ctx.actions.setUsePrecomputed(!usePrecomputed)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
              !precomputedAvailable && "cursor-not-allowed opacity-40",
              precomputedOn
                ? "bg-violet-500"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/40"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform",
                precomputedOn ? "translate-x-[18px]" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          {!precomputedAvailable
            ? t(
                "configurator.layer3.precomputedUnavailable",
                "Not available for the selected date (or date range / static mode) - the nightly analysis has not processed it yet. The model will compute all steps for your area."
              )
            : precomputedOn
              ? t(
                  "configurator.layer3.precomputedOnHint",
                  "Result in seconds, clipped from tonight's whole-region analysis. All three risk layers below are included and therefore locked."
                )
              : t(
                  "configurator.layer3.precomputedOffHint",
                  "Full computation for your exact area (~1-2 minutes); you can toggle individual layers below."
                )}
        </p>
      </div>

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
                  : "border-border bg-muted/30 from-transparent to-transparent"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  enabled
                    ? "border-current bg-background/60"
                    : "border-border bg-background/40 text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{it.label}</span>
                  <button
                    type="button"
                    disabled={precomputedOn}
                    title={
                      precomputedOn
                        ? t(
                            "configurator.layer3.lockedByPrecomputed",
                            "Included in the precomputed regional map. Disable the precomputed switch above to customise layers."
                          )
                        : undefined
                    }
                    onClick={() => ctx.toggleOptionalLayer(it.id)}
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Toggle ${it.label}`}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      precomputedOn && "cursor-not-allowed opacity-50",
                      enabled
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/40"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform",
                        enabled ? "translate-x-[18px]" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <span className="mt-1 inline-block rounded-full border border-border bg-background/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {it.weight}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                  {it.hint}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {weatherDisabled && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t(
              "configurator.layer3.weatherWarning",
              "Fire-weather is the main risk signal. Disabling it makes the date selection irrelevant and produces a drastically under-estimated risk map. Keep it on unless you specifically need a baseline without weather."
            )}
          </span>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <h4 className="text-xs font-semibold text-foreground">
          {t("configurator.layer3.customData", "Custom data (optional)")}
        </h4>
        <p className="mb-2 mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {t(
            "configurator.layer3.customDataDesc",
            "Bring your own weather inputs for this area. If left empty, the bundled regional data is used."
          )}
          {/* The DTM is uploaded earlier, in the Area Selection step. */}
        </p>
        <div className="space-y-2">
          <FileUploadField
            label={t("configurator.layer3.weatherStationData", "Weather station data")}
            accept=".xlsx,.xls,.csv"
            hint={t(
              "configurator.layer3.weatherStationHint",
              "Excel or CSV station export (.xlsx / .csv)"
            )}
            info={t(
              "configurator.layer3.weatherStationInfo",
              "Hourly weather measurements from a local station — temperature, humidity, wind and precipitation. Used to compute the Fire Weather Index for this area. Upload an Excel or CSV export; if omitted, the bundled regional weather data is used."
            )}
            icon={CloudRain}
            fileName={ctx.state.stationDataName}
            error={ctx.state.stationDataError}
            onSelect={(f) => ctx.actions.setStationDataFile(f)}
          />
        </div>
      </div>
    </LayerShell>
  );
};
