import React from "react";
import { useRiskMetrics, type RiskLevel } from "@/features/model-results";
import { useTranslation } from "@/i18n";

// Matches results theme.
const THEME: Record<RiskLevel, { labelKey: string; cls: string; dot: string }> = {
  very_low: {
    labelKey: "modelResults.legend.levels.very_low",
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20",
    dot: "bg-blue-500",
  },
  low: {
    labelKey: "modelResults.legend.levels.low",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  moderate: {
    labelKey: "modelResults.legend.levels.moderate",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20",
    dot: "bg-amber-400",
  },
  high: {
    labelKey: "modelResults.legend.levels.high",
    cls: "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/25",
    dot: "bg-orange-500",
  },
  very_high: {
    labelKey: "modelResults.legend.levels.very_high",
    cls: "bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/25",
    dot: "bg-red-500",
  },
};

interface RiskLevelBadgeProps {
  modelId: number;
}

// Risk badge.
const RiskLevelBadge: React.FC<RiskLevelBadgeProps> = ({ modelId }) => {
  const { metrics, ready } = useRiskMetrics(modelId);
  const { t } = useTranslation();
  const level = ready ? metrics.overallRiskLevel : null;
  if (!level) return null;

  const theme = THEME[level];
  const translatedLabel = t(theme.labelKey);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 whitespace-nowrap ${theme.cls}`}
      title={`${t("modelResults.metrics.overallRisk", "Risk")}: ${translatedLabel}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
      {translatedLabel}
    </span>
  );
};

export default React.memo(RiskLevelBadge);
