import { create } from "zustand";
import { Map } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS";
import { fromLonLat } from "ol/proj";
import { createJSONStorage, persist } from "zustand/middleware";
import { MAP_ZOOM } from '@/features/interactive-map/utils/mapUtils';
import { useMapLocationStore } from './map-location';
import {
	BASE_LAYER_FAILURE_COOLDOWN_MS,
	chooseRasterFallbackLayerId,
} from './base-layer-recovery';
import { withCartoBasemapKey } from '@/utils/carto-basemap';

// Base layer metadata interface
interface BaseLayerInfo {
	id: string;
	name: string;
	description: string;
	source: OSM | XYZ | TileWMS;
	accessLevel: "very_low" | "intermediate" | "manager" | "expert";
}

interface MapStore {
	map: Map | null;
	zoom: number;
	position: number[];
	setMap: (map: Map) => void;
	setZoom: (zoom: number) => void;
	setPosition: (position: number[]) => void;
	layers: BaseLayerInfo[];
	baseLayer: TileLayer | null;
	setBaseLayer: (layer: TileLayer) => void;
	selectedBaseLayerId: string;
	setSelectedBaseLayerId: (id: string) => void;
	overlayLayers: TileLayer[];
	addOverlayLayer: (layer: TileLayer) => void;
	removeOverlayLayer: (layer: TileLayer) => void;
	clearOverlayLayers: () => void;
	fireRiskOverlay: TileLayer | null;
	setFireRiskOverlay: (layer: TileLayer | null) => void;
}

// Retired base layers. They are gone from the picker; these ids only survive so
// a browser that persisted one of them still lands on a layer that exists.
const LEGACY_MAPLIBRE_LAYER_ID = "maplibre_3d";
const MAPLIBRE_DARK_LAYER_ID = "maplibre_dark";
const RETIRED_OPENTOPOMAP_LAYER_ID = "opentopomap";
export const MAPLIBRE_VOYAGER_LAYER_ID = "maplibre_voyager";
const DEFAULT_BASE_LAYER_ID = "osm_standard";

export function normalizeBaseLayerId(id: string): string {
	if (id === LEGACY_MAPLIBRE_LAYER_ID || id === MAPLIBRE_DARK_LAYER_ID) {
		return MAPLIBRE_VOYAGER_LAYER_ID;
	}
	if (id === RETIRED_OPENTOPOMAP_LAYER_ID) {
		return DEFAULT_BASE_LAYER_ID;
	}
	return id;
}

export function isMapLibreLayerId(id: string): boolean {
	const normalized = normalizeBaseLayerId(id);
	return normalized === MAPLIBRE_VOYAGER_LAYER_ID;
}

const failedBaseLayersUntil = new globalThis.Map<string, number>();

export function markBaseLayerHealthy(id: string): void {
	failedBaseLayersUntil.delete(normalizeBaseLayerId(id));
}

/** Mark a provider unhealthy and switch the active map to another raster source. */
export function reportBaseLayerFailure(id: string): string | null {
	const failedId = normalizeBaseLayerId(id);
	const now = Date.now();
	failedBaseLayersUntil.set(failedId, now + BASE_LAYER_FAILURE_COOLDOWN_MS);

	const unavailable = new Set<string>();
	failedBaseLayersUntil.forEach((expiresAt, layerId) => {
		if (expiresAt <= now) failedBaseLayersUntil.delete(layerId);
		else unavailable.add(layerId);
	});

	const fallbackId = chooseRasterFallbackLayerId(failedId, unavailable);
	if (!fallbackId) return null;

	const store = useMapStore.getState();
	if (normalizeBaseLayerId(store.selectedBaseLayerId) !== failedId) return null;
	store.setSelectedBaseLayerId(fallbackId);
	return fallbackId;
}

// Tile servers drop the occasional request. Without this a failed tile stays
// blank until the whole page is reloaded, which is what testers reported.
function withTileRetry<T extends OSM | XYZ>(source: T, layerId: string, maxRetries = 2): T {
	const attempts = new WeakMap<object, number>();
	let exhaustedTileErrors = 0;

	source.on('tileloadend', (event) => {
		const tile = (event as unknown as { tile?: object }).tile;
		if (tile) attempts.delete(tile);
		exhaustedTileErrors = 0;
		markBaseLayerHealthy(layerId);
	});

	source.on('tileloaderror', (event) => {
		const tile = (event as unknown as { tile?: { getKey?: () => string; load?: () => void } }).tile;
		if (!tile?.load) return;
		const seen = attempts.get(tile) ?? 0;
		if (seen >= maxRetries) {
			exhaustedTileErrors += 1;
			if (exhaustedTileErrors >= 3) {
				exhaustedTileErrors = 0;
				reportBaseLayerFailure(layerId);
			}
			return;
		}
		attempts.set(tile, seen + 1);
		setTimeout(() => tile.load?.(), 400 * (seen + 1));
	});
	return source;
}

const OSM_ATTR = '© 2026, Deggendorf Institute of Technology | OpenStreetMap contributors';
const CARTO_ATTR = '© <a href="https://carto.com/attributions">CARTO</a>';

const baseLayers: BaseLayerInfo[] = [
	{
		id: "osm_standard",
		name: "OSM Standard",
		description: "Standard OpenStreetMap layer",
		source: withTileRetry(new OSM({
			attributions: [OSM_ATTR],
		}), "osm_standard"),
		accessLevel: "very_low",
	},
	{
		id: "osm_humanitarian",
		name: "OSM Humanitarian",
		description: "Humanitarian style OpenStreetMap",
		source: withTileRetry(new XYZ({
			url: "https://tile-{a-c}.openstreetmap.fr/hot/{z}/{x}/{y}.png",
			attributions: [
				OSM_ATTR,
				'© <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>',
			],
		}), "osm_humanitarian"),
		accessLevel: "intermediate",
	},
	{
		id: "carto_positron",
		name: "CartoDB Positron",
		description: "Light theme base map by CartoDB",
		source: withTileRetry(new XYZ({
			url: withCartoBasemapKey(
				"https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
			),
			attributions: [
				OSM_ATTR,
				CARTO_ATTR,
			],
		}), "carto_positron"),
		accessLevel: "intermediate",
	},
	{
		id: "carto_voyager",
		name: "CartoDB Voyager (Raster)",
		description: "Detailed base map by CartoDB",
		source: withTileRetry(new XYZ({
			url: withCartoBasemapKey(
				"https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
			),
			attributions: [
				OSM_ATTR,
				CARTO_ATTR,
			],
		}), "carto_voyager"),
		accessLevel: "expert",
	},
	{
		id: MAPLIBRE_VOYAGER_LAYER_ID,
		name: "MapLibre Voyager",
		description: "Detailed vector basemap",
		source: new XYZ({ url: '' }), // Vector source loaded via MapLibre GL
		accessLevel: "intermediate",
	},
];

export const useMapStore = create<MapStore>()(
	persist(
		(set, get) => ({
			map: null,
			zoom: MAP_ZOOM.DEFAULT,
			position: [-8.5, 42.8],
			setPosition: (position) => set({ position }),
			setMap: (map) => set({ map }),
			setZoom: (zoom) => set({ zoom }),
			layers: baseLayers,
			baseLayer: null,
			setBaseLayer: (layer) => set({ baseLayer: layer }),
			selectedBaseLayerId: "osm_standard",
			setSelectedBaseLayerId: (id) => set({ selectedBaseLayerId: normalizeBaseLayerId(id) }),
			overlayLayers: [],
			addOverlayLayer: (layer) => {
				const { map, overlayLayers } = get();

				if (map && !overlayLayers.includes(layer)) {
					map.addLayer(layer);
					const newOverlayLayers = [...overlayLayers, layer];
					set({ overlayLayers: newOverlayLayers });

					layer.setZIndex(1000);
				}
			},
			removeOverlayLayer: (layer) => {
				const { map, overlayLayers } = get();
				if (map && overlayLayers.includes(layer)) {
					map.removeLayer(layer);
					set({ overlayLayers: overlayLayers.filter(l => l !== layer) });
				}
			},
			clearOverlayLayers: () => {
				const { map, overlayLayers } = get();
				if (map) {
					for (const layer of overlayLayers) {
						map.removeLayer(layer);
					}
					set({ overlayLayers: [] });
				}
			},
			fireRiskOverlay: null,
			setFireRiskOverlay: (layer) => set({ fireRiskOverlay: layer }),
		}),
		{
			name: "map-store",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				zoom: state.zoom,
				selectedBaseLayerId: state.selectedBaseLayerId,
			}),
			onRehydrateStorage: () => (state) => {
				if (!state) return;
				const normalized = normalizeBaseLayerId(state.selectedBaseLayerId);
				if (normalized !== state.selectedBaseLayerId) {
					state.setSelectedBaseLayerId(normalized);
				}
			},
		}
	)
);

/**
 * Update map position from saved user preference
 * Call this when map is initialized and user's saved location is loaded
 */
export const updateMapToSavedLocation = (customLocation?: { latitude: number; longitude: number; zoom?: number }) => {
	const mapLocation = customLocation || useMapLocationStore.getState().location;
	const mapStore = useMapStore.getState();

	const lonLat: [number, number] = [mapLocation.longitude, mapLocation.latitude];
	mapStore.setPosition(lonLat);

	if (mapLocation.zoom) {
		mapStore.setZoom(mapLocation.zoom);
	}

	if (mapStore.map) {
		const view = mapStore.map.getView();
		view.setCenter(fromLonLat(lonLat));
		if (mapLocation.zoom) {
			view.setZoom(mapLocation.zoom);
		}
	}
};
