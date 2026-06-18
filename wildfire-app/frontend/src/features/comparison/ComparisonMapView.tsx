import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import { AlertCircle, ArrowLeftRight, Flame, Loader2 } from "lucide-react";

import "ol/ol.css";
import OLMap from "ol/Map";
import View from "ol/View";
import { unByKey } from "ol/Observable";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import TileWMS from "ol/source/TileWMS";
import { fromLonLat, get as getProj, transformExtent } from "ol/proj";
import { intersects as extentsIntersect } from "ol/extent";
import proj4 from "proj4";
import { register as registerProj4 } from "ol/proj/proj4";

import axios from "@/lib/axios";
import type { Model } from "@/features/model-dashboard/services/modelService";

interface ComparisonMapViewProps {
  model1: Model;
  model2: Model;
}

interface ModelResultStub {
  id: number;
  model_id: number;
  geoserver_status: string;
}

interface LayerBounds {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
  crs?: string;
}

interface LayerInfo {
  wms_url: string;
  layer_name: string;
  status: string;
  bounds?: LayerBounds;
}

const EPSG_32629 = "EPSG:32629";
const FIRE_RISK_DEFAULT_OPACITY = 0.65;
const FIRE_RISK_STYLE_VERSION = "risk-style-readable-v4";
const ensureUtmProj = () => {
  registerProj4(proj4);
  if (!getProj(EPSG_32629)) {
    proj4.defs(EPSG_32629, "+proj=utm +zone=29 +datum=WGS84 +units=m +no_defs +type=crs");
  }
};

const buildWMSLayer = (info: LayerInfo): TileLayer<TileWMS> =>
  new TileLayer({
    source: new TileWMS({
      url: info.wms_url,
      params: {
        LAYERS: info.layer_name,
        STYLES: "fire_risk_classified",
        STYLE_VERSION: FIRE_RISK_STYLE_VERSION,
        TILED: true,
        FORMAT: "image/png",
        TRANSPARENT: true,
      },
      serverType: "geoserver",
      crossOrigin: "anonymous",
    }),
    opacity: FIRE_RISK_DEFAULT_OPACITY,
    className: "fire-risk-overlay",
  });

const boundsToExtent3857 = (bounds: LayerBounds): number[] | null => {
  const sourceCrs = bounds.crs || "EPSG:4326";
  if (sourceCrs === EPSG_32629) ensureUtmProj();
  try {
    return transformExtent(
      [bounds.minx, bounds.miny, bounds.maxx, bounds.maxy],
      sourceCrs,
      "EPSG:3857"
    );
  } catch {
    return null;
  }
};

interface SideState {
  loading: boolean;
  error: string | null;
  layerReady: boolean;
  layerName?: string;
}

const LEGEND = [
  { label: "Very Low", color: "#2563eb" },
  { label: "Low", color: "#16a34a" },
  { label: "Moderate", color: "#eab308" },
  { label: "High", color: "#ea580c" },
  { label: "Very High", color: "#dc2626" },
] as const;

export const ComparisonMapView: FC<ComparisonMapViewProps> = ({ model1, model2 }) => {
  const { t } = useTranslation();

  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const leftMapRef = useRef<OLMap | null>(null);
  const rightMapRef = useRef<OLMap | null>(null);
  const leftLayerRef = useRef<TileLayer<TileWMS> | null>(null);
  const rightLayerRef = useRef<TileLayer<TileWMS> | null>(null);
  const syncingRef = useRef(false);

  const [leftState, setLeftState] = useState<SideState>({
    loading: true,
    error: null,
    layerReady: false,
  });
  const [rightState, setRightState] = useState<SideState>({
    loading: true,
    error: null,
    layerReady: false,
  });
  const [synced, setSynced] = useState(true);
  const [leftExtent, setLeftExtent] = useState<number[] | null>(null);
  const [rightExtent, setRightExtent] = useState<number[] | null>(null);

  const fitView = (map: OLMap | null, extent: number[]) => {
    if (!map) return;
    syncingRef.current = true;
    map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 14, duration: 0 });
    syncingRef.current = false;
  };

  // ---------- init maps ----------
  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return;

    const sharedView = () =>
      new View({
        center: fromLonLat([0, 30]),
        zoom: 3,
      });

    const left = new OLMap({
      target: leftRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: sharedView(),
      controls: [],
    });
    const right = new OLMap({
      target: rightRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: sharedView(),
      controls: [],
    });
    leftMapRef.current = left;
    rightMapRef.current = right;

    return () => {
      left.setTarget(undefined);
      right.setTarget(undefined);
      leftMapRef.current = null;
      rightMapRef.current = null;
    };
  }, []);

  // ---------- sync handlers ----------
  useEffect(() => {
    const left = leftMapRef.current;
    const right = rightMapRef.current;
    if (!left || !right) return;

    const sync = (source: OLMap, target: OLMap) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      const s = source.getView();
      const tv = target.getView();
      tv.setCenter(s.getCenter());
      tv.setResolution(s.getResolution());
      tv.setRotation(s.getRotation());
      syncingRef.current = false;
    };

    if (!synced) return;

    const lView = left.getView();
    const rView = right.getView();
    const keys = [
      lView.on("change:center", () => sync(left, right)),
      lView.on("change:resolution", () => sync(left, right)),
      lView.on("change:rotation", () => sync(left, right)),
      rView.on("change:center", () => sync(right, left)),
      rView.on("change:resolution", () => sync(right, left)),
      rView.on("change:rotation", () => sync(right, left)),
    ];
    // Align once immediately.
    sync(left, right);

    return () => {
      keys.forEach((k) => unByKey(k));
    };
  }, [synced]);

  // ---------- load layer for a side ----------
  const loadSide = async (
    model: Model,
    mapRef: React.MutableRefObject<OLMap | null>,
    layerRef: React.MutableRefObject<TileLayer<TileWMS> | null>,
    setState: React.Dispatch<React.SetStateAction<SideState>>,
    onBoundsLoaded?: (extent: number[]) => void
  ) => {
    setState({ loading: true, error: null, layerReady: false });
    try {
      const resultsRes = await axios.get(`/models/${model.id}/results`);
      const results: ModelResultStub[] = Array.isArray(resultsRes.data?.data)
        ? resultsRes.data.data
        : [];
      const configured = results.find((r) => r.geoserver_status === "configured");
      if (!configured) {
        setState({
          loading: false,
          error: t(
            "simulationComparison.noConfiguredLayer",
            "No GeoServer layer is configured for this model yet."
          ),
          layerReady: false,
        });
        return;
      }

      const layerRes = await axios.get(`/results/${configured.id}/layer`);
      const info: LayerInfo | undefined = layerRes.data?.data;
      if (!info?.wms_url || !info.layer_name) {
        setState({
          loading: false,
          error: t("simulationComparison.incompleteLayer", "Layer configuration is incomplete"),
          layerReady: false,
        });
        return;
      }

      const map = mapRef.current;
      if (!map) return;

      // Remove previous layer if any.
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      const newLayer = buildWMSLayer(info);
      map.addLayer(newLayer);
      layerRef.current = newLayer;

      if (info.bounds) {
        const extent = boundsToExtent3857(info.bounds);
        if (extent) onBoundsLoaded?.(extent);
      }

      setState({
        loading: false,
        error: null,
        layerReady: true,
        layerName: info.layer_name,
      });
    } catch (err) {
      let message = t(
        "simulationComparison.loadLayerFailed",
        "Failed to load layer from GeoServer"
      );
      if (typeof err === "object" && err && "response" in err) {
        const data = (err as { response?: { data?: { message?: string } } }).response?.data;
        if (data?.message) message = data.message;
      }
      setState({ loading: false, error: message, layerReady: false });
    }
  };

  // ---------- react to model changes ----------
  useEffect(() => {
    setLeftExtent(null);
    loadSide(model1, leftMapRef, leftLayerRef, setLeftState, (extent) => {
      fitView(leftMapRef.current, extent);
      setLeftExtent(extent);
    });
    return () => {
      const map = leftMapRef.current;
      if (map && leftLayerRef.current) {
        map.removeLayer(leftLayerRef.current);
        leftLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model1.id]);

  useEffect(() => {
    setRightExtent(null);
    loadSide(model2, rightMapRef, rightLayerRef, setRightState, (extent) => {
      fitView(rightMapRef.current, extent);
      setRightExtent(extent);
    });
    return () => {
      const map = rightMapRef.current;
      if (map && rightLayerRef.current) {
        map.removeLayer(rightLayerRef.current);
        rightLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model2.id]);

  // Once both extents are known, decide whether syncing is meaningful. If the
  // two models cover different areas (extents don't overlap), syncing would hide
  // one model off-screen — so drop to Independent and refit each to its own area.
  useEffect(() => {
    if (!leftExtent || !rightExtent) return;
    if (!extentsIntersect(leftExtent, rightExtent)) {
      setSynced(false);
      fitView(leftMapRef.current, leftExtent);
      fitView(rightMapRef.current, rightExtent);
    }
  }, [leftExtent, rightExtent]);

  return (
    <div className="flex flex-col h-full min-h-[520px]">
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span>
            {synced
              ? t("simulationComparison.mapHint", "Pan/zoom either map — views stay in sync.")
              : t(
                  "simulationComparison.mapHintIndependent",
                  "These models cover different areas — each map shows its own model."
                )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSynced((s) => !s)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
            synced
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-card border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          {synced
            ? t("simulationComparison.synced", "Synced")
            : t("simulationComparison.independent", "Independent")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[480px]">
        <MapPane model={model1} accentColor="blue" state={leftState} mapRef={leftRef} />
        <MapPane model={model2} accentColor="violet" state={rightState} mapRef={rightRef} />
      </div>

      <div className="mt-3 bg-card border border-border rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("modelResults.risk.distribution", "Risk Level")}
        </span>
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface MapPaneProps {
  model: Model;
  accentColor: "blue" | "violet";
  state: SideState;
  mapRef: React.RefObject<HTMLDivElement | null>;
}

const MapPane: FC<MapPaneProps> = ({ model, accentColor, state, mapRef }) => {
  const { t } = useTranslation();
  const accent =
    accentColor === "blue"
      ? {
          dot: "bg-blue-500",
          tagBg: "bg-blue-100 dark:bg-blue-900/30",
          tagText: "text-blue-700 dark:text-blue-300",
        }
      : {
          dot: "bg-violet-500",
          tagBg: "bg-violet-100 dark:bg-violet-900/30",
          tagText: "text-violet-700 dark:text-violet-300",
        };

  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${accent.dot}`} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate leading-tight">
              {model.title}
            </p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">
              {model.region || t("simulationComparison.noRegion", "No region")}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${accent.tagBg} ${accent.tagText}`}
        >
          {accentColor === "blue"
            ? t("simulationComparison.baseline", "Baseline")
            : t("simulationComparison.comparison", "Comparison")}
        </span>
      </div>

      <div className="relative flex-1 min-h-[420px]">
        <div ref={mapRef} className="absolute inset-0" />

        {state.loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("simulationComparison.loadingLayer", "Loading layer…")}
            </div>
          </div>
        )}

        {state.error && !state.loading && (
          <div className="absolute top-2 left-2 right-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-start gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{state.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
