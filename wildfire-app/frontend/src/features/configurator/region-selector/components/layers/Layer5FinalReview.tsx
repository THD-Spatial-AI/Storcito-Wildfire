import type { FC, ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateRangeHasOnlyAvailableDates } from "@/features/configurator/utils/dateAvailability";
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

const buildChecks = (ctx: ConfiguratorContext): CheckResult[] => {
    const { state, allPolygonsCount, areaStats, optionalLayers } = ctx;
    const checks: CheckResult[] = [];

    checks.push(
        state.modelName.trim()
            ? { label: "Model name", status: "pass", detail: state.modelName.trim() }
            : { label: "Model name", status: "fail", detail: "Missing — go back to Step 1." },
    );

    if (!state.fromDate || !state.toDate) {
        checks.push({ label: "Timeframe", status: "fail", detail: "Start or end date missing." });
    } else if (state.calculationMode === "static") {
        if (state.isLoadingStaticDates) {
            checks.push({ label: "Timeframe", status: "warn", detail: "Loading available static dates…" });
        } else if (state.staticDatesError) {
            checks.push({ label: "Timeframe", status: "fail", detail: state.staticDatesError });
        } else if (state.fromDate !== state.toDate) {
            checks.push({ label: "Timeframe", status: "fail", detail: "Static mode requires a single date." });
        } else if (!state.availableStaticDates.includes(state.fromDate)) {
            checks.push({
                label: "Timeframe",
                status: "fail",
                detail: `Date ${state.fromDate} is not in the available static dates window.`,
            });
        } else {
            checks.push({ label: "Timeframe", status: "pass", detail: `Static run on ${state.fromDate}.` });
        }
    } else {
        if (state.isLoadingDynamicDates) {
            checks.push({ label: "Timeframe", status: "warn", detail: "Loading available dynamic dates…" });
        } else if (state.dynamicDatesError) {
            checks.push({ label: "Timeframe", status: "fail", detail: state.dynamicDatesError });
        } else if (state.fromDate > state.toDate) {
            checks.push({ label: "Timeframe", status: "fail", detail: "Dynamic mode requires start before end." });
        } else if (!dateRangeHasOnlyAvailableDates(state.fromDate, state.toDate, state.availableDynamicDates)) {
            checks.push({
                label: "Timeframe",
                status: "fail",
                detail: "The selected dynamic date range contains unavailable dates.",
            });
        } else {
            checks.push({
                label: "Timeframe",
                status: "pass",
                detail: `Dynamic ${state.fromDate} → ${state.toDate}.`,
            });
        }
    }

    if (allPolygonsCount === 0) {
        checks.push({
            label: "Area of interest",
            status: "fail",
            detail:
                state.areaInputMode === "upload"
                    ? "No GeoJSON uploaded."
                    : "No polygon drawn on the map.",
        });
    } else if (state.areaInputMode === "upload" && !state.uploadedGeoJsonName) {
        checks.push({ label: "Area of interest", status: "fail", detail: "GeoJSON upload incomplete." });
    } else {
        checks.push({
            label: "Area of interest",
            status: "pass",
            detail: `${allPolygonsCount} region${allPolygonsCount === 1 ? "" : "s"} · ${areaStats?.area ?? "—"}`,
        });
    }

    const active = (Object.keys(optionalLayers) as (keyof typeof optionalLayers)[]).filter(
        (k) => optionalLayers[k],
    );
    if (!optionalLayers.weather_overlay) {
        checks.push({
            label: "Risk components",
            status: "warn",
            detail: "Fire-weather (FWI) is disabled — risk will be significantly under-estimated and the date becomes irrelevant.",
        });
    } else if (active.length === 3) {
        checks.push({
            label: "Risk components",
            status: "pass",
            detail: "All risk signals active (weather + terrain + history).",
        });
    } else {
        checks.push({
            label: "Risk components",
            status: "warn",
            detail: `Running with ${active.length} of 3 optional signals — output will differ from the full model.`,
        });
    }

    checks.push({
        label: "Buffer distance",
        status: state.bufferDistance >= 0 ? "pass" : "fail",
        detail: `${state.bufferDistance} m around the AOI.`,
    });

    return checks;
};

export const Layer5FinalReview: FC<{ ctx: ConfiguratorContext }> = ({ ctx }) => {
    const checks = buildChecks(ctx);
    const failed = checks.filter((c) => c.status === "fail").length;
    const warned = checks.filter((c) => c.status === "warn").length;

    const summary =
        failed > 0
            ? `${failed} blocker${failed === 1 ? "" : "s"} — fix before running.`
            : warned > 0
              ? `${warned} warning${warned === 1 ? "" : "s"} — review before running.`
              : "All checks passed. Ready to save & calculate.";

    const summaryTone: CheckStatus = failed > 0 ? "fail" : warned > 0 ? "warn" : "pass";

    return (
        <LayerShell
            purpose="Real-time validation of the model configuration. Blockers must be cleared in their respective steps before the run can start."
            nextStepHint="Then you'll save the model and kick off the calculation."
        >
            <div data-tour="final-review">
                <div
                    className={cn(
                        "mb-3 rounded-lg border px-3 py-2 text-[11px] font-medium leading-snug",
                        TONES[summaryTone],
                    )}
                >
                    {summary}
                </div>
                <ul className="space-y-1.5">
                    {checks.map((c) => {
                        const Icon = ICONS[c.status];
                        return (
                            <li
                                key={c.label}
                                className="flex items-start gap-2.5 rounded-md border border-border bg-background px-2.5 py-2"
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
