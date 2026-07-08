import {
  FC,
  Fragment,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "@/i18n";

import axios from "@/lib/axios";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { MapContainer } from "@/components/shared/MapContainer";
import { isMapLibreDarkLayerId, useMapStore } from "@/features/interactive-map/store/map-store";
import MapSearchBar from "@/features/interactive-map/MapSearchBar";
import { modelService, Model } from "@/features/model-dashboard/services/modelService";
import { CreateWorkspaceModal } from "@/components/workspace";

import { useRiskMetrics } from "./hooks/useRiskMetrics";
import { useRiskLayers } from "./hooks/useRiskLayers";
import { useFrameWeather } from "./hooks/useFrameWeather";
import { useReferenceLayers } from "./hooks/useReferenceLayers";
import { useDailyRiskDistribution } from "./hooks/useDailyRiskDistribution";
import { useWorkspaceModelSelector } from "./hooks/useWorkspaceModelSelector";
import {
  DAILY_FRAME_KEY_PATTERN,
  DEFAULT_VISIBLE_RISK_LEVELS,
  FIRE_RISK_DEFAULT_OPACITY,
  POLL_INTERVAL_MS,
  RISK_LEVELS,
  type ModelResult,
  type RiskLevelValue,
  type VisibleRiskLevels,
} from "./viewer-config";
import { extractErrorMessage } from "./viewer-helpers";
import { ViewerHeader } from "./components/ViewerHeader";
import { ViewerPlayerOverlay } from "./components/ViewerPlayerOverlay";
import { ViewerSidebarRail } from "./components/ViewerSidebarRail";
import { ViewerStatusBanners } from "./components/ViewerStatusBanners";
import { OverlaysPanel, RiskLegendPanel } from "./components/ViewerMapPanels";
import { RiskTimelinePanel } from "./components/RiskTimelinePanel";

// Cesium is several MB, so load the 3D view (and Cesium with it) only when opened.
const CesiumWildfire3DView = lazy(() =>
  import("./components/CesiumWildfire3DView").then((m) => ({ default: m.CesiumWildfire3DView }))
);

interface ModelResultsViewerProps {
  modelId?: number;
}

export const ModelResultsViewer: FC<ModelResultsViewerProps> = ({ modelId: propModelId }) => {
  const { id: paramId } = useParams<{ id: string }>();
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

  const [layerVisible, setLayerVisible] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState(FIRE_RISK_DEFAULT_OPACITY);
  const [visibleRiskLevels, setVisibleRiskLevels] = useState<VisibleRiskLevels>(
    DEFAULT_VISIBLE_RISK_LEVELS
  );
  const [show3D, setShow3D] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playFrameRef = useRef(0);
  const [showTimeline, setShowTimeline] = useState(false);
  const [roadsVisible, setRoadsVisible] = useState(true);
  const [labelsVisible, setLabelsVisible] = useState(false);

  // Fullscreen the document, not the viewer div: body portals stay visible.
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  const workspaceSelector = useWorkspaceModelSelector(model, resolvedModelId);
  const { metrics: legendMetrics } = useRiskMetrics(resolvedModelId);

  const activeResult = results[0];
  const layerReady = activeResult?.geoserver_status === "configured";
  const layerPending = Boolean(activeResult && !layerReady);
  const pollTimerRef = useRef<number | null>(null);

  const {
    riskLayerEntries,
    riskLayerEntriesRef,
    availableLayers,
    selectedLayerKey,
    selectedLayerKeyRef,
    tileErrors,
    wms3D,
    attachLayer,
    selectLayer,
    applyDailyFrame,
    scheduleMapRenderRefresh,
  } = useRiskLayers({
    map,
    modelId: resolvedModelId,
    layerVisible,
    layerOpacity,
    visibleRiskLevels,
    onError: setError,
  });

  useReferenceLayers(map, isDarkBaseLayer, roadsVisible, labelsVisible, scheduleMapRenderRefresh);

  // ----- Data loading -----

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Attach the layer once both the map is ready and the result is configured.
  useEffect(() => {
    if (!map || !activeResult || riskLayerEntriesRef.current.length > 0) return;
    if (activeResult.geoserver_status !== "configured") return;
    attachLayer(activeResult);
  }, [map, activeResult, attachLayer, riskLayerEntriesRef]);

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

  const handleSelectLayer = useCallback(
    (key: string) => {
      setPlaying(false);
      selectLayer(key, activeResult);
    },
    [activeResult, selectLayer]
  );

  // ----- Daily risk animation (dynamic runs publish layers/risk_<date>.tif per day) -----

  const dailyFrames = useMemo(
    () =>
      availableLayers
        .filter((l) => DAILY_FRAME_KEY_PATTERN.test(l.key))
        .sort((a, b) => a.key.localeCompare(b.key)),
    [availableLayers]
  );
  // Daily frames are driven by the player, so keep them out of the dataset switcher.
  const switcherLayers = useMemo(
    () => availableLayers.filter((l) => !DAILY_FRAME_KEY_PATTERN.test(l.key)),
    [availableLayers]
  );
  const playingFrameDate = DAILY_FRAME_KEY_PATTERN.exec(selectedLayerKey)?.[1] ?? null;
  const dailyFrameIndex = dailyFrames.findIndex((f) => f.key === selectedLayerKey);

  const { currentFrameWeather, rankedRiskDays, riskRankIndex, setRiskRankIndex, riskRankDay } =
    useFrameWeather(resolvedModelId, dailyFrames, playingFrameDate);

  useEffect(() => {
    if (!playing) return;
    if (dailyFrames.length < 2) {
      setPlaying(false);
      return;
    }
    // Resume from the frame currently shown (or start at the first day).
    const current = dailyFrames.findIndex((f) => f.key === selectedLayerKeyRef.current);
    playFrameRef.current = current >= 0 ? current : -1;
    const tick = () => {
      playFrameRef.current = (playFrameRef.current + 1) % dailyFrames.length;
      applyDailyFrame(dailyFrames[playFrameRef.current]);
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [playing, dailyFrames, applyDailyFrame, selectedLayerKeyRef]);

  const [prefetchReady, setPrefetchReady] = useState(false);
  useEffect(() => {
    if (dailyFrames.length < 2) return;
    const id = window.setTimeout(() => setPrefetchReady(true), 15_000);
    return () => clearTimeout(id);
  }, [dailyFrames.length]);
  const dailySeries = useDailyRiskDistribution(
    resolvedModelId,
    dailyFrames.length >= 2 && (showTimeline || prefetchReady)
  );

  const showFrameByDate = useCallback(
    (date: string, pausePlayback: boolean) => {
      if (pausePlayback) setPlaying(false);
      const frame = dailyFrames.find((f) => f.key.slice(5) === date);
      if (frame) applyDailyFrame(frame);
    },
    [applyDailyFrame, dailyFrames]
  );

  // ----- Derived UI state -----

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
    (level) => !riskLevelAvailability[level.value] || visibleRiskLevels[level.value]
  );
  const toggleRiskLevel = useCallback((value: RiskLevelValue, checked: boolean) => {
    setVisibleRiskLevels((current) => ({ ...current, [value]: checked }));
  }, []);
  const setAllRiskLevelsVisible = useCallback(
    (checked: boolean) => {
      setVisibleRiskLevels({
        1: checked && riskLevelAvailability[1],
        2: checked && riskLevelAvailability[2],
        3: checked && riskLevelAvailability[3],
        4: checked && riskLevelAvailability[4],
        5: checked && riskLevelAvailability[5],
      });
    },
    [riskLevelAvailability]
  );

  // ----- Render -----

  const header = (
    <ViewerHeader
      model={model}
      dateRange={dateRange}
      loading={loading}
      isLoadingPreference={workspaceSelector.isLoadingPreference}
      selectedWorkspace={workspaceSelector.selectedWorkspace}
      currentWorkspace={workspaceSelector.currentWorkspace}
      preferredWorkspaceId={workspaceSelector.preferredWorkspaceId}
      workspaceModels={workspaceSelector.workspaceModels}
      selectedModelId={workspaceSelector.selectedModelId}
      isLoadingModels={workspaceSelector.isLoadingModels}
      wsReloadKey={workspaceSelector.wsReloadKey}
      hasRiskLayers={hasRiskLayers}
      layerOpacity={layerOpacity}
      onWorkspaceChange={workspaceSelector.handleWorkspaceChange}
      onCreateWorkspace={() => workspaceSelector.setIsCreateWsOpen(true)}
      onModelChange={workspaceSelector.handleModelChange}
      onOpacityChange={setLayerOpacity}
      onRefresh={loadData}
    />
  );

  const mapOverlays = (
    <>
      {layerReady && (
        <ViewerPlayerOverlay
          dailyFrames={dailyFrames}
          playing={playing}
          onTogglePlay={() => setPlaying((v) => !v)}
          playingFrameDate={playingFrameDate}
          dailyFrameIndex={dailyFrameIndex}
          currentFrameWeather={currentFrameWeather}
          rankedRiskDays={rankedRiskDays}
          riskRankDay={riskRankDay}
          riskRankIndex={riskRankIndex}
          onSelectRankedDay={(day, pausePlayback) => {
            showFrameByDate(day.date, pausePlayback);
            setRiskRankIndex((i) => (i + 1) % (rankedRiskDays?.length ?? 1));
          }}
          legendMetrics={legendMetrics}
        />
      )}

      {/* 3D terrain sits inside the map container below the shared overlays. */}
      {show3D && wms3D && (
        <Suspense fallback={null}>
          <CesiumWildfire3DView
            wmsUrl={wms3D.wmsUrl}
            layerName={wms3D.layerName}
            aoi={model?.coordinates}
            visibleRiskLevels={visibleRiskLevels}
            roadsVisible={roadsVisible}
            labelsVisible={labelsVisible}
          />
        </Suspense>
      )}

      <ViewerStatusBanners
        mapReady={Boolean(map)}
        loading={loading}
        error={error}
        tileErrors={tileErrors}
        layerPending={layerPending}
        hasResults={results.length > 0}
      />

      {map && (
        <OverlaysPanel
          roadsVisible={roadsVisible}
          labelsVisible={labelsVisible}
          onRoadsChange={setRoadsVisible}
          onLabelsChange={setLabelsVisible}
        />
      )}

      {hasRiskLayers && (
        <RiskLegendPanel
          visibleRiskLevels={visibleRiskLevels}
          riskLevelAvailability={riskLevelAvailability}
          riskDistribution={riskDistribution}
          allRiskLevelsVisible={allRiskLevelsVisible}
          onToggleAll={setAllRiskLevelsVisible}
          onToggleLevel={toggleRiskLevel}
        />
      )}

      {showTimeline && dailyFrames.length >= 2 && (
        <RiskTimelinePanel
          days={dailySeries.data?.days ?? null}
          isLoading={dailySeries.isLoading}
          error={dailySeries.error}
          currentDate={playingFrameDate}
          onSelectDate={(date) => showFrameByDate(date, true)}
          onClose={() => setShowTimeline(false)}
        />
      )}

      <MapSearchBar />
    </>
  );

  return (
    <Fragment>
      <div className="h-full w-full flex bg-background overflow-hidden relative">
        <div className="flex-1 h-full min-w-0" style={{ paddingRight: "var(--sidebar-width)" }}>
          <MapContainer
            modal={false}
            showSidebar={false}
            hideMapControls={show3D}
            topBar={header}
            mapHeader={null}
            mapOverlays={mapOverlays}
          />
        </div>
        <ViewerSidebarRail
          show3D={show3D}
          can3D={Boolean(wms3D)}
          onToggle3D={() => setShow3D((v) => !v)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          showTimelineButton={dailyFrames.length >= 2}
          showTimeline={showTimeline}
          onToggleTimeline={() => setShowTimeline((v) => !v)}
          hasRiskLayers={hasRiskLayers}
          layerVisible={layerVisible}
          onToggleLayerVisible={() => setLayerVisible((v) => !v)}
          switcherLayers={switcherLayers}
          activeLayerKey={playingFrameDate ? "risk" : selectedLayerKey}
          onSelectLayer={handleSelectLayer}
        />
      </div>

      <CreateWorkspaceModal
        isOpen={workspaceSelector.isCreateWsOpen}
        onClose={() => workspaceSelector.setIsCreateWsOpen(false)}
        onSuccess={(newWorkspace) => {
          workspaceSelector.setIsCreateWsOpen(false);
          workspaceSelector.handleWorkspaceChange(newWorkspace);
          workspaceSelector.setWsReloadKey((k) => k + 1);
        }}
      />
    </Fragment>
  );
};
