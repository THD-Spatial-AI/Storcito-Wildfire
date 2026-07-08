import { FC, ReactNode } from "react";
import { Layers, MapPin, Route } from "lucide-react";
import { useTranslation } from "@/i18n";

import type { RiskDistribution } from "../hooks/useRiskMetrics";
import {
  RISK_LEVELS,
  type RiskLevelValue,
  type VisibleRiskLevels,
} from "../viewer-config";

const PanelCheckbox: FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  accent: "emerald" | "orange";
}> = ({ checked, disabled = false, onChange, accent }) => (
  <div className="relative flex items-center justify-center">
    <input
      type="checkbox"
      className={`peer appearance-none w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed ${
        accent === "emerald"
          ? "checked:bg-emerald-500 checked:border-emerald-500"
          : "checked:bg-orange-500 checked:border-orange-500"
      }`}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <svg
      className="absolute w-2 h-2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
    </svg>
  </div>
);

const PanelCard: FC<{
  position: string;
  headerGradient: string;
  iconGradient: string;
  title: string;
  children: ReactNode;
}> = ({ position, headerGradient, iconGradient, title, children }) => (
  <div
    className={`absolute ${position} z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-2xl overflow-hidden w-[156px] transition-all duration-300`}
  >
    <div className={`px-2.5 py-1.5 ${headerGradient} flex items-center gap-2`}>
      <div
        className={`w-5 h-5 rounded-md ${iconGradient} shadow-sm flex items-center justify-center`}
      >
        <Layers className="w-3 h-3 text-white" />
      </div>
      <span className="text-[11px] font-bold uppercase text-foreground tracking-tight">
        {title}
      </span>
    </div>
    {children}
  </div>
);

interface OverlaysPanelProps {
  roadsVisible: boolean;
  labelsVisible: boolean;
  onRoadsChange: (visible: boolean) => void;
  onLabelsChange: (visible: boolean) => void;
}

// Top-left card toggling the transparent roads / labels reference tiles.
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
      headerGradient="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-emerald-500/10"
      iconGradient="bg-gradient-to-br from-emerald-500 to-teal-500"
      title={t("modelResults.layers.title", "Overlays")}
    >
      <div className="p-1 space-y-0">
        <label className="flex items-center gap-2 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
          <PanelCheckbox checked={roadsVisible} onChange={onRoadsChange} accent="emerald" />
          <Route className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1">
            {t("modelResults.layers.roads", "Roads")}
          </span>
        </label>
        <label className="flex items-center gap-2 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
          <PanelCheckbox checked={labelsVisible} onChange={onLabelsChange} accent="emerald" />
          <MapPin className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1">
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

// Bottom-left card with per-class toggles and share percentages.
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
      position="bottom-10 left-2"
      headerGradient="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b border-orange-500/10"
      iconGradient="bg-gradient-to-br from-orange-500 to-red-500"
      title={t("modelResults.legend.title", "Fire Risk")}
    >
      <div className="p-1 space-y-0">
        <label className="flex items-center gap-2 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-b border-border/40 mb-1.5 pb-2 group">
          <PanelCheckbox checked={allRiskLevelsVisible} onChange={onToggleAll} accent="orange" />
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex-1">
            {t("modelResults.legend.allLevels", "All available levels")}
          </span>
        </label>
        {RISK_LEVELS.map((lvl) => {
          const isAvailable = riskLevelAvailability[lvl.value];
          const isVisibleInStyle = visibleRiskLevels[lvl.value];
          const percent = riskDistribution?.[lvl.metricKey] ?? null;
          const levelStateClass = !isAvailable
            ? "cursor-not-allowed opacity-[0.4]"
            : isVisibleInStyle
              ? "cursor-pointer"
              : "cursor-pointer opacity-[0.6]";
          return (
            <label
              key={lvl.value}
              className={`flex items-center gap-2 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group ${levelStateClass}`}
            >
              <PanelCheckbox
                checked={isVisibleInStyle && isAvailable}
                disabled={!isAvailable}
                onChange={(checked) => onToggleLevel(lvl.value, checked)}
                accent="orange"
              />
              <span
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: lvl.color, boxShadow: `0 0 6px ${lvl.color}66` }}
              />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1">
                {t(`modelResults.legend.levels.${lvl.id}`, lvl.label)}
              </span>
              <span className="text-[9px] font-bold text-slate-400">
                {percent === null ? lvl.value : `${percent.toFixed(1)}%`}
              </span>
            </label>
          );
        })}
      </div>
      <div className="px-3 pb-3 pt-0.5">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-[#9ca3af] via-[#16a34a] via-[#eab308] via-[#f97316] to-[#dc2626] shadow-inner" />
      </div>
    </PanelCard>
  );
};
