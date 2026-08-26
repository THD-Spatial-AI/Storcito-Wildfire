import type { RiskLevelValue, VisibleRiskLevels } from "./viewer-config";

export interface RiskStyleGroup {
  id: string;
  style: string;
  values: readonly RiskLevelValue[];
}

const ALL_LEVELS: readonly RiskLevelValue[] = [1, 2, 3, 4, 5];

const SUFFIX_GROUPS: readonly RiskStyleGroup[] = [
  {
    id: "all",
    style: "fire_risk_classified",
    values: ALL_LEVELS,
  },
  {
    id: "low_plus",
    style: "fire_risk_low_plus",
    values: [2, 3, 4, 5],
  },
  {
    id: "moderate_plus",
    style: "fire_risk_moderate_plus",
    values: [3, 4, 5],
  },
  {
    id: "high_plus",
    style: "fire_risk_high_plus",
    values: [4, 5],
  },
];

const SINGLE_LEVEL_GROUPS = new Map<RiskLevelValue, RiskStyleGroup>(
  ALL_LEVELS.map((value) => [
    value,
    {
      id: `level_${value}`,
      style: `fire_risk_level_${value}`,
      values: [value],
    },
  ])
);

/**
 * Produces an exact, non-overlapping cover of the checked risk levels while
 * using the fewest common GeoServer styles. The normal viewer state therefore
 * renders with one WMS request instead of five requests per map image.
 */
export function selectRiskStyleGroups(visible: VisibleRiskLevels): RiskStyleGroup[] {
  const remaining = new Set<RiskLevelValue>(
    ALL_LEVELS.filter((value) => visible[value])
  );
  if (remaining.size === 0) return [];

  const groups: RiskStyleGroup[] = [];
  for (const group of SUFFIX_GROUPS) {
    if (!group.values.every((value) => remaining.has(value))) continue;
    groups.push(group);
    group.values.forEach((value) => remaining.delete(value));
    break;
  }

  ALL_LEVELS.forEach((value) => {
    if (!remaining.has(value)) return;
    const group = SINGLE_LEVEL_GROUPS.get(value);
    if (group) groups.push(group);
  });

  return groups;
}
