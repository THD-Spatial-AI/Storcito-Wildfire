import { geocodingService } from '@/features/interactive-map/services/geocoding';
import type { AreaInputMode, CalculationMode } from '@/features/configurator/types/area-select';

const stripClosingPoint = (ring: [number, number][]): [number, number][] => {
    if (ring.length < 2) return ring;
    const first = ring[0];
    const last = ring.at(-1);
    if (last && first[0] === last[0] && first[1] === last[1]) {
        return ring.slice(0, -1);
    }
    return ring;
};

export const normalizeRing = (ring: unknown): [number, number][] => {
    if (!Array.isArray(ring)) return [];
    const coords = ring
        .filter((position): position is [number, number] =>
            Array.isArray(position) &&
            position.length >= 2 &&
            typeof position[0] === 'number' &&
            typeof position[1] === 'number',
        )
        .map(([lon, lat]) => [lon, lat] as [number, number]);
    const openRing = stripClosingPoint(coords);
    return openRing.length >= 3 ? openRing : [];
};

export const extractPolygonsFromGeoJSON = (geojson: unknown): [number, number][][] => {
    if (!geojson || typeof geojson !== 'object') return [];
    const obj = geojson as Record<string, unknown>;

    if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
        return obj.features.flatMap(extractPolygonsFromGeoJSON);
    }

    if (obj.type === 'Feature') {
        return extractPolygonsFromGeoJSON(obj.geometry);
    }

    if (obj.type === 'GeometryCollection' && Array.isArray(obj.geometries)) {
        return obj.geometries.flatMap(extractPolygonsFromGeoJSON);
    }

    if (obj.type === 'Polygon' && Array.isArray(obj.coordinates)) {
        const polygon = normalizeRing(obj.coordinates[0]);
        return polygon.length ? [polygon] : [];
    }

    if (obj.type === 'MultiPolygon' && Array.isArray(obj.coordinates)) {
        return obj.coordinates
            .map((polygon) => (Array.isArray(polygon) ? normalizeRing(polygon[0]) : []))
            .filter((polygon) => polygon.length >= 3);
    }

    return [];
};

export const asRecord = (value: unknown): Record<string, unknown> | undefined =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

export const getAreaInputModeFromConfig = (config: Record<string, unknown>): AreaInputMode | undefined => {
    const areaInput = asRecord(config.area_input);
    return areaInput?.method === 'upload' ? 'upload' : undefined;
};

export const getUploadedGeoJsonNameFromConfig = (config: Record<string, unknown>): string | undefined => {
    const areaInput = asRecord(config.area_input);
    return typeof areaInput?.uploaded_geojson_name === 'string' ? areaInput.uploaded_geojson_name : undefined;
};

export const getCalculationModeFromConfig = (config: Record<string, unknown>): CalculationMode | undefined => {
    const parameters = asRecord(config.parameters);
    const mode = parameters?.calculation_mode;
    return mode === 'static' || mode === 'dynamic' ? mode : undefined;
};

export const getDateInputValue = (value: unknown): string | undefined => {
    if (typeof value !== 'string' && !(value instanceof Date)) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0];
};

export const extractPolygonsFromModelCoordinates = (coordinates: unknown): [number, number][][] => {
    const coordinatesRecord = asRecord(coordinates);
    if (coordinatesRecord?.type !== 'MultiPolygon' || !Array.isArray(coordinatesRecord.coordinates)) return [];
    return coordinatesRecord.coordinates
        .map((poly: unknown) => (Array.isArray(poly) ? normalizeRing(poly[0]) : []))
        .filter((poly) => poly.length > 0);
};

export const lookupRegionForPolygons = async (
    polygons: [number, number][][],
): Promise<{ region: string; country: string }> => {
    let totalLat = 0;
    let totalLon = 0;
    let count = 0;

    for (const poly of polygons) {
        for (const [lon, lat] of poly) {
            totalLon += lon;
            totalLat += lat;
            count += 1;
        }
    }

    if (count === 0) return { region: '', country: '' };

    try {
        const info = await geocodingService.reverseRegion(totalLat / count, totalLon / count);
        return {
            region: info?.region ?? '',
            country: info?.country ?? '',
        };
    } catch {
        return { region: '', country: '' };
    }
};
