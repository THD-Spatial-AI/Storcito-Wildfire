import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import { AlertCircle, ArrowLeftRight, Flame, Loader2, Maximize2, Minimize2 } from "lucide-react";
import {
  PlayPauseButton,
  PlayerStat,
  formatFrameDate,
} from "@/features/model-results";

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

import { getModelResults, getResultLayer } from "@/features/model-results";
import type { Model } from "@/features/model-dashboard";

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

interface AvailableLayer {
  key: string;
  title: string;
  layer_name: string;
}

interface LayerInfo {
  wms_url: string;
  layer_name: string;
  status: string;
  bounds?: LayerBounds;
  available_layers?: AvailableLayer[];
}

// One layer per day.
const DAILY_FRAME_KEY = /^risk_\d{4}-\d{2}-\d{2}$/;

const extractDailyFrames = (info: LayerInfo): AvailableLayer[] =>
  (info.available_layers ?? [])
    .filter((l) => DAILY_FRAME_KEY.test(l.key))
    .sort((a, b) => a.key.localeCompare(b.key));

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

  // Daily frame player.
  const [leftFrames, setLeftFrames] = useState<AvailableLayer[]>([]);
  const [rightFrames, setRightFrames] = useState<AvailableLayer[]>([]);
  // null = overall map.
  const [frameIndex, setFrameIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const frameCount = Math.max(leftFrames.length, rightFrames.length);
  const frameForSide = (frames: AvailableLayer[], index: number | null): AvailableLayer | null =>
    index === null || frames.length === 0 ? null : frames[index % frames.length];
  const leftFrame = frameForSide(leftFrames, frameIndex);
  const rightFrame = frameForSide(rightFrames, frameIndex);

  // Swap in place.
  useEffect(() => {
    if (leftFrame) leftLayerRef.current?.getSource()?.updateParams({ LAYERS: leftFrame.layer_name });
  }, [leftFrame]);
  useEffect(() => {
    if (rightFrame) rightLayerRef.current?.getSource()?.updateParams({ LAYERS: rightFrame.layer_name });
  }, [rightFrame]);

  useEffect(() => {
    if (!playing) return;
    if (frameCount < 2) {
      setPlaying(false);
      return;
    }
    const advance = () => setFrameIndex((prev) => ((prev ?? -1) + 1) % frameCount);
    advance();
    const id = window.setInterval(advance, 2000);
    return () => clearInterval(id);
  }, [playing, frameCount]);

  // ---------- fullscreen ----------
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      // Refresh after resize.
      window.setTimeout(() => {
        leftMapRef.current?.updateSize();
        rightMapRef.current?.updateSize();
      }, 100);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  };

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

  // Load side layer.
  const loadSide = async (
    model: Model,
    mapRef: React.MutableRefObject<OLMap | null>,
    layerRef: React.MutableRefObject<TileLayer<TileWMS> | null>,
    setState: React.Dispatch<React.SetStateAction<SideState>>,
    setFrames: React.Dispatch<React.SetStateAction<AvailableLayer[]>>,
    onBoundsLoaded?: (extent: number[]) => void
  ) => {
    setState({ loading: true, error: null, layerReady: false });
    setFrames([]);
    try {
      const results = await getModelResults<ModelResultStub>(model.id);
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

      const info = await getResultLayer<LayerInfo>(configured.id);
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

      // Drop previous layer.
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      const newLayer = buildWMSLayer(info);
      map.addLayer(newLayer);
      layerRef.current = newLayer;
      setFrames(extractDailyFrames(info));

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

  // React to model change.
  useEffect(() => {
    setLeftExtent(null);
    setPlaying(false);
    setFrameIndex(null);
    loadSide(model1, leftMapRef, leftLayerRef, setLeftState, setLeftFrames, (extent) => {
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
    setPlaying(false);
    setFrameIndex(null);
    loadSide(model2, rightMapRef, rightLayerRef, setRightState, setRightFrames, (extent) => {
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

  // Disjoint: go independent.
  useEffect(() => {
    if (!leftExtent || !rightExtent) return;
    if (!extentsIntersect(leftExtent, rightExtent)) {
      setSynced(false);
      fitView(leftMapRef.current, leftExtent);
      fitView(rightMapRef.current, rightExtent);
    }
  }, [leftExtent, rightExtent]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full min-h-[520px] ${isFullscreen ? "bg-background p-4" : ""}`}
    >
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSynced((s) => !s)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
              synced
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            {synced
              ? t("simulationComparison.synced", "Synced")
              : t("simulationComparison.independent", "Independent")}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-card border-border text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
            {isFullscreen
              ? t("simulationComparison.exitFullscreen", "Exit fullscreen")
              : t("simulationComparison.fullscreen", "Fullscreen")}
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[480px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
          <MapPane
            model={model1}
            accentColor="blue"
            state={leftState}
            mapRef={leftRef}
            frameDate={leftFrame ? formatFrameDate(leftFrame.key.slice(5)) : null}
          />
          <MapPane
            model={model2}
            accentColor="violet"
            state={rightState}
            mapRef={rightRef}
            frameDate={rightFrame ? formatFrameDate(rightFrame.key.slice(5)) : null}
          />
        </div>

        {frameCount >= 2 && (
          <div className="absolute bottom-4 left-1/2 z-[1500] -translate-x-1/2 overflow-hidden rounded-xl border border-border/60 bg-card/95 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-4 px-3 py-2">
              <PlayPauseButton
                playing={playing}
                onToggle={() => setPlaying((v) => !v)}
                playLabel={t("modelResults.layer.play", "Play")}
                pauseLabel={t("modelResults.layer.pause", "Pause")}
              />
              {frameIndex !== null ? (
                <>
                  <PlayerStat
                    label={t("modelResults.layer.day", "Day")}
                    value={`${frameIndex + 1} / ${frameCount}`}
                  />
                  {leftFrame && (
                    <PlayerStat
                      className="border-l border-border pl-4"
                      label={t("simulationComparison.baseline", "Baseline")}
                      value={formatFrameDate(leftFrame.key.slice(5))}
                    />
                  )}
                  {rightFrame && (
                    <PlayerStat
                      className="border-l border-border pl-4"
                      label={t("simulationComparison.comparison", "Comparison")}
                      value={formatFrameDate(rightFrame.key.slice(5))}
                    />
                  )}
                </>
              ) : (
                <span className="text-xs font-semibold text-foreground">
                  {t("modelResults.layer.playDaily", "Animate daily risk maps")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 bg-card border border-border/60 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("modelResults.risk.distribution", "Risk Level")}
        </span>
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/10"
              style={{ backgroundColor: l.color }}
            />
            <span className="text-xs font-medium text-foreground">{l.label}</span>
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
  frameDate?: string | null;
}

const MapPane: FC<MapPaneProps> = ({ model, accentColor, state, mapRef, frameDate }) => {
  const { t } = useTranslation();
  const accent =
    accentColor === "blue"
      ? {
          dot: "bg-blue-500",
          tagBg: "bg-blue-500/10 ring-1 ring-blue-500/20",
          tagText: "text-blue-700 dark:text-blue-300",
        }
      : {
          dot: "bg-violet-500",
          tagBg: "bg-violet-500/10 ring-1 ring-violet-500/20",
          tagText: "text-violet-700 dark:text-violet-300",
        };

  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border/60 bg-muted/30">
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
        <div className="flex items-center gap-1.5 shrink-0">
          {frameDate && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary text-primary-foreground tabular-nums">
              {frameDate}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${accent.tagBg} ${accent.tagText}`}
          >
            {accentColor === "blue"
              ? t("simulationComparison.baseline", "Baseline")
              : t("simulationComparison.comparison", "Comparison")}
          </span>
        </div>
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
          <div className="absolute top-2 left-2 right-2 rounded-lg bg-red-500/10 px-3 py-2 flex items-start gap-2 ring-1 ring-red-500/20 shadow-sm backdrop-blur-sm">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{state.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
