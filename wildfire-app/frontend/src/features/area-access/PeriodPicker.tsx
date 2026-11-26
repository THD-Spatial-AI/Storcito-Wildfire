import { useMemo, useState } from "react";
import { parseDate, type DateValue } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { CalendarRange, Loader2, Plus } from "lucide-react";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import { useTranslation } from "@/i18n";
import { formatPeriod, inPeriods, periodKey, type Period } from "./service";
import { EmptyNote, GrantChip } from "./AreaPicker";
import { useEngineDates } from "./useEngineDates";

interface PeriodPickerProps {
	value: Period[];
	onChange: (periods: Period[]) => void;
	emptyText?: string;
}

// year list span
const THIS_YEAR = new Date().getFullYear();

/** date range list */
export function PeriodPicker({ value, onChange, emptyText }: PeriodPickerProps) {
	const { t, i18n } = useTranslation();
	const locale = i18n?.language ?? "en";
	const [range, setRange] = useState<{ start: DateValue; end: DateValue } | null>(null);
	const engine = useEngineDates();
	const available = useMemo(() => new Set(engine.dates), [engine.dates]);
	// data date bounds
	const first = engine.dates.at(0);
	const last = engine.dates.at(-1);
	const bounds = first && last ? { min: parseDate(first), max: parseDate(last) } : null;

	const candidate = range ? { from: range.start.toString(), to: range.end.toString() } : null;
	const duplicate = !!candidate && value.some((p) => periodKey(p) === periodKey(candidate));

	const add = () => {
		if (!candidate || duplicate) return;
		onChange([...value, candidate].sort((a, b) => a.from.localeCompare(b.from)));
		setRange(null);
	};

	// existing periods marked
	const marked = (day: DateValue) => inPeriods(day.toString(), value);

	return (
		<div className="grid gap-5 sm:grid-cols-[minmax(0,17rem)_1fr]">
			{!engine.ready ? (
				<div className="flex h-72 items-center justify-center rounded-xl border border-border">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : (
				<I18nProvider locale={locale}>
					<RangeCalendar
						aria-label={t("periodAccess.calendarLabel", "Period dates")}
						className="w-full rounded-xl border border-border p-2 [&_table]:w-full"
						value={range}
						onChange={setRange}
						minValue={bounds?.min}
						maxValue={bounds?.max}
						defaultFocusedValue={bounds?.max}
						minYear={bounds?.min.year ?? THIS_YEAR - 5}
						maxYear={bounds?.max.year ?? THIS_YEAR + 5}
						// gaps allowed inside
						allowsNonContiguousRanges
						isDateUnavailable={bounds ? (day) => !available.has(day.toString()) : undefined}
						isDateMarked={marked}
					/>
				</I18nProvider>
			)}

			<div className="min-w-0 space-y-4">
				<div className="space-y-2">
					<p className="text-xs font-medium text-muted-foreground">{t("periodAccess.selected", "Selected")}</p>
					<p className="text-sm font-medium tabular-nums text-foreground">
						{candidate ? formatPeriod(candidate, locale) : t("periodAccess.pickHint", "Click the first and last day")}
					</p>
					<button
						type="button"
						onClick={add}
						disabled={!candidate || duplicate}
						className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Plus className="h-4 w-4" />
						{duplicate ? t("areaAccess.added", "Added") : t("periodAccess.add", "Add period")}
					</button>
					<p className="text-xs text-muted-foreground">
						{t("periodAccess.hint", "Both days are included. A model's whole date range must fit inside one period.")}
					</p>
				</div>

				<div className="space-y-2 border-t border-border pt-3">
					<p className="text-xs font-medium text-muted-foreground">{t("periodAccess.column", "Periods")}</p>
					{value.length === 0 ? (
						<EmptyNote>{emptyText ?? t("periodAccess.none", "No periods set.")}</EmptyNote>
					) : (
						<ul className="flex flex-wrap gap-1.5">
							{value.map((p) => (
								<GrantChip
									key={periodKey(p)}
									removeLabel={t("periodAccess.remove", "Remove period")}
									onRemove={() => onChange(value.filter((v) => periodKey(v) !== periodKey(p)))}
								>
									<button
										type="button"
										data-compact
										onClick={() => setRange({ start: parseDate(p.from), end: parseDate(p.to) })}
										className="inline-flex items-center gap-1.5"
										title={t("periodAccess.show", "Show on calendar")}
									>
										<CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
										<span className="tabular-nums">{formatPeriod(p, locale)}</span>
									</button>
								</GrantChip>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}
