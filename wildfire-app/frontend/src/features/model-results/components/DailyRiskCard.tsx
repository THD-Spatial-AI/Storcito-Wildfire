import { useState, type FC, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Droplets, Flame, Thermometer, Wind } from "lucide-react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

import type { FrameWeather } from "../viewer-config";
import { formatMetric, windCardinal } from "../viewer-helpers";
import { PlayPauseButton } from "./DailyPlayerControls";

interface DailyRiskCardProps {
  /** days run sorted */
  days: string[];
  /** day map */
  activeDate: string | null;
  /** highest fire-weather day */
  peakDate: string | null;
  playing: boolean;
  onTogglePlay: () => void;
  onSelectDate: (date: string) => void;
  weather: FrameWeather | null | undefined;
  /** risk row shown */
  summary?: ReactNode;
}

const STEP_BUTTON =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

/** top card multi-day */
export const DailyRiskCard: FC<DailyRiskCardProps> = ({
  days,
  activeDate,
  peakDate,
  playing,
  onTogglePlay,
  onSelectDate,
  weather,
  summary,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n?.language ?? "en";
  // touch folds weather
  const [showWeather, setShowWeather] = useState(false);
  const chipDay = (day: string) =>
    new Date(`${day}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });

  const current = activeDate ?? peakDate ?? days[0];
  const index = Math.max(0, days.indexOf(current));
  const step = (offset: number) => {
    const next = days[index + offset];
    if (next) onSelectDate(next);
  };
  const hasWeather =
    weather &&
    [weather.wind_speed_kmh, weather.temperature_c, weather.relative_humidity_pct].some((v) => typeof v === "number");

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 origin-top [@media(pointer:coarse)]:scale-[0.85]">
      <div className="md-rise pointer-events-auto max-w-[min(92vw,760px)] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-sm">
        {/* timeline */}
        <div data-tour="date-stepper" className="flex items-center gap-2 p-1.5">
          <PlayPauseButton
            playing={playing}
            onToggle={onTogglePlay}
            playLabel={t("modelResults.layer.play", "Play")}
            pauseLabel={t("modelResults.layer.pause", "Pause")}
          />
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={index === 0}
            aria-label={t("modelResults.dateStep.previousShort", "Previous day")}
            className={STEP_BUTTON}
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {days.map((day) => {
              const active = day === current;
              const peak = day === peakDate;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  title={peak ? t("modelResults.layer.peakDay", "Highest fire-weather day") : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-foreground text-background" : "text-foreground hover:bg-muted",
                  )}
                >
                  {chipDay(day)}
                  {peak && <Flame className={cn("size-3.5", active ? "text-background" : "text-red-600")} />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => step(1)}
            disabled={index >= days.length - 1}
            aria-label={t("modelResults.dateStep.nextShort", "Next day")}
            className={STEP_BUTTON}
          >
            <ChevronRight className="size-4" />
          </button>
          {hasWeather && (
            <button
              type="button"
              onClick={() => setShowWeather((v) => !v)}
              aria-pressed={showWeather}
              aria-expanded={showWeather}
              className={cn(
                "hidden h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors [@media(pointer:coarse)]:inline-flex",
                showWeather
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              <Wind className="size-3.5" />
              {t("modelResults.weather.label", "Weather")}
              <ChevronDown className={cn("size-3.5 transition-transform", showWeather && "rotate-180")} />
            </button>
          )}
          <span className="shrink-0 pr-2 text-[11px] tabular-nums text-muted-foreground">
            {t("modelResults.dateStep.dayOf", { day: index + 1, total: days.length, defaultValue: "Day {{day}} of {{total}}" })}
          </span>
        </div>

        {summary && <div className="border-t border-border/70">{summary}</div>}

        {hasWeather && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border/70 px-4 py-1.5 text-xs text-muted-foreground",
              !showWeather && "[@media(pointer:coarse)]:hidden"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Wind className="size-3.5 text-cyan-600" />
              <span className="font-medium tabular-nums text-foreground">{formatMetric(weather?.wind_speed_kmh)}</span> km/h
              {typeof weather?.wind_direction_deg === "number" && (
                <span className="tabular-nums">
                  · {windCardinal(weather.wind_direction_deg)} {weather.wind_direction_deg.toFixed(0)}°
                </span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <Thermometer className="size-3.5 text-orange-600" />
              <span className="font-medium tabular-nums text-foreground">{formatMetric(weather?.temperature_c)}</span> °C
            </span>
            <span className="flex items-center gap-1.5">
              <Droplets className="size-3.5 text-sky-600" />
              <span className="font-medium tabular-nums text-foreground">{formatMetric(weather?.relative_humidity_pct)}</span> %
            </span>
            <span className="text-[11px]">· 16:00–17:00</span>
          </div>
        )}
      </div>
    </div>
  );
};
