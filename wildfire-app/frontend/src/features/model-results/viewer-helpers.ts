// Pure helpers for the results viewer (safe to unit test).
import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import type Map from "ol/Map";
import { get as getProj, transformExtent } from "ol/proj";
import proj4 from "proj4";
import { register as registerProj4 } from "ol/proj/proj4";

import {
  EPSG_32629,
  FIRE_RISK_DEFAULT_OPACITY,
  FIRE_RISK_STYLE_VERSION,
  type LayerBounds,
  type LayerInfo,
} from "./viewer-config";

export function buildWMSLayer(info: LayerInfo, styleName: string, zIndex: number): TileLayer<TileWMS> {
  const source = new TileWMS({
    url: info.wms_url,
    params: {
      LAYERS: info.layer_name,
      STYLES: styleName,
      STYLE_VERSION: FIRE_RISK_STYLE_VERSION,
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
    className: "ol-layer fire-risk-overlay ol-visible-in-maplibre mix-blend-multiply",
  });
  layer.setZIndex(zIndex);
  return layer;
}

export function fitMapToBounds(map: Map, bounds: LayerBounds) {
  const { minx, miny, maxx, maxy, crs } = bounds;
  const sourceCrs = crs || "EPSG:4326";

  if (sourceCrs === EPSG_32629) {
    registerProj4(proj4);
    if (!getProj(EPSG_32629)) {
      proj4.defs(EPSG_32629, "+proj=utm +zone=29 +datum=WGS84 +units=m +no_defs +type=crs");
    }
  }

  try {
    const extent = transformExtent([minx, miny, maxx, maxy], sourceCrs, "EPSG:3857");
    map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 250, maxZoom: 14 });
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
