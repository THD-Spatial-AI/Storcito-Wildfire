import type { BoundaryLevelConfig } from "./types";

/** official spanish hierarchy */
export const BOUNDARY_LEVELS: BoundaryLevelConfig[] = [
  { id: "country", labelKey: "boundaries.levels.country", label: "Country", selectable: false },
  { id: "community", labelKey: "boundaries.levels.community", label: "Autonomous community", selectable: true },
  { id: "province", labelKey: "boundaries.levels.province", label: "Province", selectable: true },
  { id: "municipality", labelKey: "boundaries.levels.municipality", label: "Municipality", selectable: true },
];
