import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { DateRangePicker, Dialog, Group, Label, Popover, Button as Trigger } from "react-aria-components";
import { parseDate } from "@internationalized/date";
import { CalendarIcon, CalendarRange, Check, ChevronDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";

import { DateInput } from "@/components/ui/datefield-rac";
import { DATE_INPUT_STYLE } from "@/components/ui/datefield-rac.consts";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import { cn } from "@/lib/utils";
import { dateRangeHasOnlyAvailableDates } from "@/features/configurator/utils/dateAvailability";

import { LayerShell } from "./shared/LayerShell";
import { ChoiceCard, ChoiceCardGroup, QuestionSection } from "../wizard";
import type { ConfiguratorContext } from "./types";

function getStaticDateStatus(
    staticDatesError: string | undefined,
    isLoadingStaticDates: boolean,
    availableStaticDates: string[],
    t: (key: string, data?: any) => string
) {
    if (staticDatesError) return staticDatesError;
    if (isLoadingStaticDates) return t("configurator.layer1.staticLoading", "Loading available static dates...");
    if (availableStaticDates.length === 0) return t("configurator.layer1.staticEmpty", "No static dates available.");
    if (availableStaticDates.length === 1) return t("configurator.layer1.staticHottest", { date: availableStaticDates[0], defaultValue: `Highest-temperature static date: ${availableStaticDates[0]}` });
    return t("configurator.layer1.staticRange", { start: availableStaticDates[0], end: availableStaticDates.at(-1), defaultValue: `Available static dates: ${availableStaticDates[0]} to ${availableStaticDates.at(-1)}` });
}

function formatDateValue(value: { year: number; month: number; day: number }) {
    return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function getDynamicDateStatus(
    dynamicDatesError: string | undefined,
    isLoadingDynamicDates: boolean,
    availableDynamicDates: string[],
    fromDate: string,
    toDate: string,
    days: number,
    t: (key: string, data?: any) => string
) {
    if (dynamicDatesError) return dynamicDatesError;
    if (isLoadingDynamicDates) return t("configurator.layer1.dynamicLoading", "Loading available dynamic dates...");
    if (availableDynamicDates.length === 0) return t("configurator.layer1.dynamicEmpty", "No dynamic dates available.");
    if (fromDate && toDate && dateRangeHasOnlyAvailableDates(fromDate, toDate, availableDynamicDates)) {
        if (days === 1) return t("configurator.layer1.dynamicSelectedOne", { start: fromDate, end: toDate, defaultValue: `Selected range: ${fromDate} to ${toDate} (1 day).` });
        return t("configurator.layer1.dynamicSelected", { start: fromDate, end: toDate, days, defaultValue: `Selected range: ${fromDate} to ${toDate} (${days} days).` });
    }
    if (fromDate || toDate) {
        return t("configurator.layer1.dynamicSelectInside", { start: availableDynamicDates[0], end: availableDynamicDates.at(-1), defaultValue: `Select a range inside available dynamic dates: ${availableDynamicDates[0]} to ${availableDynamicDates.at(-1)}` });
    }
    return t("configurator.layer1.dynamicAvailable", { start: availableDynamicDates[0], end: availableDynamicDates.at(-1), defaultValue: `Available dynamic dates: ${availableDynamicDates[0]} to ${availableDynamicDates.at(-1)}` });
}

interface StaticDateDropdownProps {
    availableStaticDates: string[];
    isLoadingStaticDates: boolean;
    selectedDate: string;
    onSelectDate: (date: string) => void;
    t: (key: string, data?: any) => string;
}

const StaticDateDropdown: FC<StaticDateDropdownProps> = ({
    availableStaticDates,
    isLoadingStaticDates,
    selectedDate,
    onSelectDate,
    t,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const disabled = isLoadingStaticDates || availableStaticDates.length === 0;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const orderedDates = useMemo(() => [...availableStaticDates].reverse(), [availableStaticDates]);

    const displayValue = isLoadingStaticDates
        ? t("configurator.layer1.staticLoading", "Loading available static dates...")
        : selectedDate || t("configurator.layer1.staticEmpty", "Select a static date");

    const handleSelect = (date: string) => {
        onSelectDate(date);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                id="static-date"
                type="button"
                onClick={() => !disabled && setIsOpen((current) => !current)}
                disabled={disabled}
                className="group flex w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-sm text-foreground transition-all duration-200 hover:border-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="min-w-0 flex-1 truncate font-medium">{displayValue}</span>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180",
                    )}
                />
            </button>

            {isOpen && (
                <div className="md-fade-in absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                    <div className="max-h-56 overflow-y-auto p-1.5">
                        {orderedDates.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                {t("configurator.layer1.noDates", "No dates available.")}
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {orderedDates.map((day, index) => {
                                    const isSelected = selectedDate === day;
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => handleSelect(day)}
                                            style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
                                            className={cn(
                                                "md-row-in group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground transition-all duration-150 hover:bg-muted active:scale-[0.98]",
                                                isSelected && "bg-muted",
                                            )}
                                        >
                                            <div className="flex h-6 w-6 items-center justify-center rounded bg-muted transition-colors">
                                                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn("truncate", isSelected ? "font-semibold" : "font-medium")}>
                                                        {day}
                                                    </span>
                                                    {availableStaticDates.length === 1 && (
                                                        <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
                                                            {t("configurator.layer1.hottest", "Hottest")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && <Check className="h-4 w-4 shrink-0 text-foreground" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const Layer1ModelInit: FC<{ ctx: ConfiguratorContext }> = ({ ctx }) => {
    const { t } = useTranslation();
    const { state, actions, handleModelNameChange, getDateBounds } = ctx;
    const bounds = getDateBounds();
    const orderedDynamicDates = useMemo(() => [...state.availableDynamicDates].sort(), [state.availableDynamicDates]);
    const dynamicDateSet = useMemo(() => new Set(orderedDynamicDates), [orderedDynamicDates]);
    const dynamicBounds = useMemo(() => {
        if (orderedDynamicDates.length === 0) return bounds;
        const minValue = parseDate(orderedDynamicDates[0]);
        const maxValue = parseDate(orderedDynamicDates[orderedDynamicDates.length - 1]);
        return {
            minValue,
            maxValue,
            minYear: minValue.year,
            maxYear: maxValue.year,
        };
    }, [bounds, orderedDynamicDates]);
    const isDynamicDateUnavailable = useMemo(
        () => (dateValue: { year: number; month: number; day: number }) => !dynamicDateSet.has(formatDateValue(dateValue)),
        [dynamicDateSet],
    );
    const isDynamicPickerDisabled =
        state.isLoadingDynamicDates || Boolean(state.dynamicDatesError) || orderedDynamicDates.length === 0;
    const dynamicRangeValue =
        state.fromDate && state.toDate && dynamicDateSet.has(state.fromDate) && dynamicDateSet.has(state.toDate)
            ? { start: parseDate(state.fromDate), end: parseDate(state.toDate) }
            : null;
    const handleDynamicRangeChange = (range: {
        start: { year: number; month: number; day: number };
        end: { year: number; month: number; day: number };
    } | null) => {
        if (!range) return;
        const startDay = formatDateValue(range.start);
        const endDay = formatDateValue(range.end);
        if (!dateRangeHasOnlyAvailableDates(startDay, endDay, dynamicDateSet)) {
            return;
        }
        actions.handleUpdateRange({ start: range.start, end: range.end });
    };

    const days =
        state.fromDate && state.toDate
            ? Math.max(
                  1,
                  Math.floor(
                      (new Date(state.toDate).getTime() - new Date(state.fromDate).getTime()) / (1000 * 60 * 60 * 24),
                  ) + 1,
            )
            : 0;

    const staticDateStatus = getStaticDateStatus(
        state.staticDatesError,
        state.isLoadingStaticDates,
        state.availableStaticDates,
        t
    );
    const dynamicDateStatus = getDynamicDateStatus(
        state.dynamicDatesError,
        state.isLoadingDynamicDates,
        orderedDynamicDates,
        state.fromDate,
        state.toDate,
        days,
        t
    );

    return (
        <LayerShell
            purpose={t("configurator.layer1.purpose", "Name this wildfire simulation and choose the date window you want to assess.")}
            nextStepHint={t("configurator.layer1.nextStepHint", "Next you'll outline the geographic area on the map.")}
        >
            <div className="space-y-8">
                <QuestionSection
                    index={1}
                    title={t("configurator.layer1.modelNameQuestion", "What do you want to call this model?")}
                    description={t("configurator.layer1.modelNameHint", "So you can find it later.")}
                >
                    <div data-tour="model-name">
                        <input
                            id="layer-model-name"
                            type="text"
                            value={state.modelName}
                            onChange={handleModelNameChange}
                            placeholder={t("configurator.layer1.modelNamePlaceholder", "e.g. Galicia Summer 2026 Wildfire Risk")}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-colors duration-150 hover:border-muted-foreground/40 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {!state.modelName.trim() && (
                            <div className="md-fade-in mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground">
                                    {t("configurator.layer1.suggestedNamesLabel", "Quick picks")}:
                                </span>
                                {[1, 2, 3, 4].map((n) => {
                                    const suggestion = t(`configurator.layer1.suggestedName${n}`);
                                    return (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => actions.setModelName(suggestion)}
                                            className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:border-muted-foreground/40 hover:bg-muted hover:text-foreground"
                                        >
                                            {suggestion}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </QuestionSection>

                <QuestionSection
                    index={2}
                    title={t("configurator.layer1.calcModeQuestion", "How should the risk be calculated?")}
                    description={t("configurator.layer1.calcModeInfo", "Static assesses a single day — one available weather date — using the AOI risk workflow. Dynamic assesses a range of days, keeping the daily weather sequence. Both use the 16:00–17:00 weather window.")}
                >
                    <div data-tour="calculation-mode">
                        <ChoiceCardGroup columns={2}>
                            <ChoiceCard
                                icon={<CalendarIcon className="h-5 w-5" />}
                                label={t("configurator.layer1.calcModeStatic", "Static")}
                                description={t("configurator.layer1.calcModeHintStatic", "The hottest day of each available year.")}
                                info={t(
                                    "configurator.layer1.calcModeStaticInfo",
                                    "The date is picked for you: for each available year, the day that recorded the highest temperature — the worst-case weather for that year. Assessed from 16:00 to 17:00."
                                )}
                                selected={state.calculationMode === "static"}
                                onSelect={() => actions.setCalculationMode("static")}
                            />
                            <ChoiceCard
                                icon={<CalendarRange className="h-5 w-5" />}
                                label={t("configurator.layer1.calcModeDynamic", "Dynamic")}
                                description={t("configurator.layer1.calcModeHintDynamic", "A range of days, assessed day by day.")}
                                info={t(
                                    "configurator.layer1.calcModeDynamicInfo",
                                    "You choose the range and it is assessed exactly as selected: every day is modelled with its own weather and the run returns the peak-risk day. Each day uses the 16:00–17:00 window."
                                )}
                                selected={state.calculationMode === "dynamic"}
                                onSelect={() => actions.setCalculationMode("dynamic")}
                            />
                        </ChoiceCardGroup>
                    </div>
                </QuestionSection>

                <QuestionSection
                    index={3}
                    title={t("configurator.layer1.periodQuestion", "Which period should it assess?")}
                >
                <div data-tour="date-range">
                    {state.calculationMode === "static" ? (
                        <>
                            <div className="flex items-center gap-1">
                                <label htmlFor="static-date" className="block text-xs font-medium text-foreground">
                                    {t("simulation.simulationPeriod")} <span className="text-destructive">*</span>
                                </label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label={t("configurator.layer1.staticDateInfoAria", "How the static date is selected")}
                                            className="text-muted-foreground transition-colors duration-150 hover:text-foreground focus:outline-none"
                                        >
                                            <Info className="h-3.5 w-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[260px] text-xs">
                                        {t("simulation.staticDateInfo")}
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <StaticDateDropdown
                                availableStaticDates={state.availableStaticDates}
                                isLoadingStaticDates={state.isLoadingStaticDates}
                                selectedDate={state.fromDate === state.toDate ? state.fromDate : ""}
                                onSelectDate={(day) => {
                                    const selectedDate = parseDate(day);
                                    actions.handleUpdateRange({ start: selectedDate, end: selectedDate });
                                }}
                                t={t}
                            />
                            <p className="md-fade-in mt-1 text-[11px] text-muted-foreground" data-tour="calculation-status">
                                {staticDateStatus}
                            </p>
                        </>
                    ) : (
                        <>
                            <DateRangePicker
                                value={dynamicRangeValue}
                                minValue={dynamicBounds.minValue}
                                maxValue={dynamicBounds.maxValue}
                                isDateUnavailable={isDynamicDateUnavailable}
                                allowsNonContiguousRanges={false}
                                isDisabled={isDynamicPickerDisabled}
                                onChange={handleDynamicRangeChange}
                                className="*:not-first:mt-1"
                            >
                                <Label className="text-foreground text-xs font-medium">
                                    {t("simulation.simulationPeriod")} <span className="text-destructive">*</span>
                                </Label>
                                <div className="flex">
                                    <Group className={cn(DATE_INPUT_STYLE, "xl:px-0 lg:px-2 relative")}>
                                        <DateInput slot="start" unstyled className="text-xs pl-2.5 pr-1 py-1.5 flex-1" />
                                        <span aria-hidden="true" className="text-muted-foreground/70 px-1.5 py-1.5">–</span>
                                        <DateInput slot="end" unstyled className="text-xs pl-1 pr-9 py-1.5 flex-1" />
                                        <Trigger className="text-muted-foreground/80 hover:text-foreground absolute inset-0 flex items-center justify-end pr-2.5 cursor-pointer">
                                            <CalendarIcon size={14} />
                                        </Trigger>
                                    </Group>
                                </div>
                                <Popover className="bg-popover z-50 rounded-md border border-border shadow-lg outline-hidden" offset={4}>
                                    <Dialog className="max-h-[inherit] overflow-auto p-2">
                                        <RangeCalendar
                                            onChange={handleDynamicRangeChange}
                                            minValue={dynamicBounds.minValue}
                                            maxValue={dynamicBounds.maxValue}
                                            minYear={dynamicBounds.minYear}
                                            maxYear={dynamicBounds.maxYear}
                                            isDateUnavailable={isDynamicDateUnavailable}
                                            allowsNonContiguousRanges={false}
                                        />
                                    </Dialog>
                                </Popover>
                            </DateRangePicker>
                            <p className="md-fade-in mt-1 text-[11px] text-muted-foreground" data-tour="calculation-status">
                                {dynamicDateStatus}
                            </p>
                        </>
                    )}
                </div>
                </QuestionSection>
            </div>
        </LayerShell>
    );
};
