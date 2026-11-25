import { useEffect, useRef, useState, type FC } from "react";
import { ChevronRight, Loader2, RotateCw } from "lucide-react";
import { useTranslation } from "@/i18n";

import { BOUNDARY_LEVELS } from "../config";
import { useBoundaryHierarchy } from "../hooks/useBoundaryHierarchy";
import type { BoundaryItem, BoundaryLevelConfig, BoundaryLevelId, BoundarySelection } from "../types";
import { leadingAutoPicks } from "../utils";
import { BoundaryLevelSelect } from "./BoundaryLevelSelect";

interface BoundaryHierarchyFilterProps {
  onApply: (selection: BoundarySelection) => void;
  onError?: (error: unknown) => void;
  /** area name set */
  activeName?: string;
  levels?: BoundaryLevelConfig[];
  /** visible options only */
  filterItems?: (level: BoundaryLevelId, items: BoundaryItem[]) => BoundaryItem[];
  /** usable as area */
  canApply?: (level: BoundaryLevelId, item: BoundaryItem) => boolean;
}

/** country → community */
export const BoundaryHierarchyFilter: FC<BoundaryHierarchyFilterProps> = ({
  onApply,
  onError,
  activeName,
  levels = BOUNDARY_LEVELS,
  filterItems,
  canApply,
}) => {
  const { t } = useTranslation();
  const lastApplied = useRef<string | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);

  const hierarchy = useBoundaryHierarchy({
    levels,
    onError,
    filterItems,
    canApply,
    onApply: (selection) => {
      lastApplied.current = selection.name;
      onApply(selection);
    },
  });
  const { options, selected, loading, resetUserChoices } = hierarchy;

  // map click elsewhere
  useEffect(() => {
    if (lastApplied.current !== undefined && activeName !== lastApplied.current) {
      lastApplied.current = undefined;
      resetUserChoices();
    }
  }, [activeName, resetUserChoices]);

  if (hierarchy.failed) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
        <span>{t("boundaries.unavailableShort", "Lists unavailable. Click on the map instead.")}</span>
        <button
          type="button"
          onClick={hierarchy.retry}
          className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground hover:underline"
        >
          <RotateCw className="h-3 w-3" />
          {t("boundaries.retry", "Retry")}
        </button>
      </div>
    );
  }

  // leading auto-picked levels
  const autoCount = expanded ? 0 : leadingAutoPicks(options, selected, levels.length - 1);

  return (
    <div className="space-y-2.5" data-tour="boundary-filter">
      {autoCount > 0 && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex min-w-0 items-center gap-1 truncate font-medium text-foreground">
            {selected.slice(0, autoCount).map((item, index) => (
              <span key={item?.code} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                {item?.name}
              </span>
            ))}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground hover:underline"
          >
            {t("boundaries.change", "Change")}
          </button>
        </div>
      )}

      {levels.map((level, index) => {
        if (index < autoCount) return null;
        const parentMissing = index > 0 && !selected[index - 1];
        if (parentMissing && options[index].length === 0 && !loading[index]) return null;
        return (
          <BoundaryLevelSelect
            key={level.id}
            label={t(level.labelKey, level.label)}
            items={options[index]}
            value={selected[index]}
            loading={loading[index]}
            clearable={index > 0}
            onChange={(item) => hierarchy.select(index, item)}
          />
        );
      })}

      {hierarchy.applying && (
        <p className="md-fade-in flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("boundaries.applying", "Loading boundary…")}
        </p>
      )}
    </div>
  );
};
