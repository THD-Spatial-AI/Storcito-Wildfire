import { useEffect, useMemo, useState, type ChangeEvent, type FC } from "react";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Sparkles, X, Play, RotateCcw } from "lucide-react";
import area from "@turf/area";
import length from "@turf/length";
import { polygon, lineString } from "@turf/helpers";

import { Button } from "@spatialhub/ui";
import { cn } from "@/lib/utils";
import { settingsService } from "@/features/settings/services/settings";
import { dateRangeHasOnlyAvailableDates } from "@/features/configurator/utils/dateAvailability";
import { ringWithinFootprint } from "@/features/configurator/utils/dtmFootprint";
import type { AreaSelectState, AreaSelectActions } from "@/features/configurator/types/area-select";

import {
    LAYERS,
    LAYER_COUNT,
    Layer1ModelInit,
    Layer2AreaSelect,
    Layer4OptionalLayers,
    Layer5FinalReview,
    Layer6SaveCalculate,
    type ConfiguratorContext,
    type AreaStats,
    type DateBounds,
} from "./layers";

interface LayerStepperProps {
    state: AreaSelectState;
    actions: AreaSelectActions;
    allPolygonsCount: number;
    handleModelNameChange: (e: ChangeEvent<HTMLInputElement>) => void;
    getDateBounds: () => DateBounds;
    editMode: boolean;
    polygonCoordinates?: [number, number][][];
    onStepChange?: (step: number) => void;
    tourRequestedStep?: number | null;
    onTourStepHandled?: () => void;
}

interface StepLayout {
    panel: string;
    body: string;
    nav: string;
}

const getStepLayout = (step: number): StepLayout => {
    // Docked flush against the sidebar (top-left), sized to its content (not full
    // height), only the right edge rounded so it reads as part of the navigation.
    const basePanel = "left-0 top-0 max-h-full max-w-[calc(100vw-1.5rem)] rounded-r-2xl";

    switch (step) {
        case 1:
            return {
                panel: cn(basePanel, "w-[300px]"),
                body: "px-4 py-4",
                nav: "px-3 py-2",
            };
        case 2:
            return {
                panel: cn(basePanel, "w-[300px]"),
                body: "px-3 py-3",
                nav: "px-3 py-2",
            };
        case 4:
        case 5:
            return {
                panel: cn(basePanel, "w-[300px]"),
                body: "px-4 py-3",
                nav: "px-3 py-2",
            };
        default:
            return {
                panel: cn(basePanel, "w-[300px]"),
                body: "px-4 py-4",
                nav: "px-3 py-2",
            };
    }
};

const isTruthySetting = (value: unknown) => value === true || value === "true" || value === 1 || value === "1";

export const LayerStepper: FC<LayerStepperProps> = ({
    state,
    actions,
    allPolygonsCount,
    handleModelNameChange,
    getDateBounds,
    editMode,
    polygonCoordinates = [],
    onStepChange,
    tourRequestedStep,
    onTourStepHandled,
}) => {
    const [hasStarted, setHasStarted] = useState<boolean>(editMode);
    const [introPreferenceLoading, setIntroPreferenceLoading] = useState<boolean>(() => !editMode);
    const [dismissIntroCard, setDismissIntroCard] = useState(false);
    const [isSavingIntroPreference, setIsSavingIntroPreference] = useState(false);
    const [step, setStep] = useState<number>(1);
    const [completed, setCompleted] = useState<Set<number>>(
        () => (editMode ? new Set(LAYERS.map((l) => l.id)) : new Set()),
    );

    const { optionalLayers } = state;
    const { toggleOptionalLayer } = actions;

    useEffect(() => {
        if (editMode) return;
        let cancelled = false;

        (async () => {
            try {
                const data = (await settingsService.getAllSettings()) as Record<string, unknown>;
                if (cancelled) return;

                if (isTruthySetting(data.model_intro_card_dismissed)) {
                    setDismissIntroCard(true);
                    setHasStarted(true);
                }
            } catch {
                /* Keep showing the intro card if settings cannot be loaded. */
            } finally {
                if (!cancelled) setIntroPreferenceLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [editMode]);

    useEffect(() => {
        onStepChange?.(hasStarted ? step : 0);
    }, [hasStarted, onStepChange, step]);

    useEffect(() => {
        if (tourRequestedStep == null) return;

        const requestedStep = Math.min(Math.max(tourRequestedStep, 1), LAYER_COUNT);
        setHasStarted(true);
        setStep(requestedStep);
        onTourStepHandled?.();
    }, [onTourStepHandled, tourRequestedStep]);

    const areaStats = useMemo<AreaStats | null>(() => {
        if (polygonCoordinates.length === 0) return null;
        const { totalArea, totalPerimeter } = polygonCoordinates.reduce(
            (acc, coords) => {
                if (!coords || coords.length < 3) return acc;
                try {
                    const closed = [...coords, coords[0]];
                    const poly = polygon([closed]);
                    const areaM2 = area(poly);
                    const perimeterKm = length(lineString(closed), { units: "kilometers" });
                    return {
                        totalArea: acc.totalArea + areaM2,
                        totalPerimeter: acc.totalPerimeter + perimeterKm * 1000,
                    };
                } catch {
                    return acc;
                }
            },
            { totalArea: 0, totalPerimeter: 0 },
        );
        if (totalArea === 0) return null;
        const formatArea = (m2: number) =>
            m2 >= 1_000_000
                ? `${(m2 / 1_000_000).toFixed(2)} km²`
                : m2 >= 10_000
                    ? `${(m2 / 10_000).toFixed(2)} ha`
                    : `${m2.toFixed(0)} m²`;
        const formatPerimeter = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`);
        return { area: formatArea(totalArea), perimeter: formatPerimeter(totalPerimeter), regions: polygonCoordinates.length };
    }, [polygonCoordinates]);

    const ctx: ConfiguratorContext = {
        state,
        actions,
        allPolygonsCount,
        polygonCoordinates,
        areaStats,
        editMode,
        handleModelNameChange,
        getDateBounds,
        optionalLayers,
        toggleOptionalLayer,
    };

    const blockingReason = useMemo<string | null>(() => {
        switch (step) {
            case 1: {
                const missing: string[] = [];
                if (!state.modelName.trim()) missing.push("a model name");
                if (!state.fromDate || !state.toDate) missing.push("a start and end date");
                if (state.calculationMode === "static" && state.isLoadingStaticDates) {
                    return "Loading available static dates.";
                }
                if (state.calculationMode === "static" && state.staticDatesError) {
                    return state.staticDatesError;
                }
                if (state.calculationMode === "static" && state.availableStaticDates.length === 0) {
                    return "No static dates are currently available.";
                }
                if (state.calculationMode === "static" && state.fromDate && state.toDate && state.fromDate !== state.toDate) {
                    return "Static mode requires the same start and end date.";
                }
                if (state.calculationMode === "static" && state.fromDate && !state.availableStaticDates.includes(state.fromDate)) {
                    return "Select an available static date.";
                }
                if (state.calculationMode === "dynamic" && state.isLoadingDynamicDates) {
                    return "Loading available dynamic dates.";
                }
                if (state.calculationMode === "dynamic" && state.dynamicDatesError) {
                    return state.dynamicDatesError;
                }
                if (state.calculationMode === "dynamic" && state.availableDynamicDates.length === 0) {
                    return "No dynamic dates are currently available.";
                }
                if (state.calculationMode === "dynamic" && state.fromDate && state.toDate && state.fromDate > state.toDate) {
                    return "Dynamic mode requires the start date to be before or equal to the end date.";
                }
                if (
                    state.calculationMode === "dynamic" &&
                    state.fromDate &&
                    state.toDate &&
                    !dateRangeHasOnlyAvailableDates(state.fromDate, state.toDate, state.availableDynamicDates)
                ) {
                    return "Select a fully available dynamic date range.";
                }
                return missing.length ? `Please add ${missing.join(" and ")} to continue.` : null;
            }
            case 2:
                if (allPolygonsCount === 0) {
                    return state.areaInputMode === "upload"
                        ? "Upload a GeoJSON boundary file or switch back to draw."
                        : "Draw an area on the map to continue.";
                }
                if (state.areaInputMode === "upload" && !state.uploadedGeoJsonName) {
                    return "Upload a GeoJSON boundary file or switch back to draw.";
                }
                return null;
            case 3:
                if (
                    state.dtmFootprint &&
                    polygonCoordinates.length > 0 &&
                    !polygonCoordinates.every((ring) => ringWithinFootprint(ring, state.dtmFootprint!))
                ) {
                    return "Your area is outside the uploaded DTM coverage. Move/redraw it within the DTM footprint shown on the map, or remove the DTM.";
                }
                return null;
            default:
                return null;
        }
    }, [
        step,
        state.modelName,
        state.fromDate,
        state.toDate,
        state.calculationMode,
        state.availableStaticDates,
        state.availableDynamicDates,
        state.isLoadingStaticDates,
        state.isLoadingDynamicDates,
        state.staticDatesError,
        state.dynamicDatesError,
        state.areaInputMode,
        state.uploadedGeoJsonName,
        allPolygonsCount,
    ]);

    const canAdvance = blockingReason === null;
    const finalDisabled =
        !state.fromDate ||
        !state.toDate ||
        !state.modelName.trim() ||
        (state.calculationMode === "static" && state.fromDate !== state.toDate) ||
        (state.calculationMode === "static" &&
            (state.isLoadingStaticDates ||
                Boolean(state.staticDatesError) ||
                !state.availableStaticDates.includes(state.fromDate))) ||
        (state.calculationMode === "dynamic" &&
            (state.fromDate > state.toDate ||
                state.isLoadingDynamicDates ||
                Boolean(state.dynamicDatesError) ||
                !dateRangeHasOnlyAvailableDates(state.fromDate, state.toDate, state.availableDynamicDates))) ||
        state.isSaving ||
        allPolygonsCount === 0 ||
        (state.areaInputMode === "upload" && !state.uploadedGeoJsonName);

    const goNext = () => {
        if (!canAdvance) return;
        setCompleted((prev) => new Set(prev).add(step));
        setStep((s) => Math.min(LAYER_COUNT, s + 1));
    };

    const goBack = () => setStep((s) => Math.max(1, s - 1));

    const jumpTo = (id: number) => {
        if (id === step) return;
        if (editMode || id < step || completed.has(id)) {
            setStep(id);
        }
    };

    const restartModelTour = () => {
        globalThis.dispatchEvent(new CustomEvent("restart-area-select-tour"));
    };

    const handleIntroPreferenceChange = (checked: boolean) => {
        setDismissIntroCard(checked);
        setIsSavingIntroPreference(true);
        void settingsService.setModelIntroCardDismissed(checked).finally(() => {
            setIsSavingIntroPreference(false);
        });
    };

    const handleIntroStart = () => {
        if (dismissIntroCard) {
            void settingsService.setModelIntroCardDismissed(true);
        }
        setHasStarted(true);
    };

    if (introPreferenceLoading && !hasStarted) {
        return null;
    }

    if (!hasStarted) {
        return (
            <IntroCard
                onStart={handleIntroStart}
                onCancel={actions.handleCancel}
                dismissIntroCard={dismissIntroCard}
                isSavingPreference={isSavingIntroPreference}
                onDismissIntroPreferenceChange={handleIntroPreferenceChange}
            />
        );
    }

    const currentLayer = LAYERS[step - 1];

    const progressPercent = Math.round((step / LAYER_COUNT) * 100);
    const layout = getStepLayout(step);

    return (
        <div
            data-tour="configurator-panel"
            className={cn(
                "pointer-events-auto absolute z-30 flex flex-col overflow-hidden border border-border bg-background/98 shadow-xl backdrop-blur dark:bg-gray-900/98",
                layout.panel,
            )}
        >
            {/* Header */}
            <div className="relative border-b border-border bg-background px-4 py-3 dark:bg-gray-900">
                <button
                    type="button"
                    onClick={restartModelTour}
                    className="absolute right-10 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Restart guided tour"
                    title="Restart guided tour"
                    data-tour="restart-model-tour"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={actions.handleCancel}
                    className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Cancel"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="mb-3 flex items-center gap-2 pr-16">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                        {currentLayer.icon}
                    </span>
                    <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Step {step} of {LAYER_COUNT}
                        </div>
                        <h2 className="truncate text-base font-semibold leading-tight text-foreground">
                            {currentLayer.title}
                        </h2>
                    </div>
                </div>

                <div className="mb-2 flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-muted-foreground">{currentLayer.subtitle}</span>
                    <span className="font-medium tabular-nums text-foreground">{progressPercent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-foreground transition-all"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            <nav
                className={cn("border-b border-border bg-muted/25", layout.nav)}
                aria-label="Configurator layers"
                data-tour="configurator-steps"
            >
                <ol className="flex items-center">
                    {LAYERS.map((l, idx) => {
                        const done = completed.has(l.id) && l.id !== step;
                        const isCurrent = l.id === step;
                        const reachable = editMode || l.id <= step || completed.has(l.id);
                        const connectorActive = completed.has(l.id) || l.id < step;
                        return (
                            <li key={l.id} className={cn("flex items-center", idx < LAYERS.length - 1 && "flex-1")}>
                                <button
                                    type="button"
                                    onClick={() => reachable && jumpTo(l.id)}
                                    disabled={!reachable}
                                    title={`${l.id}. ${l.title}`}
                                    className={cn(
                                        "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                                        isCurrent && "bg-foreground text-background ring-4 ring-foreground/15",
                                        done && "bg-foreground text-background hover:bg-foreground/90",
                                        !isCurrent && !done && reachable && "border-2 border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                                        !isCurrent && !done && !reachable && "cursor-not-allowed border-2 border-dashed border-border bg-background text-muted-foreground/40",
                                    )}
                                    aria-current={isCurrent ? "step" : undefined}
                                    aria-label={`Step ${l.id}: ${l.title}`}
                                >
                                    {done ? <CheckCircle2 className="h-4 w-4" /> : l.id}
                                </button>
                                {idx < LAYERS.length - 1 && (
                                    <span
                                        className={cn(
                                            "mx-1.5 h-0.5 flex-1 rounded-full transition-colors",
                                            connectorActive ? "bg-foreground" : "bg-border",
                                        )}
                                    />
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>

            {/* Body (scrollable) */}
            <section className={cn("overflow-y-auto", layout.body)}>
                {step === 1 && <Layer1ModelInit ctx={ctx} />}
                {step === 2 && <Layer2AreaSelect ctx={ctx} />}
                {step === 3 && <Layer4OptionalLayers ctx={ctx} />}
                {step === 4 && <Layer5FinalReview ctx={ctx} />}
                {step === 5 && <Layer6SaveCalculate ctx={ctx} />}
            </section>

            {/* Footer */}
            <div className="border-t border-border bg-background px-4 py-3 dark:bg-gray-900">
                {blockingReason && (
                    <p
                        className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-700 dark:text-amber-300"
                        data-tour="blocking-status"
                    >
                        {blockingReason}
                    </p>
                )}
                <div className="flex items-center justify-between gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goBack}
                        disabled={step === 1}
                        className="h-9 cursor-pointer text-xs"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </Button>

                    {step < LAYER_COUNT ? (
                        <Button size="sm" onClick={goNext} disabled={!canAdvance} className="h-9 cursor-pointer text-xs">
                            Continue <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => actions.handleSave({ runAfterSave: false })}
                                disabled={finalDisabled}
                                className="h-9 cursor-pointer text-xs"
                            >
                                {state.isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {editMode ? "Update" : "Save"}
                                    </>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => actions.handleSave({ runAfterSave: true })}
                                disabled={finalDisabled}
                                className="h-9 cursor-pointer border-0 bg-foreground text-xs text-background hover:bg-foreground/90"
                                data-tour="save-button"
                            >
                                {state.isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-3.5 h-3.5" />
                                        Save & run
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────────
// Intro card – shown before the user starts the configurator so they know
// what creating a model entails before they begin.
// ────────────────────────────────────────────────────────────────────────────

const IntroCard: FC<{
    onStart: () => void;
    onCancel: () => void;
    dismissIntroCard: boolean;
    isSavingPreference: boolean;
    onDismissIntroPreferenceChange: (checked: boolean) => void;
}> = ({ onStart, onCancel, dismissIntroCard, isSavingPreference, onDismissIntroPreferenceChange }) => (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative w-[min(760px,100%)] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl dark:bg-gray-900">

            {/* Header */}
            <div className="relative px-7 pt-7 pb-5">
                <div className="flex items-start gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-lg ring-1 ring-foreground/10">
                        <Sparkles className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                            New wildfire model
                        </div>
                        <h2 className="mt-0.5 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
                            Let's set up your simulation
                        </h2>
                        <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
                            Six guided steps to define your area, validate inputs and launch a wildfire-risk simulation.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Close"
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Steps grid */}
            <div className="relative border-t border-border/60 bg-muted/30 px-7 py-5 dark:bg-gray-800/30">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {LAYERS.map((l) => (
                        <div
                            key={l.id}
                            className="group relative flex items-start gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 transition hover:border-foreground/40 hover:shadow-sm dark:bg-gray-900"
                        >
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground transition group-hover:bg-foreground group-hover:text-background">
                                {l.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                        STEP {l.id}
                                    </span>
                                </div>
                                <div className="truncate text-[13px] font-semibold leading-tight text-foreground">
                                    {l.title}
                                </div>
                                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                    {l.subtitle}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="relative flex items-center justify-between gap-3 border-t border-border/60 px-7 py-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Your progress is saved as you go
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-foreground">
                        <input
                            type="checkbox"
                            checked={dismissIntroCard}
                            onChange={(event) => onDismissIntroPreferenceChange(event.target.checked)}
                            className="h-3.5 w-3.5 rounded border-border accent-foreground"
                        />
                        <span>Don't show this intro again</span>
                        {isSavingPreference && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onCancel} className="cursor-pointer text-xs">
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={onStart}
                        className="cursor-pointer border-0 bg-foreground text-background hover:bg-foreground/90"
                    >
                        Get started <ChevronRight className="ml-0.5 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
);
