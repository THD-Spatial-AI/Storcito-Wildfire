import { FC, ReactNode } from "react";
import { Flame, Layers, MapPin, Route } from "lucide-react";
import { useTranslation } from "@/i18n";

import type { RiskDistribution } from "../hooks/useRiskMetrics";
import { RISK_LEVELS, type RiskLevelValue, type VisibleRiskLevels } from "../viewer-config";

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

export const PanelCard: FC<{
  position?: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}> = ({ position, icon, title, children }) => (
  <section
    className={`md-fade-in ${position ? `absolute ${position}` : ""} z-10 w-44 overflow-hidden rounded-xl border border-border/60 bg-card/95 text-xs shadow-lg backdrop-blur-md transition-all duration-300`}
  >
    <header className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-2.5 py-1.5">
      <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
        {title}
      </span>
    </header>
    {children}
  </section>
);

const rowClass =
  "group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/60";

interface OverlaysPanelProps {
  roadsVisible: boolean;
  labelsVisible: boolean;
  onRoadsChange: (visible: boolean) => void;
  onLabelsChange: (visible: boolean) => void;
}

// Roads / labels toggles.
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

// Risk class toggles.
export const RiskLegendPanel: FC<RiskLegendPanelProps> = ({
  visibleRiskLevels,
  riskLevelAvailability,
  riskDistribution,
  allRiskLevelsVisible,
  onToggleAll,
  onToggleLevel,
}) => {
  const { t } = useTranslation();

  return (
    <PanelCard
      icon={<Flame className="h-3.5 w-3.5" />}
      title={t("modelResults.legend.title", "Fire Risk")}
    >
      <div className="p-1">
        <label className={`${rowClass} mb-1 cursor-pointer border-b border-border/60 pb-1.5`}>
          <PanelCheckbox checked={allRiskLevelsVisible} onChange={onToggleAll} accent="orange" />
          <span className="flex-1 text-[11px] font-semibold text-foreground">
            {t("modelResults.legend.allLevels", "All available levels")}
          </span>
        </label>
        {RISK_LEVELS.map((lvl) => {
          const isAvailable = riskLevelAvailability[lvl.value];
          const isVisibleInStyle = visibleRiskLevels[lvl.value];
          const percent = riskDistribution?.[lvl.metricKey] ?? null;
          const levelStateClass = !isAvailable
            ? "cursor-not-allowed opacity-40"
            : isVisibleInStyle
              ? "cursor-pointer"
              : "cursor-pointer opacity-60";
          return (
            <label key={lvl.value} className={`${rowClass} ${levelStateClass}`}>
              <PanelCheckbox
                checked={isVisibleInStyle && isAvailable}
                disabled={!isAvailable}
                onChange={(checked) => onToggleLevel(lvl.value, checked)}
                accent="orange"
              />
              <span
                className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: lvl.color }}
              />
              <span className="flex-1 text-[11px] font-medium text-foreground">
                {t(`modelResults.legend.levels.${lvl.id}`, lvl.label)}
              </span>
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                {percent === null ? lvl.value : `${percent.toFixed(1)}%`}
              </span>
            </label>
          );
        })}
      </div>
      <div className="border-t border-border/60 px-3 py-2">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-[#9ca3af] via-[#16a34a] via-[#eab308] via-[#f97316] to-[#dc2626]" />
        <div className="mt-1 flex justify-between text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>{t("modelResults.legend.levels.low", "Low")}</span>
          <span>{t("modelResults.legend.levels.very_high", "Very High")}</span>
        </div>
      </div>
    </PanelCard>
  );
};
