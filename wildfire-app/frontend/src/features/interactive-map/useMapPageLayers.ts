import { useState, useEffect, useCallback } from "react";
import { modelService } from "@/features/model-dashboard";
import { reprojectGeoJSON } from "@/features/interactive-map/utils/geojsonProjection";
import { getModelResults, getResultLayer } from "@/features/model-results/services/resultsService";
import { findResultForModel, type LayerInfo, type ModelResult } from "@/features/model-results/viewer-config";
const MAP_MODEL_LIMIT = 1;

interface MapPageLayerData {
  availableBoundaryGeoJSON?: GeoJSON.FeatureCollection;
  userModelGeoJSON?: GeoJSON.FeatureCollection;
  regionCount: number;
  modelCount: number;
  modelTotal: number;
  /** finished model risk */
  riskLayer?: LayerInfo;
}

// configured result layer
async function loadRiskLayer(modelId: number): Promise<LayerInfo | undefined> {
  try {
    const result = findResultForModel(await getModelResults<ModelResult>(modelId), modelId);
    if (result?.geoserver_status !== "configured") return undefined;
    const info = await getResultLayer<LayerInfo>(result.id);
    if (!info?.wms_url || !info.layer_name) return undefined;
    const risk = info.available_layers?.find((l) => l.key === "risk");
    return { ...info, layer_name: risk?.layer_name ?? info.layer_name, version: result.id };
  } catch {
    // outline only then
    return undefined;
  }
}
export function useMapPageLayers(userId: string | number | null | undefined): MapPageLayerData {
  const [data, setData] = useState<MapPageLayerData>({
    regionCount: 0,
    modelCount: 0,
    modelTotal: 0,
  });
  const fetchUserModels = useCallback(async () => {
    if (userId == null) return undefined;
    try {
      const response = await modelService.getModels({
        mine: true,
        limit: MAP_MODEL_LIMIT,
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (!response.success || !response.data?.length) return undefined;

      const features: GeoJSON.Feature[] = [];
      let riskLayer: LayerInfo | undefined;
      for (const model of response.data) {
        if (!model.coordinates) continue;
        const coords = model.coordinates as { type?: string; coordinates?: unknown };
        if (!coords.type || !coords.coordinates) continue;
        const risk = !riskLayer && model.status === "completed" ? await loadRiskLayer(model.id) : undefined;
        riskLayer ??= risk;

        features.push({
          type: "Feature",
          properties: {
            model_id: model.id,
            title: model.title,
            status: model.status,
            region: model.region,
            country: model.country,
            has_risk: Boolean(risk),
          },
          geometry: coords as GeoJSON.Geometry,
        });
      }

      if (features.length === 0) return undefined;

      const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
      return {
        fc: reprojectGeoJSON(fc),
        count: features.length,
        total: response.total ?? features.length,
        riskLayer,
      };
    } catch {
      return undefined;
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    if (userId == null) {
      setData({ regionCount: 0, modelCount: 0, modelTotal: 0 });
      return;
    }

    (async () => {
      const models = await fetchUserModels();
      if (cancelled) return;
      setData({
        availableBoundaryGeoJSON: undefined,
        userModelGeoJSON: models?.fc ?? undefined,
        regionCount: 0,
        modelCount: models?.count ?? 0,
        modelTotal: models?.total ?? 0,
        riskLayer: models?.riskLayer,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchUserModels, userId]);

  return data;
}
