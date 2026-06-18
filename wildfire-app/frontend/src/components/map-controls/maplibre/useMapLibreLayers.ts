import { useEffect, useCallback, useRef, useMemo } from 'react';
import type maplibregl from 'maplibre-gl';
import {
  addOrUpdateRegionBoundaries,
  addOrUpdatePolygon,
  setupBoundaryInteractions,
  addOrUpdateUserModels,
  setupUserModelInteractions,
} from './maplibre-layers';
import { reprojectGeoJSON } from '@/features/interactive-map/utils/geojsonProjection';

type GeoJSONInput = GeoJSON.GeoJSON | null;

export interface LayerData {
  availableBoundaryGeoJSON?: GeoJSONInput;
  selectedBoundaryFeature?: GeoJSONInput;
  showBoundary?: boolean;
  polygonCoordinates?: [number, number][][];
  onBoundaryRegionClick?: (regionName: string) => void;
  userModelGeoJSON?: GeoJSONInput;
  onUserModelClick?: (modelId: number, status?: string) => void;
}

export function useMapLibreLayers(
  mapRef: React.RefObject<maplibregl.Map | null>,
  data: LayerData,
) {
  const {
    availableBoundaryGeoJSON,
    selectedBoundaryFeature,
    showBoundary = true,
    polygonCoordinates,
    onBoundaryRegionClick,
    userModelGeoJSON,
    onUserModelClick,
  } = data;

  const boundaryClickRef = useRef(onBoundaryRegionClick);
  boundaryClickRef.current = onBoundaryRegionClick;
  const boundaryCleanupRef = useRef<(() => void) | null>(null);

  const modelClickRef = useRef(onUserModelClick);
  modelClickRef.current = onUserModelClick;
  const modelCleanupRef = useRef<(() => void) | null>(null);

  const userModels = useMemo(() => reprojectGeoJSON(userModelGeoJSON), [userModelGeoJSON]);

  const loadAll = useCallback((map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) return;

    addOrUpdateRegionBoundaries(
      map,
      availableBoundaryGeoJSON,
      selectedBoundaryFeature,
      showBoundary
    );
    addOrUpdatePolygon(map, polygonCoordinates);
    addOrUpdateUserModels(map, userModels);
  }, [
    userModels,
    availableBoundaryGeoJSON,
    selectedBoundaryFeature,
    showBoundary,
    polygonCoordinates,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      loadAll(map);
    } else {
      map.once('load', () => loadAll(map));
    }
  }, [mapRef, loadAll]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupInteractions = () => {
      if (availableBoundaryGeoJSON && map.getLayer('region-boundaries-available-fill')) {
        boundaryCleanupRef.current?.();
        boundaryCleanupRef.current = setupBoundaryInteractions(
          map,
          (name) => boundaryClickRef.current?.(name),
        );
      } else if (!availableBoundaryGeoJSON) {
        boundaryCleanupRef.current?.();
        boundaryCleanupRef.current = null;
      }

      if (userModelGeoJSON && map.getLayer('user-models-fill')) {
        modelCleanupRef.current?.();
        modelCleanupRef.current = setupUserModelInteractions(
          map,
          (id) => modelClickRef.current?.(id),
        );
      } else if (!userModelGeoJSON) {
        modelCleanupRef.current?.();
        modelCleanupRef.current = null;
      }
    };

    if (map.isStyleLoaded()) {
      setupInteractions();
    } else {
      map.on('idle', setupInteractions);
      return () => { map.off('idle', setupInteractions); };
    }

    return () => {
      boundaryCleanupRef.current?.();
      boundaryCleanupRef.current = null;
      modelCleanupRef.current?.();
      modelCleanupRef.current = null;
    };
  }, [mapRef, availableBoundaryGeoJSON, userModelGeoJSON]);

  return { loadAll };
}
