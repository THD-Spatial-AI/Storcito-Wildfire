import { FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  Route,
} from "lucide-react";
import { useTranslation } from "@/i18n";

import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import XYZ from "ol/source/XYZ";
import type Map from "ol/Map";
import { get as getProj, transformExtent } from "ol/proj";
import proj4 from "proj4";
import { register as registerProj4 } from "ol/proj/proj4";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@spatialhub/ui";

import axios from "@/lib/axios";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { MapContainer } from "@/components/shared/MapContainer";
import { isMapLibreDarkLayerId, useMapStore } from "@/features/interactive-map/store/map-store";
import MapSearchBar from "@/features/interactive-map/MapSearchBar";
import { modelService, Model } from "@/features/model-dashboard/services/modelService";
import { WorkspaceSelector } from "@/components/workspace";
import { CreateWorkspaceModal } from "@/components/workspace";
import { type Workspace } from "@/components/workspace";
import { useWorkspaceStore } from "@/components/workspace";
import { useRiskMetrics } from "./hooks/useRiskMetrics";
import { AssessmentDetailsSidebar } from "./components/AssessmentDetailsSidebar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelResult {
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

interface ModelResultsViewerProps {
  modelId?: number;
}

// ---------------------------------------------------------------------------
// Constants & classification legend
// ---------------------------------------------------------------------------

const EPSG_32629 = "EPSG:32629";
const POLL_INTERVAL_MS = 10_000;
// Raster transparency is applied only here; users adjust it with the opacity slider.
const FIRE_RISK_DEFAULT_OPACITY = 0.7;
const FIRE_RISK_STYLE_VERSION = "risk-style-vivid-v5";
const MAP_REFERENCE_DARK_OPACITY = 0.95;
const MAP_REFERENCE_LIGHT_ROADS_OPACITY = 0.82;
const MAP_REFERENCE_LIGHT_LABELS_OPACITY = 0.62;
const FIRE_RISK_STYLE_VERY_LOW = "fire_risk_level_1";
const FIRE_RISK_STYLE_LOW = "fire_risk_level_2";
const FIRE_RISK_STYLE_MODERATE = "fire_risk_level_3";
const FIRE_RISK_STYLE_HIGH = "fire_risk_level_4";
const FIRE_RISK_STYLE_VERY_HIGH = "fire_risk_level_5";
const ESRI_TRANSPORTATION_REFERENCE_URL =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ESRI_PLACES_REFERENCE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION = "Sources: OpenStreetMap contributors, Esri, HERE, Garmin";

const RISK_LEVELS = [
  { label: "Very Low", color: "#2563eb", value: 1, style: FIRE_RISK_STYLE_VERY_LOW, metricKey: "veryLow" },
  { label: "Low", color: "#16a34a", value: 2, style: FIRE_RISK_STYLE_LOW, metricKey: "low" },
  { label: "Moderate", color: "#eab308", value: 3, style: FIRE_RISK_STYLE_MODERATE, metricKey: "moderate" },
  { label: "High", color: "#ea580c", value: 4, style: FIRE_RISK_STYLE_HIGH, metricKey: "high" },
  { label: "Very High", color: "#dc2626", value: 5, style: FIRE_RISK_STYLE_VERY_HIGH, metricKey: "veryHigh" },
] as const;

type RiskLevelValue = (typeof RISK_LEVELS)[number]["value"];
type VisibleRiskLevels = Record<RiskLevelValue, boolean>;
interface RiskLayerEntry {
  value: RiskLevelValue;
  layer: TileLayer<TileWMS>;
}

const DEFAULT_VISIBLE_RISK_LEVELS: VisibleRiskLevels = {
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
};

// ---------------------------------------------------------------------------
// Helpers (pure — safe to unit test)
// ---------------------------------------------------------------------------

function buildWMSLayer(info: LayerInfo, styleName: string, zIndex: number): TileLayer<TileWMS> {
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

function fitMapToBounds(map: Map, bounds: LayerBounds) {
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

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err && "response" in err) {
    const data = (err as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return data.message;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ModelResultsViewer: FC<ModelResultsViewerProps> = ({ modelId: propModelId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  useDocumentTitle(t("modelResults.title", "Model Results"));

  const resolvedModelId = propModelId ?? (paramId ? Number(paramId) : undefined);

  const { map } = useMapStore();
  const selectedBaseLayerId = useMapStore((s) => s.selectedBaseLayerId);
  const isDarkBaseLayer = isMapLibreDarkLayerId(selectedBaseLayerId);

  const [model, setModel] = useState<Model | null>(null);
  const [results, setResults] = useState<ModelResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [riskLayerEntries, setRiskLayerEntries] = useState<RiskLayerEntry[]>([]);
  const [availableLayers, setAvailableLayers] = useState<AvailableLayer[]>([]);
  const [selectedLayerKey, setSelectedLayerKey] = useState<string>("risk");
  const selectedLayerKeyRef = useRef<string>("risk");
  const [layerVisible, setLayerVisible] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState(FIRE_RISK_DEFAULT_OPACITY);
  const [visibleRiskLevels, setVisibleRiskLevels] = useState<VisibleRiskLevels>(DEFAULT_VISIBLE_RISK_LEVELS);
  const [tileErrors, setTileErrors] = useState(0);

  const [roadsVisible, setRoadsVisible] = useState(true);
  const [labelsVisible, setLabelsVisible] = useState(false);

  // Workspace + model selector state (mirrors AssessmentViewer).
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceModels, setWorkspaceModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [wsReloadKey, setWsReloadKey] = useState(0);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const preferredWorkspaceId = useWorkspaceStore((s) => s.preferredWorkspaceId);
  const isLoadingPreference = useWorkspaceStore((s) => s.isLoading);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const initializeWorkspace = useWorkspaceStore((s) => s.initializeWorkspace);
  const { metrics: legendMetrics } = useRiskMetrics(resolvedModelId);

  const activeResult = results[0];
  const layerReady = activeResult?.geoserver_status === "configured";
  const layerPending = Boolean(activeResult && !layerReady);

  // Refs to cleanly detach layers / cancel polling on unmount or id change.
  const riskLayerEntriesRef = useRef<RiskLayerEntry[]>([]);
  const visibleRiskLevelsRef = useRef<VisibleRiskLevels>(DEFAULT_VISIBLE_RISK_LEVELS);
  const pollTimerRef = useRef<number | null>(null);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!resolvedModelId) {
      setError(t("modelResults.errors.noId", "No model ID provided"));
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const [modelRes, resultsRes] = await Promise.all([
        modelService.getModelById(resolvedModelId),
        axios.get(`/models/${resolvedModelId}/results`),
      ]);

      if (modelRes.success && modelRes.data) setModel(modelRes.data);

      const raw = resultsRes.data?.data;
      const list: ModelResult[] = Array.isArray(raw) ? raw : [];
      setResults(list);
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          t("modelResults.errors.loadFailed", "Failed to load model results")
        )
      );
    } finally {
      setLoading(false);
    }
  }, [resolvedModelId, t]);

  const attachLayer = useCallback(
    async (result: ModelResult) => {
      if (!map || result.geoserver_status !== "configured") return;
      try {
        const resp = await axios.get(`/results/${result.id}/layer`);
        const info: LayerInfo | undefined = resp.data?.data;
        if (!info?.wms_url || !info.layer_name) {
          setError(t("modelResults.errors.layerIncomplete", "Layer configuration is incomplete"));
          return;
        }

        const layerOptions = info.available_layers ?? [];
        setAvailableLayers(layerOptions);
        // Render the currently selected component layer (defaults to the risk map).
        const activeLayerName =
          layerOptions.find((l) => l.key === selectedLayerKeyRef.current)?.layer_name ?? info.layer_name;
        const activeInfo: LayerInfo = { ...info, layer_name: activeLayerName };

        const newRiskLayerEntries = RISK_LEVELS.map((riskLevel) => {
          const riskLayer = buildWMSLayer(activeInfo, riskLevel.style, 450 + riskLevel.value);
          riskLayer.setVisible(layerVisible && visibleRiskLevelsRef.current[riskLevel.value]);
          map.addLayer(riskLayer);
          riskLayer.getSource()?.on("tileloaderror", () => {
            setTileErrors((n) => n + 1);
          });
          return { value: riskLevel.value, layer: riskLayer };
        });
        setRiskLayerEntries(newRiskLayerEntries);
        riskLayerEntriesRef.current = newRiskLayerEntries;

        if (info.bounds) fitMapToBounds(map, info.bounds);
      } catch (err) {
        setError(
          extractErrorMessage(
            err,
            t("modelResults.errors.layerLoad", "Failed to load layer from GeoServer")
          )
        );
      }
    },
    [layerVisible, map, t]
  );

  // Switch the visualized dataset (risk map vs. a component layer such as
  // vegetation or FWI). All share the 0–5 scale, so the legend/styles apply.
  const handleSelectLayer = useCallback(
    (key: string) => {
      setSelectedLayerKey(key);
      selectedLayerKeyRef.current = key;
      if (!map || !activeResult || activeResult.geoserver_status !== "configured") return;
      riskLayerEntriesRef.current.forEach(({ layer }) => map.removeLayer(layer));
      riskLayerEntriesRef.current = [];
      setRiskLayerEntries([]);
      attachLayer(activeResult);
    },
    [map, activeResult, attachLayer]
  );

  // -------------------------------------------------------------------------
  // Workspace + model selector
  // -------------------------------------------------------------------------

  const loadWorkspaceModels = useCallback(async (workspace: Workspace) => {
    setIsLoadingModels(true);
    try {
      const resp = await axios.get("/models", { params: { workspace_id: workspace.id } });
      const raw = resp.data?.data;
      const list: Model[] = Array.isArray(raw) ? raw : [];
      setWorkspaceModels(list.filter((m) => m.status === "completed"));
    } catch {
      setWorkspaceModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    initializeWorkspace();
  }, [initializeWorkspace]);

  useEffect(() => {
    if (model?.workspace) {
      const ws = model.workspace as Workspace;
      setSelectedWorkspace(ws);
      loadWorkspaceModels(ws);
    }
  }, [model, loadWorkspaceModels]);

  useEffect(() => {
    if (resolvedModelId) setSelectedModelId(resolvedModelId);
  }, [resolvedModelId]);

  const handleWorkspaceChange = useCallback(
    async (workspace: Workspace | null) => {
      setSelectedWorkspace(workspace);
      setCurrentWorkspace(workspace);
      if (workspace) {
        await loadWorkspaceModels(workspace);
      } else {
        setWorkspaceModels([]);
      }
    },
    [setCurrentWorkspace, loadWorkspaceModels]
  );

  const handleModelChange = useCallback(
    (mid: string) => {
      const parsed = Number.parseInt(mid, 10);
      if (parsed && parsed !== selectedModelId) {
        navigate(`/app/model-results/${parsed}`);
      }
    },
    [navigate, selectedModelId]
  );

  // -------------------------------------------------------------------------
  // Initial load
  // -------------------------------------------------------------------------

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Attach the layer once both the map is ready and the result is configured.
  useEffect(() => {
    if (!map || !activeResult || riskLayerEntriesRef.current.length > 0) return;
    if (activeResult.geoserver_status !== "configured") return;
    attachLayer(activeResult);
  }, [map, activeResult, attachLayer]);

  // Poll for readiness while the layer is still being processed server-side.
  useEffect(() => {
    if (!layerPending) return;
    pollTimerRef.current = window.setInterval(() => {
      loadData();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current !== null) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [layerPending, loadData]);

  // Reactive layer controls.
  useEffect(() => {
    visibleRiskLevelsRef.current = visibleRiskLevels;
  }, [visibleRiskLevels]);

  useEffect(() => {
    riskLayerEntries.forEach(({ value, layer: riskLayer }) => {
      riskLayer.setVisible(layerVisible && visibleRiskLevels[value]);
    });
  }, [layerVisible, riskLayerEntries, visibleRiskLevels]);

  useEffect(() => {
    riskLayerEntries.forEach(({ layer: riskLayer }) => {
      riskLayer.setOpacity(layerOpacity);
    });
  }, [layerOpacity, riskLayerEntries]);

  // Transparent ESRI road/label tiles above the risk raster so the map stays readable.
  const roadsLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const labelsLayerRef = useRef<TileLayer<XYZ> | null>(null);
  useEffect(() => {
    if (!map) return;
    const roadsOpacity = isDarkBaseLayer ? MAP_REFERENCE_DARK_OPACITY : MAP_REFERENCE_LIGHT_ROADS_OPACITY;
    const labelsOpacity = isDarkBaseLayer ? MAP_REFERENCE_DARK_OPACITY : MAP_REFERENCE_LIGHT_LABELS_OPACITY;
    const roadsClassName = isDarkBaseLayer
      ? "ol-layer ol-visible-in-maplibre mix-blend-lighten invert hue-rotate-180 contrast-125"
      : "ol-layer ol-visible-in-maplibre mix-blend-multiply";

    const roadsLayer = new TileLayer({
      source: new XYZ({
        url: ESRI_TRANSPORTATION_REFERENCE_URL,
        attributions: ESRI_ATTRIBUTION,
        crossOrigin: "anonymous",
        maxZoom: 20,
      }),
      opacity: roadsOpacity,
      className: roadsClassName,
    });
    const labelsLayer = new TileLayer({
      source: new XYZ({
        url: ESRI_PLACES_REFERENCE_URL,
        attributions: ESRI_ATTRIBUTION,
        crossOrigin: "anonymous",
        maxZoom: 20,
      }),
      opacity: labelsOpacity,
      className: "ol-layer ol-visible-in-maplibre",
    });

    roadsLayer.setVisible(roadsVisible);
    labelsLayer.setVisible(labelsVisible);
    roadsLayer.setZIndex(500);
    labelsLayer.setZIndex(510);
    map.addLayer(roadsLayer);
    map.addLayer(labelsLayer);
    roadsLayerRef.current = roadsLayer;
    labelsLayerRef.current = labelsLayer;

    return () => {
      map.removeLayer(roadsLayer);
      map.removeLayer(labelsLayer);
      if (roadsLayerRef.current === roadsLayer) roadsLayerRef.current = null;
      if (labelsLayerRef.current === labelsLayer) labelsLayerRef.current = null;
    };
  }, [isDarkBaseLayer, map]);

  useEffect(() => {
    roadsLayerRef.current?.setVisible(roadsVisible);
    labelsLayerRef.current?.setVisible(labelsVisible);
  }, [labelsVisible, roadsVisible]);

  // Detach on unmount / id change.
  useEffect(() => {
    return () => {
      if (map) {
        riskLayerEntriesRef.current.forEach(({ layer: riskLayer }) => {
          map.removeLayer(riskLayer);
        });
      }
      riskLayerEntriesRef.current = [];
    };
  }, [map, resolvedModelId]);

  // -------------------------------------------------------------------------
  // Derived UI state
  // -------------------------------------------------------------------------

  const dateRange = useMemo(() => {
    if (!model?.from_date || !model?.to_date) return null;
    const from = new Date(model.from_date).toLocaleDateString();
    const to = new Date(model.to_date).toLocaleDateString();
    return `${from} – ${to}`;
  }, [model]);
  const riskDistribution = legendMetrics.riskDistribution;
  const riskLevelAvailability = useMemo<VisibleRiskLevels>(() => {
    if (!riskDistribution) {
      return { 1: true, 2: true, 3: true, 4: true, 5: true };
    }
    return {
      1: riskDistribution.veryLow > 0,
      2: riskDistribution.low > 0,
      3: riskDistribution.moderate > 0,
      4: riskDistribution.high > 0,
      5: riskDistribution.veryHigh > 0,
    };
  }, [riskDistribution]);

  useEffect(() => {
    if (!riskDistribution) return;
    setVisibleRiskLevels((current) => {
      let changed = false;
      const next = { ...current };
      RISK_LEVELS.forEach((level) => {
        if (!riskLevelAvailability[level.value] && next[level.value]) {
          next[level.value] = false;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [riskDistribution, riskLevelAvailability]);

  const hasRiskLayers = riskLayerEntries.length > 0;
  const allRiskLevelsVisible = RISK_LEVELS.every(
    (level) => !riskLevelAvailability[level.value] || visibleRiskLevels[level.value],
  );
  const toggleRiskLevel = useCallback((value: RiskLevelValue, checked: boolean) => {
    setVisibleRiskLevels((current) => ({ ...current, [value]: checked }));
  }, []);
  const setAllRiskLevelsVisible = useCallback((checked: boolean) => {
    setVisibleRiskLevels({
      1: checked && riskLevelAvailability[1],
      2: checked && riskLevelAvailability[2],
      3: checked && riskLevelAvailability[3],
      4: checked && riskLevelAvailability[4],
      5: checked && riskLevelAvailability[5],
    });
  }, [riskLevelAvailability]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const header = (
    <header className="bg-card border-b border-border flex-shrink-0">
      <div className="px-4 py-1.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/app/model-dashboard")}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
            aria-label={t("common.back", "Back")}
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          {isLoadingPreference ? (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-card text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="font-medium text-foreground">
                {t("modelResults.loadingWorkspace", "Loading workspace…")}
              </span>
            </div>
          ) : (
            <>
              <WorkspaceSelector
                onWorkspaceChange={handleWorkspaceChange}
                onCreateWorkspace={() => setIsCreateWsOpen(true)}
                reloadKey={wsReloadKey}
                initialWorkspaceId={model?.workspace?.id ?? preferredWorkspaceId ?? undefined}
                activeWorkspace={selectedWorkspace ?? currentWorkspace}
              />

              {selectedWorkspace && (
                <Select
                  value={selectedModelId?.toString() ?? ""}
                  onValueChange={handleModelChange}
                  disabled={isLoadingModels || workspaceModels.length === 0}
                >
                  <SelectTrigger className="w-[220px] h-9">
                    <SelectValue
                      placeholder={
                        isLoadingModels
                          ? t("modelResults.loadingModels", "Loading models…")
                          : workspaceModels.length === 0
                            ? t("modelResults.noCompletedModels", "No completed models")
                            : t("modelResults.selectModel", "Select a model")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceModels.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}

          {model && (
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground border-l border-border pl-4 min-w-0">
              {model.region && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{model.region}</span>
                </span>
              )}
              {dateRange && (
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  {dateRange}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasRiskLayers && availableLayers.length > 1 && (
            <Select value={selectedLayerKey} onValueChange={handleSelectLayer}>
              <SelectTrigger
                className="w-[200px] h-9"
                aria-label={t("modelResults.layer.dataset", "Layer")}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableLayers.map((l) => (
                  <SelectItem key={l.key} value={l.key}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasRiskLayers && (
            <>
              <button
                type="button"
                onClick={() => setLayerVisible((v) => !v)}
                className="h-8 px-3 inline-flex items-center gap-1.5 text-xs border border-border bg-card hover:bg-muted rounded-lg transition-colors"
              >
                {layerVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>
                  {layerVisible
                    ? t("modelResults.layer.visible", "Visible")
                    : t("modelResults.layer.hidden", "Hidden")}
                </span>
              </button>

              <div className="h-8 px-3 inline-flex items-center gap-2 text-xs border border-border rounded-lg bg-card">
                <label htmlFor="mr-opacity" className="font-medium text-foreground">
                  {t("modelResults.layer.opacity", "Opacity")}
                </label>
                <input
                  id="mr-opacity"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={layerOpacity}
                  onChange={(e) => setLayerOpacity(Number.parseFloat(e.target.value))}
                  className="w-24 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ea580c 0%, #ea580c ${layerOpacity * 100}%, var(--muted) ${layerOpacity * 100}%, var(--muted) 100%)`,
                  }}
                  aria-label="Layer opacity"
                />
                <span className="w-9 text-right font-medium text-muted-foreground">
                  {Math.round(layerOpacity * 100)}%
                </span>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => loadData()}
            className="h-8 w-8 inline-flex items-center justify-center border border-border bg-card hover:bg-muted rounded-lg transition-colors"
            aria-label={t("common.refresh", "Refresh")}
            title={t("common.refresh", "Refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );

  const mapHeader = null;

  const mapOverlays = (
    <>
      {!map && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[2000] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("modelResults.map.initializing", "Initializing map…")}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] max-w-xl bg-destructive text-destructive-foreground rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {tileErrors > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 rounded-lg shadow-lg px-4 py-2 text-xs">
          {t(
            "modelResults.errors.tileLoad",
            "Some tiles failed to load from GeoServer ({{count}})",
            { count: tileErrors }
          )}
        </div>
      )}

      {layerPending && map && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-card border border-border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs text-foreground">
            {t("modelResults.layer.publishing", "Publishing layer to GeoServer…")}
          </span>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] max-w-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 rounded-lg shadow-lg p-4">
          <p className="text-sm font-medium">
            {t("modelResults.empty.title", "No result for this model yet.")}
          </p>
          <p className="text-xs mt-1">
            {t(
              "modelResults.empty.hint",
              "The simulation output will appear here once processing finishes."
            )}
          </p>
        </div>
      )}

      {/* Optional map overlays. */}
      {map && (
        <div
          className="absolute top-4 left-2 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-2xl overflow-hidden w-[156px] transition-all duration-300"
        >
          <div className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-emerald-500/10 flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="text-[11px] font-bold uppercase text-foreground tracking-tight">
              {t("modelResults.layers.title", "Overlays")}
            </span>
          </div>
          <div className="p-1 space-y-0">
            <label className="flex items-center gap-2 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  className="peer appearance-none w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                  checked={roadsVisible}
                  onChange={(e) => setRoadsVisible(e.target.checked)}
                />
                <svg className="absolute w-2 h-2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <Route className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1">
                {t("modelResults.layers.roads", "Roads")}
              </span>
            </label>
            <label className="flex items-center gap-2 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  className="peer appearance-none w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                  checked={labelsVisible}
                  onChange={(e) => setLabelsVisible(e.target.checked)}
                />
                <svg className="absolute w-2 h-2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <MapPin className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1">
                {t("modelResults.layers.labels", "Labels & places")}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Risk legend */}
      {hasRiskLayers && (
        <div className="absolute bottom-4 left-2 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-2xl overflow-hidden w-[156px] transition-all duration-300">
          <div className="px-2.5 py-1.5 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b border-orange-500/10 flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-red-500 shadow-sm flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="text-[11px] font-bold uppercase text-foreground tracking-tight">
              {t("modelResults.legend.title", "Fire Risk")}
            </span>
          </div>
          <div className="p-1 space-y-0">
            <label className="flex items-center gap-2 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-b border-border/40 mb-1.5 pb-2 group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  className="peer appearance-none w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 checked:bg-orange-500 checked:border-orange-500 transition-colors cursor-pointer"
                  checked={allRiskLevelsVisible}
                  onChange={(e) => setAllRiskLevelsVisible(e.target.checked)}
                />
                <svg className="absolute w-2 h-2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
              </div>
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
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer appearance-none w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 checked:bg-orange-500 checked:border-orange-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      checked={isVisibleInStyle && isAvailable}
                      disabled={!isAvailable}
                      onChange={(e) => toggleRiskLevel(lvl.value, e.target.checked)}
                    />
                    <svg className="absolute w-2 h-2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                    style={{ backgroundColor: lvl.color, boxShadow: `0 0 6px ${lvl.color}66` }}
                  />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1">
                    {t(`modelResults.legend.levels.${lvl.value}`, lvl.label)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    {percent === null ? lvl.value : `${percent.toFixed(1)}%`}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="px-3 pb-3 pt-0.5">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-[#2563eb] via-[#16a34a] via-[#eab308] via-[#ea580c] to-[#dc2626] shadow-inner" />
          </div>
        </div>
      )}

      <MapSearchBar />
    </>
  );

  return (
    <Fragment>
      <div className="h-full w-full flex flex-col bg-background overflow-hidden">
        <MapContainer
          modal={false}
          showSidebar={!!model}
          sidebar={model ? <AssessmentDetailsSidebar model={model} results={results} /> : undefined}
          topBar={header}
          mapHeader={mapHeader}
          mapOverlays={mapOverlays}
        />
      </div>

      <CreateWorkspaceModal
        isOpen={isCreateWsOpen}
        onClose={() => setIsCreateWsOpen(false)}
        onSuccess={(newWorkspace) => {
          setIsCreateWsOpen(false);
          handleWorkspaceChange(newWorkspace);
          setWsReloadKey((k) => k + 1);
        }}
      />
    </Fragment>
  );
};
