import { useCallback, useEffect, useRef, useState } from "react";
import type Map from "ol/Map";
import { useTranslation } from "@/i18n";
import axios from "@/lib/axios";

import {
  DEFAULT_VISIBLE_RISK_LEVELS,
  RISK_LEVELS,
  type AvailableLayer,
  type LayerInfo,
  type ModelResult,
  type RiskLayerEntry,
  type RiskLayerSelection,
  type VisibleRiskLevels,
} from "../viewer-config";
import { buildWMSLayer, extractErrorMessage, fitMapToBounds } from "../viewer-helpers";

interface UseRiskLayersArgs {
  map: Map | null;
  modelId: number | undefined;
  layerVisible: boolean;
  layerOpacity: number;
  visibleRiskLevels: VisibleRiskLevels;
  onError: (message: string) => void;
}

// Owns the per-class WMS layers on the map: attach/detach, dataset switching,
// in-place daily-frame swaps, and reactive visibility/opacity.
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

  const riskLayerEntriesRef = useRef<RiskLayerEntry[]>([]);
  const visibleRiskLevelsRef = useRef<VisibleRiskLevels>(DEFAULT_VISIBLE_RISK_LEVELS);
  const attachLayerRequestRef = useRef(0);
  const renderRefreshRafRef = useRef<number | null>(null);
  const renderRefreshTimeoutsRef = useRef<number[]>([]);

  const clearScheduledMapRenderRefreshes = useCallback(() => {
    if (renderRefreshRafRef.current !== null) {
      cancelAnimationFrame(renderRefreshRafRef.current);
      renderRefreshRafRef.current = null;
    }
    renderRefreshTimeoutsRef.current.forEach((id) => clearTimeout(id));
    renderRefreshTimeoutsRef.current = [];
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
    if (!map) return;
    riskLayerEntriesRef.current.forEach(({ layer }) => map.removeLayer(layer));
    riskLayerEntriesRef.current = [];
    setRiskLayerEntries([]);
    scheduleMapRenderRefresh();
  }, [map, scheduleMapRenderRefresh]);

  const attachLayer = useCallback(
    async (result: ModelResult) => {
      if (!map || result.geoserver_status !== "configured") return;
      const requestId = ++attachLayerRequestRef.current;
      const requestedLayerKey = selectedLayerKeyRef.current;
      try {
        const resp = await axios.get(`/results/${result.id}/layer`);
        if (requestId !== attachLayerRequestRef.current) return;

        const info: LayerInfo | undefined = resp.data?.data;
        if (!info?.wms_url || !info.layer_name) {
          onError(t("modelResults.errors.layerIncomplete", "Layer configuration is incomplete"));
          return;
        }

        const layerOptions = info.available_layers ?? [];
        setAvailableLayers(layerOptions);
        // Render the currently selected component layer (defaults to the risk map).
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

        removeRiskLayerEntries();

        const activeInfo: LayerInfo = { ...info, layer_name: activeLayer.layerName };
        setWms3D({ wmsUrl: info.wms_url, layerName: activeLayer.layerName });

        const newRiskLayerEntries = RISK_LEVELS.map((riskLevel) => {
          const riskLayer = buildWMSLayer(activeInfo, riskLevel.style, 450 + riskLevel.value);
          riskLayer.setVisible(layerVisible && visibleRiskLevelsRef.current[riskLevel.value]);
          const source = riskLayer.getSource();
          source?.updateParams({
            VIEWER_LAYER_KEY: activeLayer.key,
            VIEWER_LAYER_REFRESH: String(requestId),
          });
          source?.on("tileloadend", scheduleMapRenderRefresh);
          source?.on("tileloaderror", () => {
            setTileErrors((n) => n + 1);
            scheduleMapRenderRefresh();
          });
          map.addLayer(riskLayer);
          return { value: riskLevel.value, layer: riskLayer };
        });
        setRiskLayerEntries(newRiskLayerEntries);
        riskLayerEntriesRef.current = newRiskLayerEntries;

        if (info.bounds) fitMapToBounds(map, info.bounds);
        scheduleMapRenderRefresh();
      } catch (err) {
        onError(
          extractErrorMessage(
            err,
            t("modelResults.errors.layerLoad", "Failed to load layer from GeoServer")
          )
        );
      }
    },
    [layerVisible, map, onError, removeRiskLayerEntries, scheduleMapRenderRefresh, t]
  );

  // Switch the visualized dataset; all layers share the 0–5 scale.
  const selectLayer = useCallback(
    (key: string, activeResult: ModelResult | undefined) => {
      setSelectedLayerKey(key);
      selectedLayerKeyRef.current = key;
      if (!map || !activeResult || activeResult.geoserver_status !== "configured") return;
      removeRiskLayerEntries();
      attachLayer(activeResult);
    },
    [map, attachLayer, removeRiskLayerEntries]
  );

  // Swap the WMS layer in place so frames advance without the map jumping.
  const applyDailyFrame = useCallback((frame: AvailableLayer) => {
    selectedLayerKeyRef.current = frame.key;
    setSelectedLayerKey(frame.key);
    riskLayerEntriesRef.current.forEach(({ layer }) => {
      layer.getSource()?.updateParams({ LAYERS: frame.layer_name, VIEWER_LAYER_KEY: frame.key });
    });
    setWms3D((w) => (w ? { ...w, layerName: frame.layer_name } : w));
  }, []);

  // Reactive layer controls.
  useEffect(() => {
    visibleRiskLevelsRef.current = visibleRiskLevels;
  }, [visibleRiskLevels]);

  useEffect(() => {
    riskLayerEntries.forEach(({ value, layer: riskLayer }) => {
      riskLayer.setVisible(layerVisible && visibleRiskLevels[value]);
    });
    scheduleMapRenderRefresh();
  }, [layerVisible, riskLayerEntries, scheduleMapRenderRefresh, visibleRiskLevels]);

  useEffect(() => {
    riskLayerEntries.forEach(({ layer: riskLayer }) => {
      riskLayer.setOpacity(layerOpacity);
    });
    scheduleMapRenderRefresh();
  }, [layerOpacity, riskLayerEntries, scheduleMapRenderRefresh]);

  // Detach on unmount / id change.
  useEffect(() => {
    return () => {
      if (map) {
        riskLayerEntriesRef.current.forEach(({ layer: riskLayer }) => {
          map.removeLayer(riskLayer);
        });
      }
      attachLayerRequestRef.current += 1;
      riskLayerEntriesRef.current = [];
      clearScheduledMapRenderRefreshes();
    };
  }, [clearScheduledMapRenderRefreshes, map, modelId]);

  return {
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
  };
};
