import type maplibregl from 'maplibre-gl';
import { Popup as MapLibrePopup } from 'maplibre-gl';
import {
  BOUNDARY_COLORS,
  POLYGON_COLORS,
  USER_MODEL_COLORS,
} from './maplibre-styles';

type GeoJSONInput = GeoJSON.GeoJSON | null | undefined;

function clearSource(map: maplibregl.Map, sourceId: string): void {
  const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  if (src) src.setData({ type: 'FeatureCollection', features: [] });
}

function toFeatureCollection(input: GeoJSONInput): GeoJSON.FeatureCollection | null {
  if (!input) return null;
  if (input.type === 'FeatureCollection' && Array.isArray(input.features)) {
    return input;
  }
  if (input.type === 'Feature') {
    return { type: 'FeatureCollection', features: [input] };
  }
  return null;
}

const REGION_AVAILABLE_SOURCE_ID = 'region-boundaries-available';
const REGION_SELECTED_SOURCE_ID = 'region-boundary-selected';
const REGION_AVAILABLE_FILL_LAYER_ID = 'region-boundaries-available-fill';
const USER_POLYGON_SOURCE_ID = 'user-polygon';
const USER_MODELS_SOURCE_ID = 'user-models';
const USER_MODELS_FILL_LAYER_ID = 'user-models-fill';
const FILL_COLOR_PAINT = 'fill-color';

export function addOrUpdateRegionBoundaries(
  map: maplibregl.Map,
  availableBoundaryGeoJSON?: GeoJSONInput,
  selectedBoundaryFeature?: GeoJSONInput,
  visible: boolean = true,
): void {
  if (!visible) {
    clearSource(map, REGION_AVAILABLE_SOURCE_ID);
    clearSource(map, REGION_SELECTED_SOURCE_ID);
    return;
  }

  const availableFC = toFeatureCollection(availableBoundaryGeoJSON) || { type: 'FeatureCollection', features: [] };
  const selectedFC = toFeatureCollection(selectedBoundaryFeature) || { type: 'FeatureCollection', features: [] };

  const availableSource = map.getSource(REGION_AVAILABLE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (availableSource) availableSource.setData(availableFC);
  else map.addSource(REGION_AVAILABLE_SOURCE_ID, { type: 'geojson', data: availableFC });

  const selectedSource = map.getSource(REGION_SELECTED_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (selectedSource) selectedSource.setData(selectedFC);
  else map.addSource(REGION_SELECTED_SOURCE_ID, { type: 'geojson', data: selectedFC });

  if (map.getLayer(REGION_AVAILABLE_FILL_LAYER_ID)) return;

  map.addLayer({
    id: REGION_AVAILABLE_FILL_LAYER_ID,
    type: 'fill',
    source: REGION_AVAILABLE_SOURCE_ID,
    paint: { [FILL_COLOR_PAINT]: BOUNDARY_COLORS.availableFill, 'fill-opacity': 1 },
  });

  map.addLayer({
    id: 'region-boundaries-available-line',
    type: 'line',
    source: REGION_AVAILABLE_SOURCE_ID,
    paint: { 'line-color': BOUNDARY_COLORS.availableStroke, 'line-width': 1.4, 'line-dasharray': [3, 2] },
  });

  map.addLayer({
    id: 'region-boundary-selected-fill',
    type: 'fill',
    source: REGION_SELECTED_SOURCE_ID,
    paint: { [FILL_COLOR_PAINT]: BOUNDARY_COLORS.selectedFill, 'fill-opacity': 1 },
  });

  map.addLayer({
    id: 'region-boundary-selected-line',
    type: 'line',
    source: REGION_SELECTED_SOURCE_ID,
    paint: { 'line-color': BOUNDARY_COLORS.selectedStroke, 'line-width': 2.5 },
  });
}

export function addOrUpdatePolygon(map: maplibregl.Map, coordinates: [number, number][][] | undefined): void {
  if (!coordinates?.length) {
    clearSource(map, USER_POLYGON_SOURCE_ID);
    return;
  }

  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'MultiPolygon', coordinates: coordinates.map(c => [c]) },
    }],
  };

  const existing = map.getSource(USER_POLYGON_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(fc);
    return;
  }

  map.addSource(USER_POLYGON_SOURCE_ID, { type: 'geojson', data: fc });

  map.addLayer({
    id: 'user-polygon-fill',
    type: 'fill',
    source: USER_POLYGON_SOURCE_ID,
    paint: { [FILL_COLOR_PAINT]: POLYGON_COLORS.fill },
  });
  map.addLayer({
    id: 'user-polygon-stroke',
    type: 'line',
    source: USER_POLYGON_SOURCE_ID,
    paint: { 'line-color': POLYGON_COLORS.stroke, 'line-width': 2.5 },
  });
}

export function addOrUpdateUserModels(
  map: maplibregl.Map,
  geojson: GeoJSON.FeatureCollection | undefined | null,
): void {
  if (!geojson?.features?.length) {
    clearSource(map, USER_MODELS_SOURCE_ID);
    return;
  }

  const src = map.getSource(USER_MODELS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (src) {
    src.setData(geojson);
    return;
  }

  map.addSource(USER_MODELS_SOURCE_ID, { type: 'geojson', data: geojson });

  map.addLayer({
    id: USER_MODELS_FILL_LAYER_ID,
    type: 'fill',
    source: USER_MODELS_SOURCE_ID,
    paint: { [FILL_COLOR_PAINT]: USER_MODEL_COLORS.fill, 'fill-opacity': 1 },
  });

  map.addLayer({
    id: 'user-models-stroke',
    type: 'line',
    source: USER_MODELS_SOURCE_ID,
    paint: { 'line-color': USER_MODEL_COLORS.stroke, 'line-width': 2 },
  });
}

export function setupUserModelInteractions(
  map: maplibregl.Map,
  onModelClick?: (modelId: number, status?: string) => void,
): () => void {
  const popup = new MapLibrePopup({ closeButton: false, closeOnClick: false, offset: 12 });
  let hoveredId: number | null = null;

  const onMouseMove = (e: maplibregl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [USER_MODELS_FILL_LAYER_ID] });
    if (features.length > 0) {
      const props = features[0].properties;
      const id = props?.model_id;
      map.getCanvas().style.cursor = 'pointer';

      if (id !== hoveredId) {
        hoveredId = id;
        map.setPaintProperty(USER_MODELS_FILL_LAYER_ID, FILL_COLOR_PAINT, [
          'case', ['==', ['get', 'model_id'], id], USER_MODEL_COLORS.hoverFill, USER_MODEL_COLORS.fill,
        ]);
      }

      popup.setLngLat(e.lngLat).setHTML(`<b>${props?.title || 'Untitled'}</b>`).addTo(map);
    } else {
      if (hoveredId !== null) {
        hoveredId = null;
        map.setPaintProperty(USER_MODELS_FILL_LAYER_ID, FILL_COLOR_PAINT, USER_MODEL_COLORS.fill);
      }
      map.getCanvas().style.cursor = '';
      popup.remove();
    }
  };

  const onMouseLeave = () => {
    hoveredId = null;
    map.getCanvas().style.cursor = '';
    map.setPaintProperty(USER_MODELS_FILL_LAYER_ID, FILL_COLOR_PAINT, USER_MODEL_COLORS.fill);
    popup.remove();
  };

  const onClick = (e: maplibregl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [USER_MODELS_FILL_LAYER_ID] });
    if (features.length > 0 && onModelClick) {
      const id = features[0].properties?.model_id;
      if (id) onModelClick(id, features[0].properties?.status);
    }
  };

  map.on('mousemove', USER_MODELS_FILL_LAYER_ID, onMouseMove);
  map.on('mouseleave', USER_MODELS_FILL_LAYER_ID, onMouseLeave);
  map.on('click', USER_MODELS_FILL_LAYER_ID, onClick);

  return () => {
    map.off('mousemove', USER_MODELS_FILL_LAYER_ID, onMouseMove);
    map.off('mouseleave', USER_MODELS_FILL_LAYER_ID, onMouseLeave);
    map.off('click', USER_MODELS_FILL_LAYER_ID, onClick);
    popup.remove();
  };
}

export function setupBoundaryInteractions(
  map: maplibregl.Map,
  onRegionClick?: (regionName: string) => void,
): () => void {
  const popup = new MapLibrePopup({ closeButton: false, closeOnClick: false, offset: 12 });
  let hoveredName: string | null = null;

  const onMouseMove = (e: maplibregl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [REGION_AVAILABLE_FILL_LAYER_ID] });
    if (features.length > 0) {
      const name = features[0].properties?.name;
      map.getCanvas().style.cursor = 'pointer';

      if (name !== hoveredName) {
        hoveredName = name;
        map.setPaintProperty(REGION_AVAILABLE_FILL_LAYER_ID, FILL_COLOR_PAINT, [
          'case', ['==', ['get', 'name'], name], BOUNDARY_COLORS.availableHoverFill, BOUNDARY_COLORS.availableFill,
        ]);
      }

      popup.setLngLat(e.lngLat).setHTML(`<b>${name}</b>`).addTo(map);
    } else {
      if (hoveredName) {
        hoveredName = null;
        map.setPaintProperty(REGION_AVAILABLE_FILL_LAYER_ID, FILL_COLOR_PAINT, BOUNDARY_COLORS.availableFill);
      }
      map.getCanvas().style.cursor = '';
      popup.remove();
    }
  };

  const onMouseLeave = () => {
    hoveredName = null;
    map.getCanvas().style.cursor = '';
    map.setPaintProperty(REGION_AVAILABLE_FILL_LAYER_ID, FILL_COLOR_PAINT, BOUNDARY_COLORS.availableFill);
    popup.remove();
  };

  const onClick = (e: maplibregl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [REGION_AVAILABLE_FILL_LAYER_ID] });
    if (features.length > 0 && onRegionClick) {
      const name = features[0].properties?.name;
      if (name) onRegionClick(name);
    }
  };

  map.on('mousemove', REGION_AVAILABLE_FILL_LAYER_ID, onMouseMove);
  map.on('mouseleave', REGION_AVAILABLE_FILL_LAYER_ID, onMouseLeave);
  map.on('click', REGION_AVAILABLE_FILL_LAYER_ID, onClick);

  return () => {
    map.off('mousemove', REGION_AVAILABLE_FILL_LAYER_ID, onMouseMove);
    map.off('mouseleave', REGION_AVAILABLE_FILL_LAYER_ID, onMouseLeave);
    map.off('click', REGION_AVAILABLE_FILL_LAYER_ID, onClick);
    popup.remove();
  };
}
