import type { FC } from "react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

import type { RiskMetrics } from "../hooks/useRiskMetrics";
import { RISK_LEVEL_META } from "../viewer-config";
import { formatMetric } from "../viewer-helpers";
import { PlayerStat } from "./DailyPlayerControls";
import { riskGradient } from "@/lib/riskPalette";

/** overall risk shown */
export const RiskSummary: FC<{ metrics: RiskMetrics }> = ({ metrics }) => {
  const { t } = useTranslation();
  const level = metrics.overallRiskLevel ? RISK_LEVEL_META[metrics.overallRiskLevel] : undefined;

  return (
    <div className="flex items-center justify-center gap-4 px-4 py-2">
      <div className="flex flex-col leading-tight">
        <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("modelResults.metrics.overallRisk", "Overall risk")}
        </span>
        <span className={cn("text-sm font-bold uppercase", level?.chip)}>
          {level ? t(level.labelKey, "—") : "—"}
        </span>
      </div>

      <div className="flex flex-col border-l border-border pl-4 leading-tight">
        <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("modelResults.metrics.meanRiskScore", "Mean risk score")}
        </span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {formatMetric(metrics.overallRiskScore, 2)}
          <span className="font-normal text-muted-foreground"> / 5</span>
        </span>
        <div
          className="relative mt-1 h-1 w-24 rounded-full"
          style={{ background: riskGradient() }}
        >
          {typeof metrics.overallRiskScore === "number" && (
            <span
              className="absolute -top-[3px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-card bg-foreground shadow"
              style={{ left: `${Math.min(100, Math.max(0, (metrics.overallRiskScore / 5) * 100))}%` }}
            />
          )}
        </div>
      </div>

      {/* areas hide narrow */}
      <div className="hidden items-center gap-4 md:flex">
        <PlayerStat
          className="border-l border-border pl-4"
          label={t("modelResults.metrics.highVeryHighArea", "High + very high area")}
          value={`${formatMetric(metrics.affectedAreaKm2, 2)} km²`}
          unit={
            typeof metrics.affectedFraction === "number"
              ? `(${(metrics.affectedFraction * 100).toFixed(1)}%)`
              : undefined
          }
        />
        <PlayerStat
          className="border-l border-border pl-4"
          label={t("modelResults.metrics.analyzedArea", "Analyzed area")}
          value={`${formatMetric(metrics.totalAreaKm2, 2)} km²`}
        />
      </div>
    </div>
  );
};
