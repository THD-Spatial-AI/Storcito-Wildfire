import { useState, useEffect, useCallback } from "react";
import { modelService } from "@/features/model-dashboard/services/modelService";
import { reprojectGeoJSON } from "@/features/interactive-map/utils/geojsonProjection";
export const MAP_MODEL_LIMIT = 100;

interface MapPageLayerData {
  availableBoundaryGeoJSON?: GeoJSON.FeatureCollection;
  userModelGeoJSON?: GeoJSON.FeatureCollection;
  regionCount: number;
  modelCount: number;
  modelTotal: number;
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
      // Newest first, so the cap below keeps the models a user is actually working on.
      const response = await modelService.getModels({
        limit: MAP_MODEL_LIMIT,
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (!response.success || !response.data?.length) return undefined;

      const features: GeoJSON.Feature[] = [];
      for (const model of response.data) {
        if (!model.coordinates) continue;
        const coords = model.coordinates as { type?: string; coordinates?: unknown };
        if (!coords.type || !coords.coordinates) continue;

        features.push({
          type: "Feature",
          properties: {
            model_id: model.id,
            title: model.title,
            status: model.status,
            region: model.region,
            country: model.country,
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
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchUserModels, userId]);

  return data;
}
