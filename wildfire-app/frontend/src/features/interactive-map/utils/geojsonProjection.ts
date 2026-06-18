import { transform } from 'ol/proj';

type ReprojectableGeometry =
  | GeoJSON.Point
  | GeoJSON.MultiPoint
  | GeoJSON.LineString
  | GeoJSON.MultiLineString
  | GeoJSON.Polygon
  | GeoJSON.MultiPolygon;

function isFeatureCollection(input: GeoJSON.GeoJSON | null | undefined): input is GeoJSON.FeatureCollection {
  return input?.type === 'FeatureCollection' && Array.isArray(input.features);
}

function isReprojectableGeometry(geometry: GeoJSON.Geometry | null | undefined): geometry is ReprojectableGeometry {
  return !!geometry && geometry.type !== 'GeometryCollection';
}

function getFirstCoordFromCoords(coords: unknown): GeoJSON.Position | null {
  if (!Array.isArray(coords)) return null;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return coords as GeoJSON.Position;
  }
  return getFirstCoordFromCoords(coords[0]);
}

function getFirstCoord(geometry: GeoJSON.Geometry | null | undefined): GeoJSON.Position | null {
  if (!isReprojectableGeometry(geometry)) return null;
  return getFirstCoordFromCoords(geometry.coordinates);
}

function detectProjection(geojson: GeoJSON.GeoJSON | null | undefined): string {
  if (!isFeatureCollection(geojson)) return 'EPSG:4326';
  const c = getFirstCoord(geojson.features[0]?.geometry);
  if (!c) return 'EPSG:4326';
  if (c[0] > 180 || c[0] < -180) {
    return c[0] > 2_000_000 ? 'EPSG:3035' : 'EPSG:3857';
  }
  return 'EPSG:4326';
}

/**
 * Reproject a GeoJSON FeatureCollection to WGS84 (EPSG:4326).
 * Handles Point, MultiPoint, LineString, MultiLineString, Polygon, and MultiPolygon.
 */
export function reprojectGeoJSON(geojson: GeoJSON.GeoJSON | null | undefined): GeoJSON.FeatureCollection | null {
  if (!isFeatureCollection(geojson) || !geojson.features.length) return null;
  const srcProj = detectProjection(geojson);
  if (srcProj === 'EPSG:4326') return geojson;
  const rc = (c: GeoJSON.Position): GeoJSON.Position => transform([c[0], c[1]], srcProj, 'EPSG:4326') as GeoJSON.Position;
  const rr = (ring: GeoJSON.Position[]) => ring.map(rc);
  const reprojected: GeoJSON.Feature[] = [];
  for (const f of geojson.features) {
    const g = f.geometry;
    if (!isReprojectableGeometry(g)) continue;
    let newGeom: ReprojectableGeometry;
    switch (g.type) {
      case 'Point': newGeom = { type: 'Point', coordinates: rc(g.coordinates) }; break;
      case 'MultiPoint': newGeom = { type: 'MultiPoint', coordinates: g.coordinates.map(rc) }; break;
      case 'LineString': newGeom = { type: 'LineString', coordinates: rr(g.coordinates) }; break;
      case 'MultiLineString': newGeom = { type: 'MultiLineString', coordinates: g.coordinates.map(rr) }; break;
      case 'Polygon': newGeom = { type: 'Polygon', coordinates: g.coordinates.map(rr) }; break;
      case 'MultiPolygon': newGeom = { type: 'MultiPolygon', coordinates: g.coordinates.map((polygon) => polygon.map(rr)) }; break;
      default: continue;
    }
    reprojected.push({ ...f, geometry: newGeom });
  }
  return { type: 'FeatureCollection', features: reprojected };
}
