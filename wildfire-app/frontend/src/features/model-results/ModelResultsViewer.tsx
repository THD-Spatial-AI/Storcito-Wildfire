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
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n";

import { getModelResults } from "./services/resultsService";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { MapContainer } from "@/components/shared/MapContainer";
import { useMapStore, useMapKeyboardShortcuts } from "@/features/interactive-map";
import type { MapKeyControls } from "@/features/interactive-map/useMapKeyboardShortcuts";
import type { Terrain3DControls } from "./components/CesiumWildfire3DView";
import MapSearchBar from "@/features/interactive-map/MapSearchBar";
import { modelService, Model, isActiveStatus } from "@/features/model-dashboard";
import { CreateWorkspaceModal } from "@/components/workspace";

import { scoreToRiskLevel, toPercentages, useRiskMetrics } from "./hooks/useRiskMetrics";
import { useRiskLayers } from "./hooks/useRiskLayers";
import { useFrameWeather } from "./hooks/useFrameWeather";
import { useDailyRiskDistribution } from "./hooks/useDailyRiskDistribution";
import { useWorkspaceModelSelector } from "./hooks/useWorkspaceModelSelector";
import { useModelDateStepper } from "./hooks/useModelDateStepper";
import {
  DAILY_FRAME_KEY_PATTERN,
  DEFAULT_VISIBLE_RISK_LEVELS,
  FIRE_RISK_DEFAULT_OPACITY,
  POLL_INTERVAL_MS,
  RUNNING_POLL_INTERVAL_MS,
  RISK_LEVELS,
  findResultForModel,
  type ModelResult,
  type RiskLevelValue,
  type VisibleRiskLevels,
} from "./viewer-config";
import { extractErrorMessage } from "./viewer-helpers";
import { ViewerHeader } from "./components/ViewerHeader";
import { DateStepperBar } from "./components/DateStepperBar";
import { RiskSummary } from "./components/RiskSummary";
import { DailyRiskCard } from "./components/DailyRiskCard";
import { ViewerSidebarRail } from "./components/ViewerSidebarRail";
import { ViewerStatusBanners } from "./components/ViewerStatusBanners";
import { RiskLegendPanel } from "./components/ViewerMapPanels";
import { MapShortcutsPanel } from "@/components/map-controls/MapShortcutsPanel";
import { RiskTimelinePanel } from "./components/RiskTimelinePanel";
import { useSeenCompletedModelsStore } from "@/features/model-dashboard/store/seen-completed-models";

// daily playback pacing
const FRAME_MIN_MS = 2000;
const FRAME_MAX_MS = 15000;

// rate limit network
const isRetryable = (err: unknown) => {
  if (!isAxiosError(err)) return false;
  const status = err.response?.status;
  return status === undefined || status === 429 || status >= 500;
};

const withRetry = async <T,>(request: () => Promise<T>, attempts = 4): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await request();
    } catch (err) {
      if (attempt >= attempts || !isRetryable(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** attempt));
    }
  }
};

// lazy-load cesium
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
  const terrainControlsRef = useRef<Terrain3DControls | null>(null);
  const [playing, setPlaying] = useState(false);
  const playFrameRef = useRef(0);
  const [showTimeline, setShowTimeline] = useState(false);

  // fullscreen the document
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
  const activeResult = findResultForModel(results, resolvedModelId);
  const { metrics: legendMetrics } = useRiskMetrics(resolvedModelId, activeResult?.id);
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
    isFrameLoaded,
  } = useRiskLayers({
    map,
    modelId: resolvedModelId,
    layerVisible,
    layerOpacity,
    visibleRiskLevels,
    onError: setError,
  });


  // data loading

  // silent background poll
  const loadData = useCallback(async (silent = false) => {
    const requestedModelId = resolvedModelId;
    const requestId = ++loadRequestRef.current;

    if (!requestedModelId) {
      setError(t("modelResults.errors.noId", "No model ID provided"));
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      const [modelRes, list] = await withRetry(() =>
        Promise.all([
          modelService.getModelById(requestedModelId),
          getModelResults<ModelResult>(requestedModelId),
        ]),
      );

      if (requestId !== loadRequestRef.current || activeModelIdRef.current !== requestedModelId) {
        return;
      }

      setError(null);
      setModel(modelRes.success && modelRes.data ? modelRes.data : null);

      setResults(list);
    } catch (err) {
      if (silent || requestId !== loadRequestRef.current || activeModelIdRef.current !== requestedModelId) {
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

  const markCompletedSeen = useSeenCompletedModelsStore((s) => s.markSeen);
  useEffect(() => {
    if (model?.status === "completed") markCompletedSeen(model);
  }, [model, markCompletedSeen]);

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

  // attach when ready
  useEffect(() => {
    if (!map || !activeResult || attachedResultId === activeResult.id) return;
    if (activeResult.geoserver_status !== "configured") return;
    attachLayer(activeResult);
  }, [map, activeResult, attachLayer, attachedResultId]);

  const modelRunning = Boolean(model && isActiveStatus(model.status));
  const refreshQuietly = useCallback(() => void loadData(true), [loadData]);

  // poll for readiness
  useEffect(() => {
    if (!layerPending || modelRunning) return;
    pollTimerRef.current = window.setInterval(refreshQuietly, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current !== null) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [layerPending, modelRunning, refreshQuietly]);

  const dateStepper = useModelDateStepper(model, refreshQuietly, {
    failed: t("modelResults.dateStep.failed", "Could not switch to that day. Please try again."),
  });

  // one status poller
  const watchRun = modelRunning || Boolean(dateStepper.pendingDate);
  useEffect(() => {
    const modelId = resolvedModelId;
    if (!watchRun || !modelId) return;
    const startedAt = Date.now();
    let cancelled = false;
    let timer = 0;
    const tick = async () => {
      try {
        const res = await modelService.getModelById(modelId);
        if (cancelled || activeModelIdRef.current !== modelId) return;
        if (res.success && res.data && isActiveStatus(res.data.status)) {
          setModel(res.data);
        } else {
          // finished fetch results
          await loadData(true);
        }
      } catch {
        // next tick retries
      }
      if (cancelled) return;
      const delay = Date.now() - startedAt < 30_000 ? RUNNING_POLL_INTERVAL_MS : 5_000;
      timer = window.setTimeout(() => void tick(), delay);
    };
    timer = window.setTimeout(() => void tick(), RUNNING_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [watchRun, resolvedModelId, loadData]);

  const handleSelectLayer = useCallback(
    (key: string) => {
      setPlaying(false);
      selectLayer(key, activeResult);
    },
    [activeResult, selectLayer]
  );

  // daily risk animation

  const dailyFrames = useMemo(
    () =>
      availableLayers
        .filter((l) => DAILY_FRAME_KEY_PATTERN.test(l.key))
        .sort((a, b) => a.key.localeCompare(b.key)),
    [availableLayers]
  );
  // player owns frames
  const switcherLayers = useMemo(
    () => availableLayers.filter((l) => !DAILY_FRAME_KEY_PATTERN.test(l.key)),
    [availableLayers]
  );
  const playingFrameDate = DAILY_FRAME_KEY_PATTERN.exec(selectedLayerKey)?.[1] ?? null;

  const { currentFrameWeather, peakDate } = useFrameWeather(resolvedModelId, dailyFrames, playingFrameDate);

  useEffect(() => {
    if (!playing) return;
    if (dailyFrames.length < 2) {
      setPlaying(false);
      return;
    }
    // resume current frame
    const current = dailyFrames.findIndex((f) => f.key === selectedLayerKeyRef.current);
    playFrameRef.current = current >= 0 ? current : -1;
    let shownAt = 0;
    const advance = () => {
      playFrameRef.current = (playFrameRef.current + 1) % dailyFrames.length;
      applyDailyFrame(dailyFrames[playFrameRef.current]);
      shownAt = Date.now();
    };
    advance();
    // wait tiles capped
    const id = window.setInterval(() => {
      const elapsed = Date.now() - shownAt;
      if (elapsed < FRAME_MIN_MS) return;
      if (isFrameLoaded() || elapsed >= FRAME_MAX_MS) advance();
    }, 250);
    return () => clearInterval(id);
  }, [playing, dailyFrames, applyDailyFrame, isFrameLoaded, selectedLayerKeyRef]);

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

  // derived state

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

  // player bar reads
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

  // availability stays whole-model
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

  // 3d camera keys
  const terrainControls = useMemo<MapKeyControls | null>(
    () =>
      show3D
        ? {
            zoomIn: () => terrainControlsRef.current?.zoomIn(),
            zoomOut: () => terrainControlsRef.current?.zoomOut(),
            pan: (dx, dy) => terrainControlsRef.current?.pan(dx, dy),
          }
        : null,
    [show3D]
  );

  // map keyboard shortcuts
  useMapKeyboardShortcuts(map, {
    controls: terrainControls,
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

  // viewer layout

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
      onRefresh={() => void loadData()}
      dateStepper={dateStepper}
    />
  );

  const switchingDay = dateStepper.pendingDate;
  // map way
  const preparing =
    !error &&
    (!map || modelRunning || layerPending || Boolean(activeResult && !hasRiskLayers) || (!model && loading));
  const loadingTitle = switchingDay
    ? t("modelResults.dateStep.loading", {
        date: new Date(`${switchingDay}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "long" }),
        defaultValue: "Loading the map for {{date}}",
      })
    : preparing
      ? modelRunning
        ? t("modelResults.preparing.title", "Preparing your risk map")
        : // finished model loading
          t("modelResults.opening.title", "Loading your map")
      : null;
  const mapOverlays = (
    <>
      <DateStepperBar
        stepper={dateStepper}
        summary={layerReady && !switchingDay && dailyFrames.length < 2 ? <RiskSummary metrics={frameMetrics} /> : null}
      />
      {loadingTitle && (
        <div className="md-fade-in pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-background/45 backdrop-blur-[2px]">
          <div className="md-rise flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-5 py-4 shadow-xl">
            <Loader2 className="h-6 w-6 shrink-0 animate-spin text-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">{loadingTitle}</p>
              <p className="text-xs text-muted-foreground">
                {switchingDay
                  ? t("modelResults.dateStep.loadingHint", "Prepared days open in a few seconds.")
                  : modelRunning
                    ? t(
                        "modelResults.preparing.hint",
                        "Prepared days open in a few seconds, other days take a few minutes.",
                      )
                    : t("modelResults.opening.hint", "Just a moment…")}
              </p>
            </div>
          </div>
        </div>
      )}
      {layerReady && dailyFrames.length >= 2 && (
        // multi-day runs timeline
        <DailyRiskCard
          days={dailyFrames.map((frame) => frame.key.slice(5))}
          activeDate={playingFrameDate}
          peakDate={peakDate}
          playing={playing}
          onTogglePlay={() => setPlaying((v) => !v)}
          onSelectDate={(date) => showFrameByDate(date, true)}
          weather={currentFrameWeather}
          summary={<RiskSummary metrics={frameMetrics} />}
        />
      )}

      {/* 3d terrain layer */}
      {show3D && wms3D && (
        <Suspense fallback={null}>
          <CesiumWildfire3DView
            onExit={() => setShow3D(false)}
            wmsUrl={wms3D.wmsUrl}
            layerName={wms3D.layerName}
            aoi={model?.coordinates}
            visibleRiskLevels={visibleRiskLevels}
            layerVisible={layerVisible}
            controlsRef={terrainControlsRef}
          />
        </Suspense>
      )}

      <ViewerStatusBanners
        // one loading card
        mapReady={Boolean(map) || Boolean(loadingTitle)}
        loading={loading}
        error={error}
        tileErrors={tileErrors}
        layerPending={layerPending && !loadingTitle}
        hasResults={results.length > 0 || Boolean(loadingTitle)}
      />


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
        <MapShortcutsPanel
          canPlay={layerReady && dailyFrames.length >= 2}
          can3D={Boolean(wms3D)}
          hasRiskLayers={hasRiskLayers}
          canFullscreen
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
