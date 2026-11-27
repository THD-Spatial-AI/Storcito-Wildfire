// pure helpers results
import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import type Map from "ol/Map";
import { get as getProj, transformExtent } from "ol/proj";
import proj4 from "proj4";
import { register as registerProj4 } from "ol/proj/proj4";
import { riskStyle } from "@/lib/riskPalette";
import XYZ from "ol/source/XYZ";
import { withCartoBasemapKey } from "@/utils/carto-basemap";

import {
  EPSG_32629,
  FIRE_RISK_DEFAULT_OPACITY,
  FIRE_RISK_STYLE_VERSION,
  type LayerBounds,
  type LayerInfo,
} from "./viewer-config";

// request url given
export function buildWMSLayer(
  info: LayerInfo,
  styleName: string,
  zIndex: number
): TileLayer<TileWMS> {
  const source = new TileWMS({
    url: info.wms_url,
    params: {
      LAYERS: info.layer_name,
      STYLES: riskStyle(styleName),
      STYLE_VERSION: FIRE_RISK_STYLE_VERSION,
      // same every viewer
      ...(info.version != null ? { RV: info.version } : {}),
      TILED: true,
      FORMAT: "image/png",
      TRANSPARENT: true,
    },
    serverType: "geoserver",
    crossOrigin: "anonymous",
  });
  const layer = new TileLayer({
    source,
    opacity: FIRE_RISK_DEFAULT_OPACITY,
    className: "ol-layer fire-risk-overlay mix-blend-multiply",
  });
  layer.setZIndex(zIndex);
  return layer;
}

export function fitMapToBounds(map: Map, bounds: LayerBounds) {
  const { minx, miny, maxx, maxy, crs } = bounds;
  const sourceCrs = crs || "EPSG:4326";

  if (sourceCrs === EPSG_32629 && !getProj(EPSG_32629)) {
    proj4.defs(EPSG_32629, "+proj=utm +zone=29 +datum=WGS84 +units=m +no_defs +type=crs");
    registerProj4(proj4);
  }

  try {
    const extent = transformExtent([minx, miny, maxx, maxy], sourceCrs, "EPSG:3857");
    // fit synchronously before
    map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 14 });
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[ModelResultsViewer] bounds fit failed", err);
  }
}

export function windCardinal(degrees: number): string {
  const labels = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return labels[Math.round(degrees / 22.5) % labels.length];
}

export function formatMetric(value: number | null | undefined, digits = 1): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err && "response" in err) {
    const data = (err as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return data.message;
  }
  return fallback;
}

/** names above risk */
export function createLabelsLayer(dark: boolean): TileLayer<XYZ> {
  const style = dark ? "dark_only_labels" : "light_only_labels";
  const layer = new TileLayer({
    source: new XYZ({
      url: withCartoBasemapKey(`https://{a-d}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`),
      attributions: '© <a href="https://carto.com/attributions">CARTO</a>',
      crossOrigin: "anonymous",
    }),
    className: "ol-layer risk-labels",
  });
  layer.setZIndex(900);
  return layer;
}

/** class at point */
export async function fetchRiskClass(
  wmsUrl: string,
  layerName: string,
  coordinate: number[],
  resolution: number,
  projection: string
): Promise<number | null> {
  const source = new TileWMS({ url: wmsUrl, params: { LAYERS: layerName }, serverType: "geoserver" });
  const url = source.getFeatureInfoUrl(coordinate, resolution, projection, {
    INFO_FORMAT: "application/json",
    QUERY_LAYERS: layerName,
    FEATURE_COUNT: 1,
  });
  if (!url) return null;
  // proxy allows any origin
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as { features?: { properties?: Record<string, unknown> }[] };
  const value = Object.values(data.features?.[0]?.properties ?? {})[0];
  return typeof value === "number" && value >= 1 && value <= 5 ? Math.round(value) : null;
}
