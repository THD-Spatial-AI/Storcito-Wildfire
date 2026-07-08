// Types and constants shared by the results-viewer modules.
import type TileLayer from "ol/layer/Tile";
import type TileWMS from "ol/source/TileWMS";

export interface ModelResult {
  id: number;
  model_id: number;
  geoserver_status: string;
}

export interface LayerBounds {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
  crs?: string;
}

export interface AvailableLayer {
  key: string;
  title: string;
  layer_name: string;
}

export interface LayerInfo {
  wms_url: string;
  layer_name: string;
  status: string;
  bounds?: LayerBounds;
  available_layers?: AvailableLayer[];
}

/** Per-day fire weather data */
export interface FrameWeather {
  wind_speed_kmh?: number | null;
  wind_direction_deg?: number | null;
  temperature_c?: number | null;
  relative_humidity_pct?: number | null;
  fwi?: number | null;
}

export const EPSG_32629 = "EPSG:32629";
export const POLL_INTERVAL_MS = 10_000;
// Raster transparency is applied only here; users adjust it with the opacity slider.
export const FIRE_RISK_DEFAULT_OPACITY = 0.7;
export const FIRE_RISK_STYLE_VERSION = "risk-style-storcito-v7";
export const MAP_REFERENCE_DARK_OPACITY = 0.95;
export const MAP_REFERENCE_LIGHT_ROADS_OPACITY = 0.82;
export const MAP_REFERENCE_LIGHT_LABELS_OPACITY = 0.62;
// Transparent transportation overlay, readable over the risk raster.
export const ESRI_TRANSPORTATION_REFERENCE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
export const ESRI_PLACES_REFERENCE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
export const ESRI_ATTRIBUTION = "© 2026, Deggendorf Institute of Technology | Esri contribution";

export const DAILY_FRAME_KEY_PATTERN = /^risk_(\d{4}-\d{2}-\d{2})$/;

export const RISK_LEVELS = [
  {
    id: "very_low",
    label: "Very Low",
    color: "#9ca3af",
    value: 1,
    style: "fire_risk_level_1",
    metricKey: "veryLow",
  },
  {
    id: "low",
    label: "Low",
    color: "#16a34a",
    value: 2,
    style: "fire_risk_level_2",
    metricKey: "low",
  },
  {
    id: "moderate",
    label: "Moderate",
    color: "#eab308",
    value: 3,
    style: "fire_risk_level_3",
    metricKey: "moderate",
  },
  {
    id: "high",
    label: "High",
    color: "#f97316",
    value: 4,
    style: "fire_risk_level_4",
    metricKey: "high",
  },
  {
    id: "very_high",
    label: "Very High",
    color: "#dc2626",
    value: 5,
    style: "fire_risk_level_5",
    metricKey: "veryHigh",
  },
] as const;

export type RiskLevelValue = (typeof RISK_LEVELS)[number]["value"];
export type VisibleRiskLevels = Record<RiskLevelValue, boolean>;

export interface RiskLayerEntry {
  value: RiskLevelValue;
  layer: TileLayer<TileWMS>;
}

export interface RiskLayerSelection {
  key: string;
  layerName: string;
}

export const DEFAULT_VISIBLE_RISK_LEVELS: VisibleRiskLevels = {
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
};

export const RISK_LEVEL_META: Record<string, { labelKey: string; chip: string }> = {
  very_low: {
    labelKey: "modelResults.legend.levels.very_low",
    chip: "bg-gray-400/15 text-gray-600",
  },
  low: { labelKey: "modelResults.legend.levels.low", chip: "bg-green-600/15 text-green-700" },
  moderate: {
    labelKey: "modelResults.legend.levels.moderate",
    chip: "bg-yellow-500/15 text-yellow-700",
  },
  high: { labelKey: "modelResults.legend.levels.high", chip: "bg-orange-500/15 text-orange-700" },
  very_high: {
    labelKey: "modelResults.legend.levels.very_high",
    chip: "bg-red-600/15 text-red-700",
  },
};
