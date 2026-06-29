import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { DateRangePicker, Dialog, Group, Label, Popover, Button as Trigger } from "react-aria-components";
import { parseDate } from "@internationalized/date";
import { CalendarIcon, Check, ChevronDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";

import { DateInput } from "@/components/ui/datefield-rac";
import { DATE_INPUT_STYLE } from "@/components/ui/datefield-rac.consts";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import { cn } from "@/lib/utils";
import { dateRangeHasOnlyAvailableDates } from "@/features/configurator/utils/dateAvailability";

import { LayerShell } from "./shared/LayerShell";
import type { ConfiguratorContext } from "./types";

function getStaticDateStatus(
    staticDatesError: string | undefined,
    isLoadingStaticDates: boolean,
    availableStaticDates: string[],
) {
    if (staticDatesError) return staticDatesError;
    if (isLoadingStaticDates) return "Loading available static dates...";
    if (availableStaticDates.length === 0) return "No static dates available.";
    if (availableStaticDates.length === 1) return `Highest-temperature static date: ${availableStaticDates[0]}`;
    return `Available static dates: ${availableStaticDates[0]} to ${availableStaticDates.at(-1)}`;
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
) {
    if (dynamicDatesError) return dynamicDatesError;
    if (isLoadingDynamicDates) return "Loading available dynamic dates...";
    if (availableDynamicDates.length === 0) return "No dynamic dates available.";
    if (fromDate && toDate && dateRangeHasOnlyAvailableDates(fromDate, toDate, availableDynamicDates)) {
        return `Selected range: ${fromDate} to ${toDate} (${days} day${days === 1 ? "" : "s"}).`;
    }
    if (fromDate || toDate) {
        return `Select a range inside available dynamic dates: ${availableDynamicDates[0]} to ${availableDynamicDates.at(-1)}`;
    }
    return `Available dynamic dates: ${availableDynamicDates[0]} to ${availableDynamicDates.at(-1)}`;
}

interface StaticDateDropdownProps {
    availableStaticDates: string[];
    isLoadingStaticDates: boolean;
    selectedDate: string;
    onSelectDate: (date: string) => void;
}

const StaticDateDropdown: FC<StaticDateDropdownProps> = ({
    availableStaticDates,
    isLoadingStaticDates,
    selectedDate,
    onSelectDate,
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
        ? "Loading available dates..."
        : selectedDate || "Select a static date";

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
                className="group flex w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-sm text-foreground transition-all duration-200 hover:border-muted-foreground/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                <div className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-56 overflow-y-auto p-1.5">
                        {orderedDates.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                No dates available.
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {orderedDates.map((day) => {
                                    const isSelected = selectedDate === day;
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => handleSelect(day)}
                                            className={cn(
                                                "group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground transition-all duration-150 hover:bg-muted",
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
                                                        <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                                                            Hottest
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
    );
    const dynamicDateStatus = getDynamicDateStatus(
        state.dynamicDatesError,
        state.isLoadingDynamicDates,
        orderedDynamicDates,
        state.fromDate,
        state.toDate,
        days,
    );

    return (
        <LayerShell
            purpose="Name this wildfire simulation and choose the date window you want to assess."
            nextStepHint="Next you'll outline the geographic area on the map."
        >
            <div className="space-y-3">
                <div data-tour="model-name">
                    <label htmlFor="layer-model-name" className="block text-xs font-medium text-foreground mb-1">
                        Model name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="layer-model-name"
                        type="text"
                        value={state.modelName}
                        onChange={handleModelNameChange}
                        placeholder="e.g. Galicia Summer 2026 Wildfire Risk"
                        className="w-full px-2.5 py-1.5 border border-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-background dark:bg-gray-700 text-foreground text-sm transition-colors"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">A descriptive name so you can find this model later.</p>
                </div>

                <div data-tour="calculation-mode">
                    <label className="block text-xs font-medium text-foreground mb-1">
                        Calculation mode
                    </label>
                    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border">
                        {(["static", "dynamic"] as const).map((mode) => {
                            const selected = state.calculationMode === mode;
                            return (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => actions.setCalculationMode(mode)}
                                    className={cn(
                                        "px-2.5 py-1.5 text-xs capitalize transition-colors",
                                        selected
                                            ? "bg-foreground text-background"
                                            : "bg-background text-foreground hover:bg-muted",
                                    )}
                                >
                                    {mode}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Static uses the AOI risk workflow for one date. Dynamic keeps the selected mode in the model payload for the dynamic workflow.
                    </p>
                </div>

                <div data-tour="date-range">
                    {state.calculationMode === "static" ? (
                        <>
                            <div className="flex items-center gap-1">
                                <label htmlFor="static-date" className="block text-xs font-medium text-foreground">
                                    {t("simulation.simulationPeriod")} <span className="text-red-500">*</span>
                                </label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label="How the static date is selected"
                                            className="text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                                        >
                                            <Info className="h-3.5 w-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[260px] text-xs">
                                        {t("simulation.staticDateInfo")}
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="mb-1 mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                Static runs use one available weather date, from 16:00 to 17:00.
                            </p>
                            <StaticDateDropdown
                                availableStaticDates={state.availableStaticDates}
                                isLoadingStaticDates={state.isLoadingStaticDates}
                                selectedDate={state.fromDate === state.toDate ? state.fromDate : ""}
                                onSelectDate={(day) => {
                                    const selectedDate = parseDate(day);
                                    actions.handleUpdateRange({ start: selectedDate, end: selectedDate });
                                }}
                            />
                            <p className="mt-1 text-[11px] text-muted-foreground" data-tour="calculation-status">
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
                                    {t("simulation.simulationPeriod")} <span className="text-red-500">*</span>
                                </Label>
                                <p className="mb-1 mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                    Dynamic runs keep the selected date range and use the 16:00 to 17:00 window.
                                </p>
                                <div className="flex">
                                    <Group className={cn(DATE_INPUT_STYLE, "xl:px-0 lg:px-2 relative dark:bg-gray-700 dark:border-gray-600")}>
                                        <DateInput slot="start" unstyled className="text-xs pl-2.5 pr-1 py-1.5 flex-1" />
                                        <span aria-hidden="true" className="text-muted-foreground/70 px-1.5 py-1.5">–</span>
                                        <DateInput slot="end" unstyled className="text-xs pl-1 pr-9 py-1.5 flex-1" />
                                        <Trigger className="text-muted-foreground/80 hover:text-foreground absolute inset-0 flex items-center justify-end pr-2.5 cursor-pointer">
                                            <CalendarIcon size={14} />
                                        </Trigger>
                                    </Group>
                                </div>
                                <Popover className="bg-background dark:bg-gray-800 z-50 rounded-md border border-border shadow-lg outline-hidden" offset={4}>
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
                            <p className="mt-1 text-[11px] text-muted-foreground" data-tour="calculation-status">
                                {dynamicDateStatus}
                            </p>
                        </>
                    )}
                </div>

            </div>
        </LayerShell>
    );
};
