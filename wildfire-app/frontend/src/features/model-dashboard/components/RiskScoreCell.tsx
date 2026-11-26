import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useRiskMetrics } from "@/features/model-results";
import { useTranslation } from "@/i18n";
import { riskColorOr } from "@/lib/riskPalette";

// severity bands
const BANDS = [
  { max: 1, key: "model.riskBand.veryLow", label: "Very Low", get color() { return riskColorOr(1, "#16a34a"); } },
  { max: 2, key: "model.riskBand.low", label: "Low", get color() { return riskColorOr(2, "#84cc16"); } },
  { max: 3, key: "model.riskBand.moderate", label: "Moderate", get color() { return riskColorOr(3, "#eab308"); } },
  { max: 4, key: "model.riskBand.high", label: "High", get color() { return riskColorOr(4, "#f97316"); } },
  { max: Infinity, key: "model.riskBand.veryHigh", label: "Very High", get color() { return riskColorOr(5, "#dc2626"); } },
] as const;

export const riskBand = (score: number) => BANDS.find((band) => score <= band.max) ?? BANDS[BANDS.length - 1];

/** mean risk score */
const RiskScoreCell: React.FC<{ modelId: number }> = ({ modelId }) => {
  const { metrics, ready } = useRiskMetrics(modelId);
  const { t } = useTranslation();
  const score = ready ? metrics.overallRiskScore : null;
  if (typeof score !== "number") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const band = riskBand(score);
  const label = t(band.key, band.label);
  const value = score.toFixed(2);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* not colour alone */}
        <span className="inline-flex flex-col">
          <span className="inline-flex items-center gap-2">
            <span className="w-8 text-right text-xs font-semibold tabular-nums text-foreground">{value}</span>
            <span aria-hidden className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, (score / 5) * 100))}%`, backgroundColor: band.color }}
              />
            </span>
          </span>
          <span className="pl-10 text-[10px] leading-tight text-muted-foreground">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("model.riskScoreTooltip", { score: value, band: label, defaultValue: "{{score}} / 5 — {{band}}" })}
      </TooltipContent>
    </Tooltip>
  );
};

export default React.memo(RiskScoreCell);
