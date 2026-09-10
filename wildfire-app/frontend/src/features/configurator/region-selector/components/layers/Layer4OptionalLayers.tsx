import type { FC } from "react";
import { CloudRain, Mountain, Flame, AlertCircle, Zap, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { LayerShell } from "./shared/LayerShell";
import { ChoiceCard, ChoiceCardGroup, QuestionSection } from "../wizard";
import { FileUploadField } from "./shared/FileUploadField";
import type { ConfiguratorContext, OptionalLayerKey } from "./types";

interface OptionalLayerItem {
  id: OptionalLayerKey;
  label: string;
  hint: string;
  icon: typeof CloudRain;
  weight: string;
  info: string;
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
      info: t(
        "configurator.layer3.fwiInfo",
        "The Fire Weather Index combines wind, relative humidity, temperature and drought into one measure of how readily a fire would start and spread. It carries the largest weight because weather changes fastest and drives fire behaviour most strongly."
      ),
    },
    {
      id: "terrain_analysis",
      label: t("configurator.layer3.terrainLabel", "Terrain & slope"),
      hint: t("configurator.layer3.terrainHint", "Elevation, slope and aspect influence on spread"),
      icon: Mountain,
      weight: t("configurator.layer3.terrainWeight", "6% weight"),
      info: t(
        "configurator.layer3.terrainInfo",
        "Slope, elevation and aspect shape how a fire moves: it accelerates uphill, and sun-facing slopes dry out faster. Derived from the digital terrain model for your area."
      ),
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
      info: t(
        "configurator.layer3.historicalInfo",
        "Where fires have burned before they tend to burn again, because the underlying causes — land use, access and ignition sources — persist. Based on recorded past fire incidents in the area."
      ),
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
        data-tour="precomputed-map"
        className={cn(
          "mb-3 rounded-xl border p-3 transition-all",
          precomputedOn
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                precomputedOn
                  ? "border-primary/40 text-primary bg-background/60"
                  : "border-border text-muted-foreground bg-background/40"
              )}
            >
              <Zap className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">
                {t("configurator.layer3.precomputedLabel", "Precomputed regional map")}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("configurator.layer3.precomputedInfoLabel", "About the precomputed regional map")}
                    className="cursor-pointer text-muted-foreground transition-colors duration-150 hover:text-foreground focus:outline-none"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] text-xs">
                  {t(
                    "configurator.layer3.precomputedInfo",
                    "Every night the whole region is analysed with all risk layers enabled. When your date is covered, your area's result is clipped from that map and arrives in seconds. Disable it (or toggle individual layers below) to compute every step specifically for your area (~1-2 minutes)."
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={precomputedOn}
            disabled={!precomputedAvailable}
            onClick={() => ctx.actions.setUsePrecomputed(!usePrecomputed)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
              precomputedAvailable ? "active:scale-95" : "cursor-not-allowed opacity-40",
              precomputedOn
                ? "bg-primary"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/40"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-card shadow-sm ring-1 ring-border transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                precomputedOn ? "translate-x-[18px]" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          {!precomputedAvailable
            ? calculationMode !== "dynamic"
              ? t(
                  "configurator.layer3.precomputedStaticMode",
                  "Precomputed maps exist only for dynamic assessments. The model will compute all steps for your area."
                )
              : fromDate !== toDate
                ? t(
                    "configurator.layer3.precomputedRange",
                    "Precomputed maps cover exactly one day - select the same start and end date to use one. For a date range the model computes every day for your area and returns the peak-risk day (~1-2 minutes)."
                  )
                : t(
                    "configurator.layer3.precomputedUnavailable",
                    "The nightly analysis has not processed this date yet. The model will compute all steps for your area."
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

      <QuestionSection
        index={1}
        title={t("configurator.layer3.signalsQuestion", "Which signals should feed the risk model?")}
      >
        <div data-tour="optional-layers">
          <ChoiceCardGroup columns={3}>
            {ITEMS.map((it) => (
              <ChoiceCard
                key={it.id}
                icon={<it.icon className="h-5 w-5" />}
                label={it.label}
                description={precomputedOn ? it.weight : `${it.weight} · ${it.hint}`}
                info={it.info}
                selected={ctx.optionalLayers[it.id]}
                disabled={precomputedOn}
                multiple
                onSelect={() => ctx.toggleOptionalLayer(it.id)}
              />
            ))}
          </ChoiceCardGroup>
          {precomputedOn && (
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {t(
                "configurator.layer3.lockedByPrecomputed",
                "Included in the precomputed regional map. Disable the precomputed switch above to customise layers."
              )}
            </p>
          )}
        </div>
      </QuestionSection>
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        {t(
          "configurator.layer3.coreSignalsNote",
          "Vegetation (NDVI) and infrastructure are always part of the model and cannot be switched off. Switching a signal above off removes its contribution from the weighting — the run continues with the remaining signals."
        )}
      </p>

      {weatherDisabled && (
        <div className="md-fade-in mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t(
              "configurator.layer3.weatherWarning",
              "Fire-weather is the main risk signal. Disabling it makes the date selection irrelevant and produces a drastically under-estimated risk map. Keep it on unless you specifically need a baseline without weather."
            )}
          </span>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4" data-tour="custom-data">
        <h4 className="text-xs font-semibold text-foreground">
          {t("configurator.layer3.customData", "Custom data (optional)")}
        </h4>
        <p className="mb-2 mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {t(
            "configurator.layer3.customDataDesc",
            "Bring your own weather inputs for this area. If left empty, the bundled regional data is used."
          )}
          {/* Uploaded in step 2. */}
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
