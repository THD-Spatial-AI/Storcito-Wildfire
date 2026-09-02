import { useEffect, useMemo, type ChangeEvent, type FC } from "react";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Sparkles, X, Play } from "lucide-react";
import { useTranslation } from "@/i18n";
import area from "@turf/area";
import length from "@turf/length";
import { polygon, lineString } from "@turf/helpers";

import { Button } from "@spatialhub/ui";
import { cn } from "@/lib/utils";
import { dateRangeHasOnlyAvailableDates } from "@/features/configurator/utils/dateAvailability";
import { ringWithinFootprint } from "@/features/configurator/utils/dtmFootprint";
import type { AreaSelectState, AreaSelectActions } from "@/features/configurator/types/area-select";
import type { WizardStepsApi } from "@/features/configurator/hooks/area-select/useWizardSteps";

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
import { MAP_STEP_PANEL_WIDTH, SIDEBAR_PANEL_WIDTH_CSS } from "./wizard";

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
    wizard: WizardStepsApi;
}

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
    wizard,
}) => {
    const {
        step,
        hasStarted,
        introPreferenceLoading,
        dismissIntroCard,
        isSavingIntroPreference,
        goNext: advance,
        goBack,
        start,
        setDismissIntroCard,
        setStep,
    } = wizard;

    const { optionalLayers } = state;
    const { toggleOptionalLayer } = actions;
    const { t } = useTranslation();

    useEffect(() => {
        onStepChange?.(hasStarted ? step : 0);
    }, [hasStarted, onStepChange, step]);

    useEffect(() => {
        if (tourRequestedStep == null) return;

        setStep(Math.min(Math.max(tourRequestedStep, 1), LAYER_COUNT));
        onTourStepHandled?.();
    }, [onTourStepHandled, setStep, tourRequestedStep]);

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
                if (!state.modelName.trim()) missing.push(t("configurator.blocking.modelName", "a model name"));
                if (!state.fromDate || !state.toDate) missing.push(t("configurator.blocking.dateRange", "a start and end date"));
                if (state.calculationMode === "static" && state.isLoadingStaticDates) {
                    return t("configurator.blocking.staticLoading", "Loading available static dates.");
                }
                if (state.calculationMode === "static" && state.staticDatesError) {
                    return state.staticDatesError;
                }
                if (state.calculationMode === "static" && state.availableStaticDates.length === 0) {
                    return t("configurator.blocking.staticEmpty", "No static dates are currently available.");
                }
                if (state.calculationMode === "static" && state.fromDate && state.toDate && state.fromDate !== state.toDate) {
                    return t("configurator.blocking.staticSameDate", "Static mode requires the same start and end date.");
                }
                if (state.calculationMode === "static" && state.fromDate && !state.availableStaticDates.includes(state.fromDate)) {
                    return t("configurator.blocking.staticUnavailable", "Select an available static date.");
                }
                if (state.calculationMode === "dynamic" && state.isLoadingDynamicDates) {
                    return t("configurator.blocking.dynamicLoading", "Loading available dynamic dates.");
                }
                if (state.calculationMode === "dynamic" && state.dynamicDatesError) {
                    return state.dynamicDatesError;
                }
                if (state.calculationMode === "dynamic" && state.availableDynamicDates.length === 0) {
                    return t("configurator.blocking.dynamicEmpty", "No dynamic dates are currently available.");
                }
                if (state.calculationMode === "dynamic" && state.fromDate && state.toDate && state.fromDate > state.toDate) {
                    return t("configurator.blocking.dynamicOrder", "Dynamic mode requires the start date to be before or equal to the end date.");
                }
                if (
                    state.calculationMode === "dynamic" &&
                    state.fromDate &&
                    state.toDate &&
                    !dateRangeHasOnlyAvailableDates(state.fromDate, state.toDate, state.availableDynamicDates)
                ) {
                    return t("configurator.blocking.dynamicRange", "Select a fully available dynamic date range.");
                }
                return missing.length
                    ? t("configurator.blocking.missingFields", {
                        missing: missing.join(t("configurator.blocking.and", " and ")),
                        defaultValue: `Please add ${missing.join(" and ")} to continue.`,
                    })
                    : null;
            }
            case 2:
                if (state.areaInputMode === "region" && state.isResolvingRegion) {
                    return t("configurator.layer2.regionResolving", "Finding administrative boundary…");
                }
                if (state.areaInputMode === "region" && (!state.selectedRegionName || allPolygonsCount === 0)) {
                    return state.regionSelectionError ?? t(
                        "configurator.layer2.blockingSelectRegion",
                        "Click inside an administrative region on the map to continue.",
                    );
                }
                if (allPolygonsCount === 0) {
                    return state.areaInputMode === "upload"
                        ? t("configurator.layer2.blockingUploadGeoJson", "Upload a GeoJSON boundary file or switch back to draw.")
                        : t("configurator.layer2.blockingDrawArea", "Draw an area on the map to continue.");
                }
                if (state.areaInputMode === "upload" && !state.uploadedGeoJsonName) {
                    return t("configurator.layer2.blockingUploadGeoJson", "Upload a GeoJSON boundary file or switch back to draw.");
                }
                return null;
            case 3:
                if (
                    state.dtmFootprint &&
                    polygonCoordinates.length > 0 &&
                    !polygonCoordinates.every((ring) => ringWithinFootprint(ring, state.dtmFootprint!))
                ) {
                    return t("configurator.blocking.dtmOutside", "Your area is outside the uploaded DTM coverage. Move/redraw it within the DTM footprint shown on the map, or remove the DTM.");
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
        state.selectedRegionName,
        state.isResolvingRegion,
        state.regionSelectionError,
        state.dtmFootprint,
        allPolygonsCount,
        polygonCoordinates,
        t,
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
        (state.areaInputMode === "upload" && !state.uploadedGeoJsonName) ||
        (state.areaInputMode === "region" && (state.isResolvingRegion || !state.selectedRegionName));

    const goNext = () => {
        if (!canAdvance) return;
        advance();
    };

    if (introPreferenceLoading && !hasStarted) {
        return null;
    }

    if (!hasStarted) {
        return (
            <IntroCard
                onStart={start}
                onCancel={actions.handleCancel}
                dismissIntroCard={dismissIntroCard}
                isSavingPreference={isSavingIntroPreference}
                onDismissIntroPreferenceChange={setDismissIntroCard}
            />
        );
    }

    const currentLayer = LAYERS[step - 1];

    const isMapStep = step === 2;
    // Map stays visible.
    const isMapSidebar = step > 2 && allPolygonsCount > 0;
    const showsMap = isMapStep || isMapSidebar;
    const panelWidth = isMapStep
        ? `${MAP_STEP_PANEL_WIDTH}px`
        : isMapSidebar
            ? SIDEBAR_PANEL_WIDTH_CSS
            : "100%";

    const body = (
        <>
            <header className={cn("md-rise", isMapStep ? "mb-3" : "mb-8 text-center")}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("configurator.stepper.stepOf", `Step ${step} of ${LAYER_COUNT}`, { step, total: LAYER_COUNT })}
                </p>
                <h2 className={cn("mt-1 font-semibold tracking-tight text-foreground", isMapStep ? "text-base" : "text-2xl")}>
                    {t(currentLayer.titleKey, currentLayer.title)}
                </h2>
                <p className={cn("mt-1 text-muted-foreground", isMapStep ? "text-[11px]" : "text-sm")}>
                    {t(currentLayer.subtitleKey, currentLayer.subtitle)}
                </p>
            </header>

            {/* Keyed for motion. */}
            <section key={step} className="md-rise">
                {step === 1 && <Layer1ModelInit ctx={ctx} />}
                {step === 2 && <Layer2AreaSelect ctx={ctx} />}
                {step === 3 && <Layer4OptionalLayers ctx={ctx} />}
                {step === 4 && <Layer5FinalReview ctx={ctx} />}
                {step === 5 && <Layer6SaveCalculate ctx={ctx} />}
            </section>
        </>
    );

    const footer = (
                <div className="border-t border-border bg-background px-4 py-3">
                    {blockingReason && (
                        <p
                            className="md-fade-in mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-700 dark:text-amber-300"
                            data-tour="blocking-status"
                        >
                            {blockingReason}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goBack}
                            disabled={step === 1}
                            className="h-9 cursor-pointer text-xs transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:hover:shadow-none disabled:active:scale-100"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> {t("configurator.stepper.back", "Back")}
                        </Button>

                        {step < LAYER_COUNT ? (
                            <Button size="sm" onClick={goNext} disabled={!canAdvance} className="h-9 cursor-pointer text-xs transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:hover:shadow-none disabled:active:scale-100">
                                {t("configurator.stepper.continue", "Continue")} <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                        ) : (
                            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => actions.handleSave({ runAfterSave: false })}
                                    disabled={finalDisabled}
                                    className="h-9 cursor-pointer text-xs transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:hover:shadow-none disabled:active:scale-100"
                                >
                                    {state.isSaving ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            {t("configurator.stepper.saving", "Saving...")}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {editMode ? t("configurator.stepper.update", "Update") : t("configurator.stepper.save", "Save")}
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => actions.handleSave({ runAfterSave: true })}
                                    disabled={finalDisabled}
                                    className="h-9 cursor-pointer border-0 bg-primary text-xs text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:hover:shadow-none disabled:active:scale-100"
                                    data-tour="save-button"
                                >
                                    {state.isSaving ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            {t("configurator.stepper.starting", "Starting...")}
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-3.5 h-3.5" />
                                            {t("configurator.stepper.saveAndRun", "Save & run")}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
    );

    // Animated width.
    return (
        <div
            data-tour="configurator-panel"
            style={{ width: panelWidth }}
            className={cn(
                "md-scope pointer-events-auto absolute left-0 top-0 z-30 flex h-full max-w-full flex-col overflow-hidden bg-background",
                "transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                showsMap && "border-r border-border shadow-xl",
            )}
        >
            <div className="flex-1 overflow-y-auto">
                <div
                    className={cn(
                        "w-full",
                        isMapStep ? "px-4 py-4" : "mx-auto max-w-3xl px-5 py-8 sm:px-8",
                    )}
                >
                    {body}
                </div>
            </div>
            <div className={cn("w-full shrink-0", !isMapStep && "mx-auto max-w-3xl px-5 pb-4 sm:px-8")}>
                {footer}
            </div>
        </div>
    );
};

// Intro card.

const IntroCard: FC<{
    onStart: () => void;
    onCancel: () => void;
    dismissIntroCard: boolean;
    isSavingPreference: boolean;
    onDismissIntroPreferenceChange: (checked: boolean) => void;
}> = ({ onStart, onCancel, dismissIntroCard, isSavingPreference, onDismissIntroPreferenceChange }) => {
    const { t } = useTranslation();
    return (
    <div className="md-scope pointer-events-auto absolute inset-0 z-30 flex items-center justify-center px-4">
        <div className="md-fade-in absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onCancel} />
        <div className="md-rise relative w-[min(760px,100%)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">

            {/* Header */}
            <div className="relative px-7 pt-7 pb-5">
                <div className="flex items-start gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                        <Sparkles className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                            {t("configurator.stepper.introTitle", "New wildfire model")}
                        </div>
                        <h2 className="mt-0.5 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
                            {t("configurator.stepper.introSubtitle", "Let's set up your simulation")}
                        </h2>
                        <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
                            {t("configurator.stepper.introDesc", "Six guided steps to define your area, validate inputs and launch a wildfire-risk simulation.")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label={t("common.close", "Close")}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Steps grid */}
            <div className="relative border-t border-border/60 bg-muted/30 px-7 py-5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {LAYERS.map((l, idx) => (
                        <div
                            key={l.id}
                            style={{ animationDelay: `${Math.min(idx * 30, 240)}ms` }}
                            className="md-row-in group relative flex items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition-colors duration-200 hover:border-foreground/40"
                        >
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                                {l.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                        {t("configurator.stepper.step", "STEP")} {l.id}
                                    </span>
                                </div>
                                <div className="truncate text-[13px] font-semibold leading-tight text-foreground">
                                    {t(l.titleKey, l.title)}
                                </div>
                                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                    {t(l.subtitleKey, l.subtitle)}
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
                        {t("configurator.stepper.introProgressSaved", "Your progress is saved as you go")}
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-foreground">
                        <input
                            type="checkbox"
                            checked={dismissIntroCard}
                            onChange={(event) => onDismissIntroPreferenceChange(event.target.checked)}
                            className="h-3.5 w-3.5 rounded border-border accent-foreground"
                        />
                        <span>{t("configurator.stepper.introDontShow", "Don't show this intro again")}</span>
                        {isSavingPreference && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onCancel} className="cursor-pointer text-xs transition-all duration-200 active:scale-[0.98]">
                        {t("configurator.stepper.introCancel", "Cancel")}
                    </Button>
                    <Button
                        size="sm"
                        onClick={onStart}
                        className="cursor-pointer border-0 bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
                    >
                        {t("configurator.stepper.introStart", "Get started")} <ChevronRight className="ml-0.5 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
);
};
