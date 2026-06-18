/**
 * Helpers for rendering search-result boundary overlays on the map.
 */
import OLMap from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import type { Geometry } from 'ol/geom';
import type { StyleFunction } from 'ol/style/Style';
import type { FeatureLike } from 'ol/Feature';
import { searchBoundaryStyleFunction, boundaryLabelStyle } from './mapStyleUtils';

interface FitToFeaturesOptions {
  padding?: number | [number, number, number, number];
  duration?: number;
  maxZoom?: number;
}

export const fitToFeatures = (
  map: OLMap,
  features: Feature<Geometry>[],
  options: FitToFeaturesOptions | number = 30,
) => {
  if (features.length === 0) return;

  const opts: FitToFeaturesOptions = typeof options === 'number' ? { padding: options } : options;

  const padding = opts.padding ?? 30;
  const paddingArray = Array.isArray(padding) ? padding : [padding, padding, padding, padding];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  features.forEach((feature) => {
    const geom = feature.getGeometry();
    if (geom) {
      const ext = geom.getExtent();
      minX = Math.min(minX, ext[0]);
      minY = Math.min(minY, ext[1]);
      maxX = Math.max(maxX, ext[2]);
      maxY = Math.max(maxY, ext[3]);
    }
  });

  if (minX !== Infinity) {
    map.updateSize();
    map.getView().fit([minX, minY, maxX, maxY], {
      padding: paddingArray,
      maxZoom: opts.maxZoom ?? 18,
      duration: opts.duration ?? 0,
    });
  }
};

export const loadSearchBoundaryLayer = (
  map: OLMap,
  geojsonGeometry: GeoJSON.GeoJSON,
  name?: string,
): VectorLayer<VectorSource> => {
  removeSearchBoundaryLayer(map);

  const geojsonFormat = new GeoJSON();

  const featureCollection: GeoJSON.Feature | GeoJSON.FeatureCollection = geojsonGeometry.type === 'Feature' || geojsonGeometry.type === 'FeatureCollection'
    ? geojsonGeometry
    : {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: geojsonGeometry,
          properties: {},
        }],
      };

  const features = geojsonFormat.readFeatures(featureCollection, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });

  if (name && features[0]) {
    features[0].set('name', name);
  }

  const source = new VectorSource({ features });

  const layer = new VectorLayer({
    source,
    style: (feature: FeatureLike, resolution: number): ReturnType<StyleFunction> => {
      const styles = searchBoundaryStyleFunction(feature as Feature<Geometry>, resolution);
      const featureName = feature.get('name');
      const geom = (feature as Feature<Geometry>).getGeometry();
      if (featureName && geom) {
        styles.push(boundaryLabelStyle(featureName, geom, resolution));
      }
      return styles;
    },
    zIndex: 55,
    properties: { name: 'search-boundary' },
  });

  map.addLayer(layer);
  return layer;
};

export const removeSearchBoundaryLayer = (map: OLMap): void => {
  const toRemove: VectorLayer<VectorSource>[] = [];
  map.getLayers().forEach((layer) => {
    if (layer.get('name') === 'search-boundary') {
      toRemove.push(layer as VectorLayer<VectorSource>);
    }
  });
  toRemove.forEach((layer) => map.removeLayer(layer));
};
