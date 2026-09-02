import type { FC, ReactNode } from "react";
import { Info, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";

import { LayerShell } from "./shared/LayerShell";
import type { ConfiguratorContext } from "./types";

const Row: FC<{ label: string; value: ReactNode; index?: number; info?: string }> = ({
    label,
    value,
    index = 0,
    info,
}) => (
    <div
        style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
        className="md-row-in min-w-0 rounded-md border border-border bg-background px-2.5 py-2 transition-colors duration-150 hover:bg-muted/40"
    >
        <span className="flex items-center gap-1 text-muted-foreground">
            {label}
            {info && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label={info}
                            className="text-muted-foreground transition-colors duration-150 hover:text-foreground focus:outline-none"
                        >
                            <Info className="h-3 w-3" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[240px] text-xs">{info}</TooltipContent>
                </Tooltip>
            )}
        </span>
        <span className="mt-0.5 block truncate font-medium text-foreground">{value || "—"}</span>
    </div>
);

export const Layer6SaveCalculate: FC<{ ctx: ConfiguratorContext }> = ({ ctx }) => {
    const { t } = useTranslation();
    const { state, optionalLayers, allPolygonsCount, areaStats } = ctx;
    // Translated layer labels.
    const layerLabelKeys: Record<string, string> = {
        weather_overlay: "configurator.layer3.fwiLabel",
        terrain_analysis: "configurator.layer3.terrainLabel",
        historical_fires: "configurator.layer3.historicalLabel",
    };
    const activeMods = Object.entries(optionalLayers)
        .filter(([, v]) => v)
        .map(([k]) => (layerLabelKeys[k] ? t(layerLabelKeys[k]) : k.replace(/_/g, " ")));

    return (
        <LayerShell purpose={t("configurator.layer5.purpose", "Review the model setup before saving. The calculation will use the selected dates, area and data source choices.")}>
            <div data-tour="save-run-summary" className="space-y-3">
                <div className="md-fade-in flex items-start gap-2 text-xs text-foreground">
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                    <p>
                        {t("configurator.layer5.looksGood", "Everything looks good? Hit ")}
                        <span className="font-semibold">{t("configurator.stepper.saveAndRun", "Save & run")}</span>
                        {t("configurator.layer5.below", " below.")}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <Row index={0} label={t("configurator.layer5.labels.modelName", "Model name")} value={state.modelName} />
                    <Row index={1} label={t("configurator.layer5.labels.from", "From")} value={state.fromDate} />
                    <Row index={2} label={t("configurator.layer5.labels.to", "To")} value={state.toDate} />
                    <Row
                        index={3}
                        label={t("configurator.layer5.labels.mode", "Mode")}
                        value={
                            state.calculationMode === "static"
                                ? t("configurator.layer1.calcModeStatic", "Static")
                                : t("configurator.layer1.calcModeDynamic", "Dynamic")
                        }
                    />
                    <Row
                        index={4}
                        label={t("configurator.layer5.labels.dailyRun", "Daily run")}
                        value="16:00-17:00"
                        info={t(
                            "configurator.layer5.dailyRunInfo",
                            "Every simulated day is assessed with the weather from this window — the hottest, driest part of the afternoon."
                        )}
                    />
                    <Row index={5} label={t("configurator.layer5.labels.buffer", "Buffer")} value={`${state.bufferDistance} m`} />
                    <Row
                        index={6}
                        label={t("configurator.layer5.labels.area", "Area")}
                        value={state.areaInputMode === "region" && state.selectedRegionName
                            ? `${state.selectedRegionName} · ${areaStats?.area ?? "—"}`
                            : areaStats?.area ?? (allPolygonsCount > 0 ? t("configurator.layer5.drawn", "drawn") : t("configurator.layer5.notDrawn", "not drawn"))}
                    />
                    <Row index={7} label={t("configurator.layer5.labels.riskComponents", "Risk components")} value={activeMods.length ? activeMods.join(", ") : t("configurator.layer5.coreOnly", "core only (veg + infra)")} />
                </div>
            </div>
        </LayerShell>
    );
};
