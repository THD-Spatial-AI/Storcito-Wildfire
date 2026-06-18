import type { FC } from "react";
import { DateRangePicker, Dialog, Group, Label, Popover, Button as Trigger } from "react-aria-components";
import { parseDate } from "@internationalized/date";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "@/i18n";

import { DateInput } from "@/components/ui/datefield-rac";
import { DATE_INPUT_STYLE } from "@/components/ui/datefield-rac.consts";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import { cn } from "@/lib/utils";

import { LayerShell } from "./shared/LayerShell";
import type { ConfiguratorContext } from "./types";

export const Layer1ModelInit: FC<{ ctx: ConfiguratorContext }> = ({ ctx }) => {
    const { t } = useTranslation();
    const { state, actions, handleModelNameChange, getDateBounds } = ctx;
    const bounds = getDateBounds();

    const days =
        state.fromDate && state.toDate
            ? Math.max(
                  1,
                  Math.floor(
                      (new Date(state.toDate).getTime() - new Date(state.fromDate).getTime()) / (1000 * 60 * 60 * 24),
                  ) + 1,
            )
            : 0;

    const staticDateStatus =
        state.staticDatesError ??
        (state.isLoadingStaticDates
            ? "Loading available static dates..."
            : state.availableStaticDates.length > 0
                ? `Available static dates: ${state.availableStaticDates[0]} to ${state.availableStaticDates.at(-1)}`
                : "No static dates available.");

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

                <div data-tour="date-range">
                    {state.calculationMode === "static" ? (
                        <>
                            <label htmlFor="static-date" className="block text-xs font-medium text-foreground">
                                {t("simulation.simulationPeriod")} <span className="text-red-500">*</span>
                            </label>
                            <p className="mb-1 mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                Static runs use one available weather date, from 16:00 to 17:00.
                            </p>
                            <select
                                id="static-date"
                                value={state.fromDate === state.toDate ? state.fromDate : ""}
                                onChange={(event) => {
                                    if (!event.target.value) return;
                                    const selectedDate = parseDate(event.target.value);
                                    actions.handleUpdateRange({ start: selectedDate, end: selectedDate });
                                }}
                                disabled={state.isLoadingStaticDates || state.availableStaticDates.length === 0}
                                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">
                                    {state.isLoadingStaticDates ? "Loading available dates..." : "Select a static date"}
                                </option>
                                {[...state.availableStaticDates].reverse().map((day) => (
                                    <option key={day} value={day}>
                                        {day}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-[11px] text-muted-foreground" data-tour="calculation-status">
                                {staticDateStatus}
                            </p>
                        </>
                    ) : (
                        <>
                            <DateRangePicker
                                value={
                                    state.fromDate && state.toDate
                                        ? { start: parseDate(state.fromDate), end: parseDate(state.toDate) }
                                        : null
                                }
                                onChange={(range) => {
                                    if (!range) return;
                                    actions.handleUpdateRange({ start: range.start, end: range.end });
                                }}
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
                                            onChange={(range) => actions.handleUpdateRange({ start: range.start, end: range.end })}
                                            minValue={bounds.minValue}
                                            maxValue={bounds.maxValue}
                                            minYear={bounds.minYear}
                                            maxYear={bounds.maxYear}
                                        />
                                    </Dialog>
                                </Popover>
                            </DateRangePicker>
                            <p className="mt-1 text-[11px] text-muted-foreground" data-tour="calculation-status">
                                Selected days: {days}
                            </p>
                        </>
                    )}
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

            </div>
        </LayerShell>
    );
};
