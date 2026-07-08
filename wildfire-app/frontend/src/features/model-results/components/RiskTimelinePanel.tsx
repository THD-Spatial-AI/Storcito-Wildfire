import { FC, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { Loader2, X } from "lucide-react";
import { useTranslation } from "@/i18n";

import type { DayDistribution } from "../hooks/useDailyRiskDistribution";
import { formatFrameDate } from "./DailyPlayerControls";

interface RiskTimelinePanelProps {
  days: DayDistribution[] | null;
  isLoading: boolean;
  error: string | null;
  currentDate: string | null;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const LEVELS: Array<{ key: keyof DayDistribution["area_km2"]; label: string; color: string }> = [
  { key: "very_low", label: "Very Low", color: "#2563eb" },
  { key: "low", label: "Low", color: "#16a34a" },
  { key: "moderate", label: "Moderate", color: "#eab308" },
  { key: "high", label: "High", color: "#ea580c" },
  { key: "very_high", label: "Very High", color: "#dc2626" },
];

// Stacked area chart: analyzed km² per risk class for each day of a dynamic run.
export const RiskTimelinePanel: FC<RiskTimelinePanelProps> = ({
  days,
  isLoading,
  error,
  currentDate,
  onSelectDate,
  onClose,
}) => {
  const { t } = useTranslation();

  const option = useMemo<EChartsOption | null>(() => {
    if (!days?.length) return null;
    const dates = days.map((d) => d.date);
    const labels = dates.map((d) => formatFrameDate(d));
    const currentLabel = currentDate ? formatFrameDate(currentDate) : null;

    return {
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) => `${Number(v).toFixed(2)} km²`,
      },
      legend: {
        top: 0,
        textStyle: { fontSize: 10 },
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLabel: { fontSize: 9 },
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        name: "km²",
        nameTextStyle: { fontSize: 9, color: "#94a3b8" },
        axisLabel: { fontSize: 9 },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: LEVELS.map((level, i) => ({
        name: level.label,
        type: "line" as const,
        stack: "area",
        symbol: "circle",
        symbolSize: 5,
        showSymbol: true,
        data: days.map((d) => Number((d.area_km2?.[level.key] ?? 0).toFixed(3))),
        lineStyle: { width: 1, color: level.color },
        itemStyle: { color: level.color },
        areaStyle: { color: level.color, opacity: 0.75 },
        emphasis: { focus: "series" as const },
        // The playing day marker rides on the first series only.
        markLine:
          i === 0 && currentLabel && labels.includes(currentLabel)
            ? {
                silent: true,
                symbol: "none",
                label: { show: false },
                lineStyle: { color: "#0f172a", width: 1.5, type: "dashed" as const },
                data: [{ xAxis: currentLabel }],
              }
            : undefined,
      })),
    };
  }, [currentDate, days]);

  return (
    <div className="absolute top-4 right-4 z-[1200] w-[460px] max-w-[calc(100%-2rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1">
        <div>
          <div className="text-xs font-semibold text-foreground">
            {t("modelResults.timeline.title", "Risk Over Time")}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {t(
              "modelResults.timeline.subtitle",
              "Analyzed area per risk class for each day of the run. Click a day to show it on the map.",
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close", "Close")}
          className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 h-[220px] text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t(
            "modelResults.timeline.loading",
            "Computing daily distributions… the first load can take a minute.",
          )}
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-center justify-center h-[220px] px-6 text-xs text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {!isLoading && !error && !option && (
        <div className="flex items-center justify-center h-[220px] px-6 text-xs text-muted-foreground text-center">
          {t("modelResults.timeline.empty", "No daily risk maps in this run.")}
        </div>
      )}

      {!isLoading && !error && option && (
        <ReactECharts
          option={option}
          style={{ height: 230, width: "100%" }}
          opts={{ renderer: "svg" }}
          notMerge
          onEvents={{
            click: (params: { dataIndex?: number }) => {
              const idx = params.dataIndex;
              if (typeof idx === "number" && days?.[idx]) onSelectDate(days[idx].date);
            },
          }}
        />
      )}
    </div>
  );
};
