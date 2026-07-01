import React from "react";
import { useRiskMetrics, type RiskLevel } from "@/features/model-results/hooks/useRiskMetrics";

// Mirrors the 5-level risk theme used on the model results page for consistency.
const THEME: Record<RiskLevel, { label: string; cls: string; dot: string }> = {
  very_low: {
    label: "Very Low",
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20",
    dot: "bg-blue-500",
  },
  low: {
    label: "Low",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  moderate: {
    label: "Moderate",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20",
    dot: "bg-amber-400",
  },
  high: {
    label: "High",
    cls: "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/25",
    dot: "bg-orange-500",
  },
  very_high: {
    label: "Very High",
    cls: "bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/25",
    dot: "bg-red-500",
  },
};

interface RiskLevelBadgeProps {
  modelId: number;
}

// Risk-level badge for a completed model; renders nothing until metrics load.
const RiskLevelBadge: React.FC<RiskLevelBadgeProps> = ({ modelId }) => {
  const { metrics, ready } = useRiskMetrics(modelId);
  const level = ready ? metrics.overallRiskLevel : null;
  if (!level) return null;

  const theme = THEME[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 whitespace-nowrap ${theme.cls}`}
      title={`Risk: ${theme.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
      {theme.label}
    </span>
  );
};

export default React.memo(RiskLevelBadge);
