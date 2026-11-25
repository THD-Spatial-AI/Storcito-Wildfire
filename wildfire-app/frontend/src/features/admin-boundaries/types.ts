/** engine level ids */
export type BoundaryLevelId = "country" | "community" | "province" | "municipality";

export interface BoundaryItem {
  code: string;
  name: string;
  parent_code: string | null;
  covered: boolean;
}

export interface BoundaryDetail {
  level: BoundaryLevelId;
  code: string;
  name: string;
  covered: boolean;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface BoundaryLevelConfig {
  id: BoundaryLevelId;
  labelKey: string;
  label: string;
  /** usable model area */
  selectable: boolean;
}

/** chosen boundary path */
export interface BoundarySelection extends BoundaryDetail {
  path: BoundaryItem[];
}
