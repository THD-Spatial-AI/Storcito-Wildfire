import { useMemo, useState, type FC, type ReactNode } from "react";
import { parseDate, type DateValue } from "@internationalized/date";
import { Button as AriaButton, Dialog, DialogTrigger, I18nProvider, Popover } from "react-aria-components";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Calendar as DayCalendar } from "@/components/ui/calendar-rac";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ModelDateStepper } from "../hooks/useModelDateStepper";

interface DateStepperBarProps {
  stepper: ModelDateStepper;
  /** shown bar e */
  summary?: ReactNode;
}

const SIDE_BUTTON =
  "group flex items-center gap-2 rounded-xl px-3 py-1.5 text-left transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-35";

/** floating day switcher */
export const DateStepperBar: FC<DateStepperBarProps> = ({ stepper, summary }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n?.language ?? "en";
  const shortDay = (day: string) =>
    new Date(`${day}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });
  const longDay = (day: string) =>
    new Date(`${day}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

  const { currentDate, previousDate, nextDate, pendingDate, error, goTo, availableDates, readyDates } = stepper;
  const [pickerOpen, setPickerOpen] = useState(false);
  const available = useMemo(() => new Set(availableDates), [availableDates]);
  const ready = useMemo(() => new Set(readyDates), [readyDates]);
  if (!currentDate) {
    // no day switching
    return summary ? (
      <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2">
        <div className="md-rise pointer-events-auto overflow-hidden rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-sm">
          {summary}
        </div>
      </div>
    ) : null;
  }
  const busy = Boolean(pendingDate);
  const first = availableDates.at(0);
  const last = availableDates.at(-1);

  const pickDay = (day: DateValue) => {
    setPickerOpen(false);
    const date = day.toString();
    if (date !== currentDate) void goTo(date);
  };

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 flex-col items-center gap-1.5">
      <div className="md-rise pointer-events-auto overflow-hidden rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-sm">
        <div
          data-tour="date-stepper"
          className="flex items-center justify-center gap-3 p-1"
        >
        <button
          type="button"
          onClick={() => previousDate && void goTo(previousDate)}
          disabled={!previousDate || busy}
          title={
            previousDate
              ? t("modelResults.dateStep.previous", { date: longDay(previousDate), defaultValue: "Previous day: {{date}}" })
              : t("modelResults.dateStep.noPrevious", "No earlier day with data")
          }
          className={SIDE_BUTTON}
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[11px] text-muted-foreground">
              {t("modelResults.dateStep.previousShort", "Previous day")}
            </span>
            <span className="text-xs font-medium text-foreground">{previousDate ? shortDay(previousDate) : "—"}</span>
          </span>
        </button>

        {/* click date calendar */}
        <DialogTrigger isOpen={pickerOpen} onOpenChange={setPickerOpen}>
          <AriaButton
            isDisabled={busy || availableDates.length === 0}
            aria-label={t("modelResults.dateStep.pick", "Pick a day")}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-muted px-3.5 py-2 outline-none transition-colors hover:bg-accent data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring disabled:cursor-default"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground" />
            ) : (
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">
              {longDay(pendingDate ?? currentDate)}
            </span>
            <ChevronDown
              className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", pickerOpen && "rotate-180")}
            />
          </AriaButton>
          <Popover placement="bottom" offset={8} className="z-[1100] rounded-xl border border-border bg-popover shadow-xl outline-none">
            <Dialog aria-label={t("modelResults.dateStep.pick", "Pick a day")} className="p-3 outline-none">
              <I18nProvider locale={locale}>
                <DayCalendar
                  value={parseDate(currentDate)}
                  onChange={pickDay}
                  minValue={first ? parseDate(first) : undefined}
                  maxValue={last ? parseDate(last) : undefined}
                  minYear={first ? Number(first.slice(0, 4)) : undefined}
                  maxYear={last ? Number(last.slice(0, 4)) : undefined}
                  isDateUnavailable={(day) => !available.has(day.toString())}
                  isDateMarked={(day) => ready.has(day.toString())}
                />
              </I18nProvider>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-foreground/60" />
                {t("modelResults.dateStep.readyLegend", "Map ready, opens in seconds")}
              </p>
            </Dialog>
          </Popover>
        </DialogTrigger>

        <button
          type="button"
          onClick={() => nextDate && void goTo(nextDate)}
          disabled={!nextDate || busy}
          title={
            nextDate
              ? t("modelResults.dateStep.next", { date: longDay(nextDate), defaultValue: "Next day: {{date}}" })
              : t("modelResults.dateStep.noNext", "No later day with data")
          }
          className={cn(SIDE_BUTTON, "flex-row-reverse text-right")}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[11px] text-muted-foreground">
              {t("modelResults.dateStep.nextShort", "Next day")}
            </span>
            <span className="text-xs font-medium text-foreground">{nextDate ? shortDay(nextDate) : "—"}</span>
          </span>
          </button>
        </div>
        {/* same card day */}
        {summary && <div className="border-t border-border/70">{summary}</div>}
      </div>

      {error && (
        <p className="pointer-events-auto rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          {error}
        </p>
      )}
    </div>
  );
};
