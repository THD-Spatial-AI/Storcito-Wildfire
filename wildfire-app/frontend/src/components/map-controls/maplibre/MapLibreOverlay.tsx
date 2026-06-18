import React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as OlMap } from 'ol';
import { useMapLibreMap } from './useMapLibreMap';
import { useMapLibreLayers, type LayerData } from './useMapLibreLayers';
import { useMapLibreInteractions, type InteractionCallbacks } from './useMapLibreInteractions';
import { useOlLayerSync } from './useOlLayerSync';

interface MapLibreOverlayProps extends LayerData, InteractionCallbacks {
  olMap: OlMap;
  visible: boolean;
  isDrawing?: boolean;
}

export const MapLibreOverlay: React.FC<MapLibreOverlayProps> = ({
  olMap,
  visible,
  isDrawing = false,
  availableBoundaryGeoJSON,
  selectedBoundaryFeature,
  showBoundary,
  polygonCoordinates,
  onBoundaryRegionClick,
  userModelGeoJSON,
  onUserModelClick,
  onMapClick,
}) => {
  const { containerRef, mapRef } = useMapLibreMap(olMap, visible, isDrawing);

  useMapLibreLayers(mapRef, {
    availableBoundaryGeoJSON,
    selectedBoundaryFeature,
    showBoundary,
    polygonCoordinates,
    onBoundaryRegionClick,
    userModelGeoJSON,
    onUserModelClick,
  });

  useMapLibreInteractions(mapRef, olMap, visible, { onMapClick });
  useOlLayerSync(olMap, visible, isDrawing);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
      }}
    />
  );
};
