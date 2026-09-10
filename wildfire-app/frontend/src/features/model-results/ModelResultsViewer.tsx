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

import { getModelResults } from "./services/resultsService";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { MapContainer } from "@/components/shared/MapContainer";
import { useMapStore, useMapKeyboardShortcuts } from "@/features/interactive-map";
import MapSearchBar from "@/features/interactive-map/MapSearchBar";
import { modelService, Model } from "@/features/model-dashboard";
import { CreateWorkspaceModal } from "@/components/workspace";

import { scoreToRiskLevel, toPercentages, useRiskMetrics } from "./hooks/useRiskMetrics";
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
  findResultForModel,
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
import { ViewerShortcutsPanel } from "./components/ViewerShortcutsPanel";
import { RiskTimelinePanel } from "./components/RiskTimelinePanel";

// Lazy-load Cesium.
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
  const activeModelIdRef = useRef(resolvedModelId);
  const loadRequestRef = useRef(0);
  activeModelIdRef.current = resolvedModelId;

  const { map } = useMapStore();

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

  // Fullscreen the document.
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

  const activeResult = findResultForModel(results, resolvedModelId);
  const layerReady = activeResult?.geoserver_status === "configured";
  const layerPending = Boolean(activeResult && !layerReady);
  const pollTimerRef = useRef<number | null>(null);

  const {
    availableLayers,
    selectedLayerKey,
    selectedLayerKeyRef,
    tileErrors,
    wms3D,
    attachedResultId,
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

  useReferenceLayers(map, roadsVisible, labelsVisible, scheduleMapRenderRefresh);

  // ----- Data loading -----

  const loadData = useCallback(async () => {
    const requestedModelId = resolvedModelId;
    const requestId = ++loadRequestRef.current;

    if (!requestedModelId) {
      setError(t("modelResults.errors.noId", "No model ID provided"));
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const [modelRes, list] = await Promise.all([
        modelService.getModelById(requestedModelId),
        getModelResults<ModelResult>(requestedModelId),
      ]);

      if (requestId !== loadRequestRef.current || activeModelIdRef.current !== requestedModelId) {
        return;
      }

      setModel(modelRes.success && modelRes.data ? modelRes.data : null);

      setResults(list);
    } catch (err) {
      if (requestId !== loadRequestRef.current || activeModelIdRef.current !== requestedModelId) {
        return;
      }
      setError(
        extractErrorMessage(
          err,
          t("modelResults.errors.loadFailed", "Failed to load model results")
        )
      );
    } finally {
      if (requestId === loadRequestRef.current && activeModelIdRef.current === requestedModelId) {
        setLoading(false);
      }
    }
  }, [resolvedModelId, t]);

  useEffect(() => {
    setModel(null);
    setResults([]);
    setError(null);
    setLoading(true);
    setPlaying(false);
    setShow3D(false);
  }, [resolvedModelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Attach when ready.
  useEffect(() => {
    if (!map || !activeResult || attachedResultId === activeResult.id) return;
    if (activeResult.geoserver_status !== "configured") return;
    attachLayer(activeResult);
  }, [map, activeResult, attachLayer, attachedResultId]);

  // Poll for readiness.
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

  // Daily risk animation.

  const dailyFrames = useMemo(
    () =>
      availableLayers
        .filter((l) => DAILY_FRAME_KEY_PATTERN.test(l.key))
        .sort((a, b) => a.key.localeCompare(b.key)),
    [availableLayers]
  );
  // Player owns frames.
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
    // Resume current frame.
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
    dailyFrames.length >= 2 && (showTimeline || prefetchReady || playingFrameDate !== null)
  );

  const showFrameByDate = useCallback(
    (date: string, pausePlayback: boolean) => {
      if (pausePlayback) setPlaying(false);
      const frame = dailyFrames.find((f) => f.key.slice(5) === date);
      if (frame) applyDailyFrame(frame);
    },
    [applyDailyFrame, dailyFrames]
  );

  // Derived state.

  const dateRange = useMemo(() => {
    if (!model?.from_date || !model?.to_date) return null;
    const from = new Date(model.from_date).toLocaleDateString();
    const to = new Date(model.to_date).toLocaleDateString();
    return `${from} – ${to}`;
  }, [model]);

  const modelDistribution = legendMetrics.riskDistribution;
  const riskDistribution = useMemo(() => {
    if (!playingFrameDate) return modelDistribution;
    const day = dailySeries.data?.days.find((d) => d.date === playingFrameDate);
    if (!day) return modelDistribution;
    return toPercentages(day.distribution, day.valid_samples);
  }, [playingFrameDate, dailySeries.data, modelDistribution]);

  // The player bar reads the same frame, so its figures cannot contradict the legend.
  const frameMetrics = useMemo(() => {
    if (!playingFrameDate) return legendMetrics;
    const day = dailySeries.data?.days.find((d) => d.date === playingFrameDate);
    if (!day || day.valid_samples <= 0) return legendMetrics;

    const { very_low, low, moderate, high, very_high } = day.distribution;
    const affected = day.area_km2.high + day.area_km2.very_high;
    const totalArea =
      day.area_km2.very_low +
      day.area_km2.low +
      day.area_km2.moderate +
      day.area_km2.high +
      day.area_km2.very_high;
    const meanScore =
      (very_low + 2 * low + 3 * moderate + 4 * high + 5 * very_high) / day.valid_samples;

    return {
      ...legendMetrics,
      overallRiskLevel: scoreToRiskLevel(meanScore),
      overallRiskScore: meanScore,
      affectedAreaKm2: affected,
      affectedAreaHectares: affected * 100,
      totalAreaKm2: totalArea,
      affectedFraction: (high + very_high) / day.valid_samples,
      sampleCount: day.valid_samples,
      riskDistribution,
    };
  }, [playingFrameDate, dailySeries.data, legendMetrics, riskDistribution]);

  // Availability stays whole-model so the checkboxes hold still during playback.
  const riskLevelAvailability = useMemo<VisibleRiskLevels>(() => {
    if (!modelDistribution) {
      return { 1: true, 2: true, 3: true, 4: true, 5: true };
    }
    return {
      1: modelDistribution.veryLow > 0,
      2: modelDistribution.low > 0,
      3: modelDistribution.moderate > 0,
      4: modelDistribution.high > 0,
      5: modelDistribution.veryHigh > 0,
    };
  }, [modelDistribution]);

  const hasRiskLayers = Boolean(activeResult && attachedResultId === activeResult.id);

  // Map keyboard shortcuts.
  useMapKeyboardShortcuts(map, {
    onTogglePlay: layerReady && dailyFrames.length >= 2 ? () => setPlaying((v) => !v) : undefined,
    onToggleFullscreen: toggleFullscreen,
    onToggle3D: wms3D ? () => setShow3D((v) => !v) : undefined,
    onToggleLayerVisible: hasRiskLayers ? () => setLayerVisible((v) => !v) : undefined,
  });
  const allRiskLevelsVisible = RISK_LEVELS.every(
    (level) => !riskLevelAvailability[level.value] || visibleRiskLevels[level.value]
  );
  const toggleRiskLevel = useCallback(
    (value: RiskLevelValue, checked: boolean) => {
      setVisibleRiskLevels((current) => ({
        1: riskLevelAvailability[1] && (value === 1 ? checked : current[1]),
        2: riskLevelAvailability[2] && (value === 2 ? checked : current[2]),
        3: riskLevelAvailability[3] && (value === 3 ? checked : current[3]),
        4: riskLevelAvailability[4] && (value === 4 ? checked : current[4]),
        5: riskLevelAvailability[5] && (value === 5 ? checked : current[5]),
      }));
    },
    [riskLevelAvailability]
  );
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
          legendMetrics={frameMetrics}
        />
      )}

      {/* 3D terrain layer. */}
      {show3D && wms3D && (
        <Suspense fallback={null}>
          <CesiumWildfire3DView
            onExit={() => setShow3D(false)}
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

      <div className="absolute bottom-10 left-2 z-10 flex w-44 flex-col gap-2">
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
        <ViewerShortcutsPanel
          canPlay={layerReady && dailyFrames.length >= 2}
          can3D={Boolean(wms3D)}
          hasRiskLayers={hasRiskLayers}
        />
      </div>

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
