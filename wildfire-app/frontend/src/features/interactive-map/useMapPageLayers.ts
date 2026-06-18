import { useState, useEffect, useCallback, useRef } from 'react';
import { modelService } from '@/features/model-dashboard/services/modelService';
import { reprojectGeoJSON } from '@/features/interactive-map/utils/geojsonProjection';

interface MapPageLayerData {
  availableBoundaryGeoJSON?: GeoJSON.FeatureCollection;
  userModelGeoJSON?: GeoJSON.FeatureCollection;
  regionCount: number;
  modelCount: number;
}

/**
 * Hook: Fetches the current user's model polygons (private) for display on the
 * /map page. Available region boundaries are no longer fetched.
 */
export function useMapPageLayers(isAuthenticated: boolean): MapPageLayerData {
  const [data, setData] = useState<MapPageLayerData>({
    regionCount: 0,
    modelCount: 0,
  });
  const fetchedRef = useRef(false);

  const fetchUserModels = useCallback(async () => {
    if (!isAuthenticated) return undefined;
    try {
      const response = await modelService.getModels({ limit: 100 });
      if (!response.success || !response.data?.length) return undefined;

      const features: GeoJSON.Feature[] = [];
      for (const model of response.data) {
        if (!model.coordinates) continue;
        const coords = model.coordinates as { type?: string; coordinates?: unknown };
        if (!coords.type || !coords.coordinates) continue;

        features.push({
          type: 'Feature',
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

      const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
      return { fc: reprojectGeoJSON(fc), count: response.data.length };
    } catch {
      return undefined;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      const models = await fetchUserModels();
      setData({
        availableBoundaryGeoJSON: undefined,
        userModelGeoJSON: models?.fc ?? undefined,
        regionCount: 0,
        modelCount: models?.count ?? 0,
      });
    })();
  }, [fetchUserModels]);

  return data;
}
