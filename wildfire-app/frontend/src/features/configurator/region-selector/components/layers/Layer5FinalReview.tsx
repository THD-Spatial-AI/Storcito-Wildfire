import type { FC, ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateRangeHasOnlyAvailableDates } from "@/features/configurator/utils/dateAvailability";
import { useTranslation } from "@/i18n";
import { LayerShell } from "./shared/LayerShell";
import type { ConfiguratorContext } from "./types";

type CheckStatus = "pass" | "warn" | "fail";

interface CheckResult {
    label: string;
    status: CheckStatus;
    detail: ReactNode;
}

const ICONS: Record<CheckStatus, FC<{ className?: string }>> = {
    pass: CheckCircle2,
    warn: AlertTriangle,
    fail: XCircle,
};

const TONES: Record<CheckStatus, string> = {
    pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    fail: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
};

const buildChecks = (ctx: ConfiguratorContext, t: (key: string, data?: any) => string): CheckResult[] => {
    const { state, allPolygonsCount, areaStats, optionalLayers } = ctx;
    const checks: CheckResult[] = [];

    checks.push(
        state.modelName.trim()
            ? { label: t("configurator.layer4.labels.modelName", "Model name"), status: "pass", detail: state.modelName.trim() }
            : { label: t("configurator.layer4.labels.modelName", "Model name"), status: "fail", detail: t("configurator.layer4.missingModelName", "Missing — go back to Step 1.") },
    );

    if (!state.fromDate || !state.toDate) {
        checks.push({ label: t("configurator.layer4.labels.timeframe", "Timeframe"), status: "fail", detail: t("configurator.layer4.missingDates", "Start or end date missing.") });
    } else if (state.calculationMode === "static") {
        if (state.isLoadingStaticDates) {
            checks.push({ label: t("configurator.layer4.labels.timeframe", "Timeframe"), status: "warn", detail: t("configurator.layer4.loadingStatic", "Loading available static dates…") });
        } else if (state.staticDatesError) {
            checks.push({ label: t("configurator.layer4.labels.timeframe", "Timeframe"), status: "fail", detail: state.staticDatesError });
        } else if (state.fromDate !== state.toDate) {
            checks.push({ label: t("configurator.layer4.labels.timeframe", "Timeframe"), status: "fail", detail: t("configurator.layer4.staticSingleDate", "Static mode requires a single date.") });
        } else if (!state.availableStaticDates.includes(state.fromDate)) {
            checks.push({
                label: t("configurator.layer4.labels.timeframe", "Timeframe"),
                status: "fail",
                detail: t("configurator.layer4.staticNotInWindow", { date: state.fromDate, defaultValue: `Date ${state.fromDate} is not in the available static dates window.` }),
            });
        } else {
            checks.push({ label: t("configurator.layer4.labels.timeframe", "Timeframe"), status: "pass", detail: t("configurator.layer4.staticRunOn", { date: state.fromDate, defaultValue: `Static run on ${state.fromDate}.` }) });
        }
    } else {
        if (state.isLoadingDynamicDates) {
            checks.push({ label: t("configurator.layer4.labels.timeframe", "Timeframe"), status: "warn", detail: t("configurator.layer4.loadingDynamic", "Loading available dynamic dates…") });
        } else if (state.dynamicDatesError) {
            checks.push({ label: t("configurator.layer4.labels.timeframe", "Timeframe"), status: "fail", detail: state.dynamicDatesError });
        } else if (state.fromDate > state.toDate) {
            checks.push({ label: t("configurator.layer4.labels.timeframe", "Timeframe"), status: "fail", detail: t("configurator.layer4.dynamicRequiresBefore", "Dynamic mode requires start before end.") });
        } else if (!dateRangeHasOnlyAvailableDates(state.fromDate, state.toDate, state.availableDynamicDates)) {
            checks.push({
                label: t("configurator.layer4.labels.timeframe", "Timeframe"),
                status: "fail",
                detail: t("configurator.layer4.dynamicUnavailableDates", "The selected dynamic date range contains unavailable dates."),
            });
        } else {
            checks.push({
                label: t("configurator.layer4.labels.timeframe", "Timeframe"),
                status: "pass",
                detail: t("configurator.layer4.dynamicRange", { start: state.fromDate, end: state.toDate, defaultValue: `Dynamic ${state.fromDate} → ${state.toDate}.` }),
            });
        }
    }

    if (state.areaInputMode === "region" && state.isResolvingRegion) {
        checks.push({
            label: t("configurator.layer4.labels.areaOfInterest", "Area of interest"),
            status: "warn",
            detail: t("configurator.layer2.regionResolving", "Finding administrative boundary…"),
        });
    } else if (allPolygonsCount === 0) {
        checks.push({
            label: t("configurator.layer4.labels.areaOfInterest", "Area of interest"),
            status: "fail",
            detail:
                state.areaInputMode === "upload"
                    ? t("configurator.layer4.noGeoJson", "No GeoJSON uploaded.")
                    : state.areaInputMode === "region"
                      ? state.regionSelectionError ?? t("configurator.layer4.noRegionSelected", "No administrative region selected.")
                      : t("configurator.layer4.noPolygon", "No polygon drawn on the map."),
        });
    } else if (state.areaInputMode === "upload" && !state.uploadedGeoJsonName) {
        checks.push({ label: t("configurator.layer4.labels.areaOfInterest", "Area of interest"), status: "fail", detail: t("configurator.layer4.uploadIncomplete", "GeoJSON upload incomplete.") });
    } else if (state.areaInputMode === "region" && !state.selectedRegionName) {
        checks.push({ label: t("configurator.layer4.labels.areaOfInterest", "Area of interest"), status: "fail", detail: t("configurator.layer4.noRegionSelected", "No administrative region selected.") });
    } else {
        checks.push({
            label: t("configurator.layer4.labels.areaOfInterest", "Area of interest"),
            status: "pass",
            detail: state.areaInputMode === "region"
                ? t("configurator.layer4.selectedRegionDetails", {
                    name: state.selectedRegionName,
                    area: areaStats?.area ?? "—",
                    defaultValue: `${state.selectedRegionName} · ${areaStats?.area ?? "—"}`,
                })
                : allPolygonsCount === 1
                  ? t("configurator.layer4.areaDetailsSingle", { area: areaStats?.area ?? "—", defaultValue: `1 region · ${areaStats?.area ?? "—"}` })
                  : t("configurator.layer4.areaDetails", { count: allPolygonsCount, area: areaStats?.area ?? "—", defaultValue: `${allPolygonsCount} regions · ${areaStats?.area ?? "—"}` }),
        });
    }

    const active = (Object.keys(optionalLayers) as (keyof typeof optionalLayers)[]).filter(
        (k) => optionalLayers[k],
    );
    if (!optionalLayers.weather_overlay) {
        checks.push({
            label: t("configurator.layer4.labels.riskComponents", "Risk components"),
            status: "warn",
            detail: t("configurator.layer4.weatherDisabledWarn", "Fire-weather (FWI) is disabled — risk will be significantly under-estimated and the date becomes irrelevant."),
        });
    } else if (active.length === 3) {
        checks.push({
            label: t("configurator.layer4.labels.riskComponents", "Risk components"),
            status: "pass",
            detail: t("configurator.layer4.allSignalsActive", "All risk signals active (weather + terrain + history)."),
        });
    } else {
        checks.push({
            label: t("configurator.layer4.labels.riskComponents", "Risk components"),
            status: "warn",
            detail: t("configurator.layer4.someSignalsActive", { count: active.length, defaultValue: `Running with ${active.length} of 3 optional signals — output will differ from the full model.` }),
        });
    }

    checks.push({
        label: t("configurator.layer4.labels.bufferDistance", "Buffer distance"),
        status: state.bufferDistance >= 0 ? "pass" : "fail",
        detail: t("configurator.layer4.bufferDistance", { buffer: state.bufferDistance, defaultValue: `${state.bufferDistance} m around the AOI.` }),
    });

    return checks;
};

export const Layer5FinalReview: FC<{ ctx: ConfiguratorContext }> = ({ ctx }) => {
    const { t } = useTranslation();
    const checks = buildChecks(ctx, t);
    const failed = checks.filter((c) => c.status === "fail").length;
    const warned = checks.filter((c) => c.status === "warn").length;

    const summary =
        failed > 0
            ? (failed === 1 ? t("configurator.layer4.blockersSingle", "1 blocker — fix before running.") : t("configurator.layer4.blockers", `${failed} blockers — fix before running.`, { count: failed }))
            : warned > 0
              ? (warned === 1 ? t("configurator.layer4.warningsSingle", "1 warning — review before running.") : t("configurator.layer4.warnings", `${warned} warnings — review before running.`, { count: warned }))
              : t("configurator.layer4.allPassed", "All checks passed. Ready to save & calculate.");

    const summaryTone: CheckStatus = failed > 0 ? "fail" : warned > 0 ? "warn" : "pass";

    return (
        <LayerShell
            purpose={t("configurator.layer4.purpose", "Real-time validation of the model configuration. Blockers must be cleared in their respective steps before the run can start.")}
            nextStepHint={t("configurator.layer4.nextStepHint", "Then you'll save the model and kick off the calculation.")}
        >
            <div data-tour="final-review">
                <div
                    className={cn(
                        "md-fade-in mb-3 rounded-lg border px-3 py-2 text-[11px] font-medium leading-snug transition-colors duration-300",
                        TONES[summaryTone],
                    )}
                >
                    {summary}
                </div>
                <ul className="space-y-1.5">
                    {checks.map((c, index) => {
                        const Icon = ICONS[c.status];
                        return (
                            <li
                                key={c.label}
                                style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
                                className="md-row-in flex items-start gap-2.5 rounded-md border border-border bg-background px-2.5 py-2 transition-colors duration-150 hover:bg-muted/40"
                            >
                                <Icon
                                    className={cn(
                                        "mt-0.5 h-4 w-4 shrink-0",
                                        c.status === "pass" && "text-emerald-500",
                                        c.status === "warn" && "text-amber-500",
                                        c.status === "fail" && "text-red-500",
                                    )}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-foreground">{c.label}</div>
                                    <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{c.detail}</div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </LayerShell>
    );
};
