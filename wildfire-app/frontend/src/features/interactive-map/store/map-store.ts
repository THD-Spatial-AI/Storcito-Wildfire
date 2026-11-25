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

// base layer metadata
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

// retired base layers
// retired vector maps
const RETIRED_MAPLIBRE_LAYER_IDS = new Set(["maplibre_3d", "maplibre_dark", "maplibre_voyager"]);
const RETIRED_OPENTOPOMAP_LAYER_ID = "opentopomap";
const RETIRED_HUMANITARIAN_LAYER_ID = "osm_humanitarian";
const RETIRED_RASTER_VOYAGER_LAYER_ID = "carto_voyager";
const DEFAULT_BASE_LAYER_ID = "carto_positron";

export function normalizeBaseLayerId(id: string): string {
	if (
		RETIRED_MAPLIBRE_LAYER_IDS.has(id) ||
		id === RETIRED_RASTER_VOYAGER_LAYER_ID ||
		id === RETIRED_OPENTOPOMAP_LAYER_ID ||
		id === RETIRED_HUMANITARIAN_LAYER_ID
	) {
		return DEFAULT_BASE_LAYER_ID;
	}
	return id;
}

const failedBaseLayersUntil = new globalThis.Map<string, number>();

export function markBaseLayerHealthy(id: string): void {
	failedBaseLayersUntil.delete(normalizeBaseLayerId(id));
}

/** mark provider unhealthy */
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

// tile servers drop
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
			// browser default policy
			referrerPolicy: "strict-origin-when-cross-origin",
		}), "osm_standard"),
		accessLevel: "very_low",
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
		// default for everyone
		accessLevel: "very_low",
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
			selectedBaseLayerId: DEFAULT_BASE_LAYER_ID,
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

/** update map position */
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
