import { getResultLayer } from "@/features/model-results/services/resultsService";
import { useCallback, useEffect, useRef, useState } from "react";
import type OlMap from "ol/Map";
import { useTranslation } from "@/i18n";

import {
  DEFAULT_VISIBLE_RISK_LEVELS,
  type AvailableLayer,
  type LayerInfo,
  type ModelResult,
  type RiskLayerEntry,
  type RiskLayerSelection,
  type VisibleRiskLevels,
} from "../viewer-config";
import { buildWMSLayer, extractErrorMessage, fitMapToBounds } from "../viewer-helpers";
import { selectRiskStyleGroups } from "../risk-style-groups";

interface UseRiskLayersArgs {
  map: OlMap | null;
  modelId: number | undefined;
  layerVisible: boolean;
  layerOpacity: number;
  visibleRiskLevels: VisibleRiskLevels;
  onError: (message: string) => void;
}

const TILE_RETRY_DELAYS_MS = [750, 2_000] as const;

// tile events fire
interface TileLoadStats {
  pending: number;
  failed: number;
}

// owns grouped wms
export const useRiskLayers = ({
  map,
  modelId,
  layerVisible,
  layerOpacity,
  visibleRiskLevels,
  onError,
}: UseRiskLayersArgs) => {
  const { t } = useTranslation();

  const [riskLayerEntries, setRiskLayerEntries] = useState<RiskLayerEntry[]>([]);
  const [availableLayers, setAvailableLayers] = useState<AvailableLayer[]>([]);
  const [selectedLayerKey, setSelectedLayerKey] = useState<string>("risk");
  const selectedLayerKeyRef = useRef<string>("risk");
  const [tileErrors, setTileErrors] = useState(0);
  const [wms3D, setWms3D] = useState<{ wmsUrl: string; layerName: string } | null>(null);
  const [attachedResultId, setAttachedResultId] = useState<number | null>(null);

  const riskLayerEntriesRef = useRef<RiskLayerEntry[]>([]);
  const visibleRiskLevelsRef = useRef<VisibleRiskLevels>(DEFAULT_VISIBLE_RISK_LEVELS);
  const layerVisibleRef = useRef(layerVisible);
  const layerOpacityRef = useRef(layerOpacity);
  const activeLayerInfoRef = useRef<LayerInfo | null>(null);
  const attachLayerRequestRef = useRef(0);
  const renderRefreshRafRef = useRef<number | null>(null);
  const renderRefreshTimeoutsRef = useRef<number[]>([]);
  const tileRetryTimeoutsRef = useRef<Map<RiskLayerEntry["layer"], number>>(new Map());
  const tileLoadStatsRef = useRef<Map<RiskLayerEntry["layer"], TileLoadStats>>(new Map());
  const attachLayerInFlightKeyRef = useRef<string | null>(null);

  const clearScheduledMapRenderRefreshes = useCallback(() => {
    if (renderRefreshRafRef.current !== null) {
      cancelAnimationFrame(renderRefreshRafRef.current);
      renderRefreshRafRef.current = null;
    }
    renderRefreshTimeoutsRef.current.forEach((id) => clearTimeout(id));
    renderRefreshTimeoutsRef.current = [];
  }, []);

  const clearTileRetryTimeouts = useCallback((targetLayer?: RiskLayerEntry["layer"]) => {
    if (targetLayer) {
      const timeoutId = tileRetryTimeoutsRef.current.get(targetLayer);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      tileRetryTimeoutsRef.current.delete(targetLayer);
      return;
    }
    tileRetryTimeoutsRef.current.forEach((id) => clearTimeout(id));
    tileRetryTimeoutsRef.current.clear();
  }, []);

  const syncTileLoadErrors = useCallback(() => {
    const currentEntries = riskLayerEntriesRef.current;
    if (currentEntries.length === 0) {
      setTileErrors(0);
      return;
    }

    const stats = currentEntries.map(({ layer }) => tileLoadStatsRef.current.get(layer));
    const failed = stats.reduce((total, stat) => total + (stat?.failed ?? 0), 0);
    if (failed > 0) {
      setTileErrors(failed);
      return;
    }

    // not let one
    if (stats.every((stat) => stat !== undefined && stat.pending === 0)) setTileErrors(0);
  }, []);

  const scheduleMapRenderRefresh = useCallback(() => {
    if (!map) return;

    clearScheduledMapRenderRefreshes();
    const refresh = () => {
      if (!map.getTarget()) return;
      map.getLayers().forEach((layer) => {
        layer.changed();
      });
      map.updateSize();
      map.renderSync();
    };

    renderRefreshRafRef.current = requestAnimationFrame(() => {
      renderRefreshRafRef.current = null;
      refresh();
    });
    [80, 250, 600, 1200].forEach((delay) => {
      renderRefreshTimeoutsRef.current.push(window.setTimeout(refresh, delay));
    });
  }, [clearScheduledMapRenderRefreshes, map]);

  const removeRiskLayerEntries = useCallback(() => {
    setAttachedResultId(null);
    clearTileRetryTimeouts();
    riskLayerEntriesRef.current.forEach(({ layer }) => {
      if (map) map.removeLayer(layer);
      tileLoadStatsRef.current.delete(layer);
    });
    riskLayerEntriesRef.current = [];
    setRiskLayerEntries([]);
    setTileErrors(0);
    if (map) scheduleMapRenderRefresh();
  }, [clearTileRetryTimeouts, map, scheduleMapRenderRefresh]);

  const reconcileRiskLayerEntries = useCallback(
    (info: LayerInfo) => {
      if (!map) return;

      const styleGroups = selectRiskStyleGroups(visibleRiskLevelsRef.current);
      // actually reaches wms
      const sourceKey = `${info.wms_url}|${info.layer_name}|${info.version ?? ""}`;
      const currentById = new Map(riskLayerEntriesRef.current.map((entry) => [entry.id, entry]));
      const entriesToAdd: RiskLayerEntry[] = [];

      const removeEntry = (entry: RiskLayerEntry) => {
        clearTileRetryTimeouts(entry.layer);
        tileLoadStatsRef.current.delete(entry.layer);
        map.removeLayer(entry.layer);
      };

      const nextEntries = styleGroups.map((group, index): RiskLayerEntry => {
        const existing = currentById.get(group.id);
        if (
          existing &&
          existing.style === group.style &&
          existing.sourceKey === sourceKey
        ) {
          currentById.delete(group.id);
          existing.layer.setZIndex(450 + index);
          existing.layer.setVisible(layerVisibleRef.current);
          existing.layer.setOpacity(layerOpacityRef.current);
          return { ...existing, values: group.values };
        }

        if (existing) {
          currentById.delete(group.id);
          removeEntry(existing);
        }

        const riskLayer = buildWMSLayer(info, group.style, 450 + index);
        riskLayer.setVisible(layerVisibleRef.current);
        riskLayer.setOpacity(layerOpacityRef.current);
        tileLoadStatsRef.current.set(riskLayer, { pending: 0, failed: 0 });

        const source = riskLayer.getSource();
        let retryAttempt = 0;
        const isCurrentLayer = () =>
          riskLayerEntriesRef.current.some(({ layer }) => layer === riskLayer);
        const stats = () => tileLoadStatsRef.current.get(riskLayer);

        source?.on("tileloadstart", () => {
          const stat = stats();
          if (!stat || !isCurrentLayer()) return;
          // fresh cycle clears
          if (stat.pending === 0) stat.failed = 0;
          stat.pending += 1;
        });
        source?.on("tileloadend", () => {
          const stat = stats();
          if (!stat || !isCurrentLayer()) return;
          stat.pending = Math.max(stat.pending - 1, 0);
          if (stat.pending === 0 && stat.failed === 0) {
            retryAttempt = 0;
            clearTileRetryTimeouts(riskLayer);
          }
          syncTileLoadErrors();
          scheduleMapRenderRefresh();
        });
        source?.on("tileloaderror", () => {
          const stat = stats();
          if (!stat || !isCurrentLayer()) return;
          stat.pending = Math.max(stat.pending - 1, 0);
          stat.failed += 1;
          syncTileLoadErrors();
          scheduleMapRenderRefresh();

          const retryDelay = TILE_RETRY_DELAYS_MS[retryAttempt];
          if (retryDelay === undefined) return;
          // one retry cycle
          if (tileRetryTimeoutsRef.current.has(riskLayer)) return;
          retryAttempt += 1;

          const timeoutId = window.setTimeout(() => {
            if (tileRetryTimeoutsRef.current.get(riskLayer) !== timeoutId) return;
            tileRetryTimeoutsRef.current.delete(riskLayer);
            if (!isCurrentLayer()) return;
            // refresh re-requests visible
            source.refresh();
          }, retryDelay);
          tileRetryTimeoutsRef.current.set(riskLayer, timeoutId);
        });

        const entry = {
          id: group.id,
          style: group.style,
          sourceKey,
          values: group.values,
          layer: riskLayer,
        };
        entriesToAdd.push(entry);
        return entry;
      });

      currentById.forEach(removeEntry);
      riskLayerEntriesRef.current = nextEntries;
      setRiskLayerEntries(nextEntries);
      entriesToAdd.forEach(({ layer }) => map.addLayer(layer));
      syncTileLoadErrors();
      scheduleMapRenderRefresh();
    },
    [clearTileRetryTimeouts, map, scheduleMapRenderRefresh, syncTileLoadErrors]
  );

  const attachLayer = useCallback(
    async (result: ModelResult) => {
      if (!map || result.geoserver_status !== "configured") return;
      const inFlightKey = `${result.id}:${selectedLayerKeyRef.current}`;
      if (attachLayerInFlightKeyRef.current === inFlightKey) return;
      attachLayerInFlightKeyRef.current = inFlightKey;
      const requestId = ++attachLayerRequestRef.current;
      const requestedLayerKey = selectedLayerKeyRef.current;
      try {
        const info = await getResultLayer<LayerInfo>(result.id);
        if (requestId !== attachLayerRequestRef.current) return;

        if (!info?.wms_url || !info.layer_name) {
          activeLayerInfoRef.current = null;
          setAttachedResultId(null);
          onError(t("modelResults.errors.layerIncomplete", "Layer configuration is incomplete"));
          return;
        }

        const layerOptions = info.available_layers ?? [];
        setAvailableLayers(layerOptions);
        // render selected component
        const selectedLayer = layerOptions.find((l) => l.key === requestedLayerKey);
        const fallbackLayer = layerOptions.find((l) => l.key === "risk");
        const activeLayer: RiskLayerSelection = selectedLayer
          ? { key: selectedLayer.key, layerName: selectedLayer.layer_name }
          : {
              key: fallbackLayer?.key ?? "risk",
              layerName: fallbackLayer?.layer_name ?? info.layer_name,
            };
        if (activeLayer.key !== requestedLayerKey) {
          selectedLayerKeyRef.current = activeLayer.key;
          setSelectedLayerKey(activeLayer.key);
        }

        const activeInfo: LayerInfo = { ...info, layer_name: activeLayer.layerName, version: result.id };
        activeLayerInfoRef.current = activeInfo;
        setWms3D({ wmsUrl: info.wms_url, layerName: activeLayer.layerName });

        // move final extent
        if (info.bounds) fitMapToBounds(map, info.bounds);
        reconcileRiskLayerEntries(activeInfo);
        setAttachedResultId(result.id);
      } catch (err) {
        if (requestId !== attachLayerRequestRef.current) return;
        activeLayerInfoRef.current = null;
        setAttachedResultId(null);
        onError(
          extractErrorMessage(
            err,
            t("modelResults.errors.layerLoad", "Failed to load layer from GeoServer")
          )
        );
      } finally {
        if (attachLayerInFlightKeyRef.current === inFlightKey) {
          attachLayerInFlightKeyRef.current = null;
        }
      }
    },
    [map, onError, reconcileRiskLayerEntries, t]
  );

  // switch visualized dataset
  const selectLayer = useCallback(
    (key: string, activeResult: ModelResult | undefined) => {
      setSelectedLayerKey(key);
      selectedLayerKeyRef.current = key;
      if (!map || !activeResult || activeResult.geoserver_status !== "configured") return;
      activeLayerInfoRef.current = null;
      removeRiskLayerEntries();
      attachLayer(activeResult);
    },
    [map, attachLayer, removeRiskLayerEntries]
  );

  // swap wms layer
  const applyDailyFrame = useCallback((frame: AvailableLayer) => {
    selectedLayerKeyRef.current = frame.key;
    setSelectedLayerKey(frame.key);
    if (activeLayerInfoRef.current) {
      activeLayerInfoRef.current = {
        ...activeLayerInfoRef.current,
        layer_name: frame.layer_name,
      };
    }
    const nextSourceKey = activeLayerInfoRef.current
      ? `${activeLayerInfoRef.current.wms_url}|${frame.layer_name}|${activeLayerInfoRef.current.version ?? ""}`
      : "";
    const nextEntries = riskLayerEntriesRef.current.map((entry) => {
      const { layer } = entry;
      tileLoadStatsRef.current.set(layer, { pending: 0, failed: 0 });
      // layers alone identifies
      layer.getSource()?.updateParams({ LAYERS: frame.layer_name });
      return { ...entry, sourceKey: nextSourceKey };
    });
    riskLayerEntriesRef.current = nextEntries;
    setRiskLayerEntries(nextEntries);
    setTileErrors(0);
    setWms3D((w) => (w ? { ...w, layerName: frame.layer_name } : w));
  }, []);

  // current frame fully
  const isFrameLoaded = useCallback(
    () =>
      riskLayerEntriesRef.current.every(
        ({ layer }) => (tileLoadStatsRef.current.get(layer)?.pending ?? 0) === 0
      ),
    []
  );

  // reactive layer controls
  useEffect(() => {
    visibleRiskLevelsRef.current = visibleRiskLevels;
    if (activeLayerInfoRef.current) {
      reconcileRiskLayerEntries(activeLayerInfoRef.current);
    }
  }, [reconcileRiskLayerEntries, visibleRiskLevels]);

  useEffect(() => {
    layerVisibleRef.current = layerVisible;
    riskLayerEntries.forEach(({ layer: riskLayer }) => {
      riskLayer.setVisible(layerVisible);
    });
    scheduleMapRenderRefresh();
  }, [layerVisible, riskLayerEntries, scheduleMapRenderRefresh]);

  useEffect(() => {
    layerOpacityRef.current = layerOpacity;
    riskLayerEntries.forEach(({ layer: riskLayer }) => {
      riskLayer.setOpacity(layerOpacity);
    });
    scheduleMapRenderRefresh();
  }, [layerOpacity, riskLayerEntries, scheduleMapRenderRefresh]);

  // detach unmount id
  useEffect(() => {
    const tileLoadStats = tileLoadStatsRef.current;
    activeLayerInfoRef.current = null;
    riskLayerEntriesRef.current = [];
    setRiskLayerEntries([]);
    setAvailableLayers([]);
    setTileErrors(0);
    setWms3D(null);
    selectedLayerKeyRef.current = "risk";
    setSelectedLayerKey("risk");
    setAttachedResultId(null);
    attachLayerInFlightKeyRef.current = null;
    tileLoadStats.clear();
    return () => {
      if (map) {
        riskLayerEntriesRef.current.forEach(({ layer: riskLayer }) => {
          map.removeLayer(riskLayer);
        });
      }
      attachLayerRequestRef.current += 1;
      riskLayerEntriesRef.current = [];
      activeLayerInfoRef.current = null;
      attachLayerInFlightKeyRef.current = null;
      tileLoadStats.clear();
      clearTileRetryTimeouts();
      clearScheduledMapRenderRefreshes();
    };
  }, [clearTileRetryTimeouts, clearScheduledMapRenderRefreshes, map, modelId]);

  return {
    availableLayers,
    selectedLayerKey,
    selectedLayerKeyRef,
    tileErrors,
    wms3D,
    attachedResultId,
    layerAttached: attachedResultId !== null,
    attachLayer,
    selectLayer,
    applyDailyFrame,
    isFrameLoaded,
  };
};
