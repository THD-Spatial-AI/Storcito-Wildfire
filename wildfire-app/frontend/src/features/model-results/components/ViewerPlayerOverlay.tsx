import { FC } from "react";
import { ChevronRight, Compass, Droplets, Flame, Thermometer, Wind } from "lucide-react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

import type { RiskMetrics } from "../hooks/useRiskMetrics";
import type { AvailableLayer, FrameWeather } from "../viewer-config";
import { RISK_LEVEL_META } from "../viewer-config";
import { formatMetric, windCardinal } from "../viewer-helpers";
import { PlayPauseButton, PlayerStat, formatFrameDate } from "./DailyPlayerControls";
import type { RankedRiskDay } from "../hooks/useFrameWeather";

interface PeakRiskDayBadgeProps {
  riskRankDay: RankedRiskDay;
  rankedRiskDays: RankedRiskDay[];
  riskRankIndex: number;
  active: boolean;
  onSelect: () => void;
}

// Cycling badge: click shows the ranked day on the map, then offers the next one.
const PeakRiskDayBadge: FC<PeakRiskDayBadgeProps> = ({
  riskRankDay,
  rankedRiskDays,
  riskRankIndex,
  active,
  onSelect,
}) => {
  const { t } = useTranslation();
  const rank = riskRankIndex % rankedRiskDays.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={t(
        "modelResults.layer.peakDayHint",
        "Click to show this day, then step to the next-riskiest one"
      )}
      className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
        active ? "border-red-500 bg-red-500/10" : "border-border bg-card hover:bg-muted"
      }`}
    >
      <Flame className="h-3.5 w-3.5 text-red-600" />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
          {rank === 0
            ? t("modelResults.layer.peakDay", "Peak risk day")
            : t("modelResults.layer.rankDay", "#{{rank}} risk day", { rank: rank + 1 })}
          {" · "}
          {rank + 1}/{rankedRiskDays.length}
        </span>
        <span className="text-xs font-semibold tabular-nums text-foreground whitespace-nowrap">
          {formatFrameDate(riskRankDay.date)}
        </span>
        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
          {t("modelResults.layer.peakDayNext", "Click to view · next day follows")}
        </span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
    </button>
  );
};

interface ViewerPlayerOverlayProps {
  dailyFrames: AvailableLayer[];
  playing: boolean;
  onTogglePlay: () => void;
  playingFrameDate: string | null;
  dailyFrameIndex: number;
  currentFrameWeather: FrameWeather | null | undefined;
  rankedRiskDays: RankedRiskDay[] | null;
  riskRankDay: RankedRiskDay | null;
  riskRankIndex: number;
  onSelectRankedDay: (day: RankedRiskDay, pausePlayback: boolean) => void;
  legendMetrics: RiskMetrics;
}

// Floating pill at the bottom of the map: day player + per-day fire weather
// (dynamic runs) and the run-wide assessment row.
export const ViewerPlayerOverlay: FC<ViewerPlayerOverlayProps> = ({
  dailyFrames,
  playing,
  onTogglePlay,
  playingFrameDate,
  dailyFrameIndex,
  currentFrameWeather,
  rankedRiskDays,
  riskRankDay,
  riskRankIndex,
  onSelectRankedDay,
  legendMetrics,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="absolute bottom-4 z-[1500] overflow-hidden rounded-2xl border border-border bg-white/95 shadow-lg backdrop-blur"
      style={{
        // Center within the visible map area (the sidebar overlays the right edge).
        left: "calc((100% - var(--sidebar-offset, 0rem)) / 2)",
        transform: "translateX(-50%)",
      }}
    >
      {dailyFrames.length >= 2 && (
        <div className="flex items-center gap-4 px-3 py-2">
          <PlayPauseButton
            playing={playing}
            onToggle={onTogglePlay}
            playLabel={t("modelResults.layer.play", "Play")}
            pauseLabel={t("modelResults.layer.pause", "Pause")}
          />

          {playingFrameDate && dailyFrameIndex >= 0 ? (
            <>
              <PlayerStat
                label={`${t("modelResults.layer.day", "Day")} ${dailyFrameIndex + 1}/${dailyFrames.length}`}
                value={`${formatFrameDate(playingFrameDate)} · 16:00–17:00`}
              />
              <div className="flex items-center gap-4 border-l border-border pl-4">
                <PlayerStat
                  icon={<Wind className="h-4 w-4 text-cyan-600" />}
                  label={t("modelResults.details.windSpeed", "Wind speed")}
                  value={formatMetric(currentFrameWeather?.wind_speed_kmh)}
                  unit="km/h"
                  tooltipKey="windSpeed"
                />
                <PlayerStat
                  icon={<Compass className="h-4 w-4 text-emerald-600" />}
                  label={t("modelResults.details.windDirection", "Wind direction")}
                  value={
                    typeof currentFrameWeather?.wind_direction_deg === "number"
                      ? `${currentFrameWeather.wind_direction_deg.toFixed(0)}° ${windCardinal(currentFrameWeather.wind_direction_deg)}`
                      : "—"
                  }
                  tooltipKey="windDirection"
                />
                <PlayerStat
                  icon={<Thermometer className="h-4 w-4 text-orange-600" />}
                  label={t("modelResults.details.temperature", "Temperature")}
                  value={formatMetric(currentFrameWeather?.temperature_c)}
                  unit="°C"
                  tooltipKey="temperature"
                />
                <PlayerStat
                  icon={<Droplets className="h-4 w-4 text-sky-600" />}
                  label={t("modelResults.details.humidity", "Humidity")}
                  value={formatMetric(currentFrameWeather?.relative_humidity_pct)}
                  unit="%"
                  tooltipKey="humidity"
                />
              </div>
              {riskRankDay && rankedRiskDays && (
                <PeakRiskDayBadge
                  riskRankDay={riskRankDay}
                  rankedRiskDays={rankedRiskDays}
                  riskRankIndex={riskRankIndex}
                  active={playingFrameDate === riskRankDay.date}
                  onSelect={() => onSelectRankedDay(riskRankDay, true)}
                />
              )}
            </>
          ) : (
            <>
              <span className="text-xs font-semibold text-foreground">
                {t("modelResults.layer.playDaily", "Animate daily risk maps")}
              </span>
              {riskRankDay && rankedRiskDays && (
                <PeakRiskDayBadge
                  riskRankDay={riskRankDay}
                  rankedRiskDays={rankedRiskDays}
                  riskRankIndex={riskRankIndex}
                  active={false}
                  onSelect={() => onSelectRankedDay(riskRankDay, false)}
                />
              )}
            </>
          )}
        </div>
      )}

      {legendMetrics && (
        <div
          className={`flex items-center gap-4 px-3 py-2 ${dailyFrames.length >= 2 ? "border-t border-border bg-slate-50/80" : ""}`}
        >
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              {t("modelResults.metrics.overallRisk", "Overall risk")}
            </span>
            <span
              className={cn(
                "text-sm font-bold uppercase",
                RISK_LEVEL_META[legendMetrics.overallRiskLevel ?? ""]?.chip
              )}
            >
              {legendMetrics.overallRiskLevel && RISK_LEVEL_META[legendMetrics.overallRiskLevel]
                ? t(RISK_LEVEL_META[legendMetrics.overallRiskLevel].labelKey, "—")
                : "—"}
            </span>
          </div>

          <div className="flex flex-col leading-tight border-l border-border pl-4">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              {t("modelResults.metrics.meanRiskScore", "Mean risk score")}
            </span>
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {formatMetric(legendMetrics.overallRiskScore, 2)}
              <span className="font-normal text-muted-foreground"> / 5</span>
            </span>
            <div
              className="relative mt-1 h-1 w-24 rounded-full"
              style={{
                background: "linear-gradient(to right,#9ca3af,#16a34a,#eab308,#f97316,#dc2626)",
              }}
            >
              {typeof legendMetrics.overallRiskScore === "number" && (
                <span
                  className="absolute -top-[3px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-slate-800 shadow"
                  style={{
                    left: `${Math.min(100, Math.max(0, (legendMetrics.overallRiskScore / 5) * 100))}%`,
                  }}
                />
              )}
            </div>
          </div>

          <PlayerStat
            className="border-l border-border pl-4"
            label={t("modelResults.metrics.highVeryHighArea", "High + very high area")}
            value={`${formatMetric(legendMetrics.affectedAreaKm2, 2)} km²`}
            unit={
              typeof legendMetrics.affectedFraction === "number"
                ? `(${(legendMetrics.affectedFraction * 100).toFixed(1)}%)`
                : undefined
            }
          />
          <PlayerStat
            className="border-l border-border pl-4"
            label={t("modelResults.metrics.analyzedArea", "Analyzed area")}
            value={`${formatMetric(legendMetrics.totalAreaKm2, 2)} km²`}
          />
        </div>
      )}
    </div>
  );
};
