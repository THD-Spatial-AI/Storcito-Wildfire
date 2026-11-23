import { FC } from "react";
import { Eye, EyeOff, Flame, Layers, MapPin, Route } from "lucide-react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

import { PanelCard } from "@/components/map-controls/PanelCard";

import type { RiskDistribution } from "../hooks/useRiskMetrics";
import { RISK_LEVELS, type RiskLevelValue, type VisibleRiskLevels } from "../viewer-config";
import { riskGradient } from "@/lib/riskPalette";

const PanelCheckbox: FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  accent: "emerald" | "orange";
}> = ({ checked, disabled = false, onChange, accent }) => (
  <div className="relative flex items-center justify-center">
    <input
      type="checkbox"
      className={`peer h-3.5 w-3.5 cursor-pointer appearance-none rounded border border-border bg-background transition-colors disabled:cursor-not-allowed ${
        accent === "emerald"
          ? "checked:border-emerald-600 checked:bg-emerald-600"
          : "checked:border-orange-600 checked:bg-orange-600"
      }`}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <svg
      className="pointer-events-none absolute h-2 w-2 text-white opacity-0 peer-checked:opacity-100"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
    </svg>
  </div>
);

export { PanelCard };

const rowClass =
  "group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/60";

interface OverlaysPanelProps {
  roadsVisible: boolean;
  labelsVisible: boolean;
  onRoadsChange: (visible: boolean) => void;
  onLabelsChange: (visible: boolean) => void;
}

// roads labels toggles
export const OverlaysPanel: FC<OverlaysPanelProps> = ({
  roadsVisible,
  labelsVisible,
  onRoadsChange,
  onLabelsChange,
}) => {
  const { t } = useTranslation();

  return (
    <PanelCard
      position="top-4 left-2"
      icon={<Layers className="h-3.5 w-3.5" />}
      title={t("modelResults.layers.title", "Overlays")}
    >
      <div className="p-1">
        <label className={`${rowClass} cursor-pointer`}>
          <PanelCheckbox checked={roadsVisible} onChange={onRoadsChange} accent="emerald" />
          <Route className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
          <span className="flex-1 text-[11px] font-medium text-foreground">
            {t("modelResults.layers.roads", "Roads")}
          </span>
        </label>
        <label className={`${rowClass} cursor-pointer`}>
          <PanelCheckbox checked={labelsVisible} onChange={onLabelsChange} accent="emerald" />
          <MapPin className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
          <span className="flex-1 text-[11px] font-medium text-foreground">
            {t("modelResults.layers.labels", "Labels & places")}
          </span>
        </label>
      </div>
    </PanelCard>
  );
};

interface RiskLegendPanelProps {
  visibleRiskLevels: VisibleRiskLevels;
  riskLevelAvailability: VisibleRiskLevels;
  riskDistribution: RiskDistribution | null | undefined;
  allRiskLevelsVisible: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleLevel: (value: RiskLevelValue, checked: boolean) => void;
}

// highest risk first
const LEVELS_DESC = [...RISK_LEVELS].reverse();

// risk class toggles
export const RiskLegendPanel: FC<RiskLegendPanelProps> = ({
  visibleRiskLevels,
  riskLevelAvailability,
  riskDistribution,
  allRiskLevelsVisible,
  onToggleAll,
  onToggleLevel,
}) => {
  const { t } = useTranslation();
  const share = (metricKey: (typeof RISK_LEVELS)[number]["metricKey"]) => riskDistribution?.[metricKey] ?? null;
  const hasShares = RISK_LEVELS.some((lvl) => (share(lvl.metricKey) ?? 0) > 0);

  return (
    <PanelCard
      icon={<Flame className="h-3.5 w-3.5" />}
      title={t("modelResults.legend.title", "Fire Risk")}
      action={
        !allRiskLevelsVisible && (
          <button
            type="button"
            data-compact
            onClick={() => onToggleAll(true)}
            className="rounded px-1 text-[10px] font-semibold text-foreground underline-offset-2 hover:underline"
          >
            {t("modelResults.legend.showAll", "All")}
          </button>
        )
      }
    >
      {/* area share bar */}
      <div className="px-2.5 pt-2" aria-hidden>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          {hasShares ? (
            RISK_LEVELS.map((lvl) => {
              const pct = share(lvl.metricKey) ?? 0;
              if (pct <= 0) return null;
              return (
                <span
                  key={lvl.value}
                  className={cn("h-full transition-opacity", !visibleRiskLevels[lvl.value] && "opacity-25")}
                  style={{ width: `${pct}%`, backgroundColor: lvl.color }}
                />
              );
            })
          ) : (
            <span className="h-full w-full" style={{ background: riskGradient() }} />
          )}
        </div>
      </div>
      <p className="px-2.5 pt-1.5 text-[10px] leading-tight text-muted-foreground">
        {t("modelResults.legend.toggleHint", "Tap a level to show or hide it")}
      </p>

      <ul className="p-1">
        {LEVELS_DESC.map((lvl) => {
          const available = riskLevelAvailability[lvl.value];
          const shown = available && visibleRiskLevels[lvl.value];
          const pct = share(lvl.metricKey);
          const empty = pct !== null && pct <= 0;
          const name = t(`modelResults.legend.levels.${lvl.id}`, lvl.label);
          return (
            <li key={lvl.value}>
              <button
                type="button"
                data-compact
                role="switch"
                aria-checked={shown}
                aria-label={name}
                title={
                  available
                    ? shown
                      ? t("modelResults.legend.hideLevel", { name, defaultValue: "Hide {{name}}" })
                      : t("modelResults.legend.showLevel", { name, defaultValue: "Show {{name}}" })
                    : undefined
                }
                disabled={!available}
                onClick={() => onToggleLevel(lvl.value, !visibleRiskLevels[lvl.value])}
                className={cn(
                  "flex h-6 w-full cursor-pointer items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-muted/70 active:bg-muted disabled:cursor-not-allowed",
                  (!available || empty) && "opacity-45",
                  available && !shown && "opacity-60"
                )}
              >
                {/* filled means shown */}
                <span
                  className="size-3 shrink-0 rounded-[3px] border-2 transition-colors"
                  style={{ borderColor: lvl.color, backgroundColor: shown ? lvl.color : "transparent" }}
                />
                <span className={cn("flex-1 truncate text-[11px] font-medium text-foreground", !shown && "line-through decoration-muted-foreground/60")}>
                  {name}
                </span>
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                  {pct === null ? lvl.value : `${pct.toFixed(1)}%`}
                </span>
                {/* show hide cue */}
                {available &&
                  (shown ? (
                    <Eye aria-hidden className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <EyeOff aria-hidden className="size-3 shrink-0 text-muted-foreground" />
                  ))}
              </button>
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
};
