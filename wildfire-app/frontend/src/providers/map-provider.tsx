import { useRef, useEffect, useCallback, useMemo } from "react";
import {
	isMapLibreDarkLayerId,
	normalizeBaseLayerId,
	useMapStore,
} from "@/features/interactive-map/store/map-store";
import { useMapLocationStore } from "@/features/interactive-map/store/map-location";
import { defaults as defaultControls } from "ol/control";
import { Map as OlMap, View } from "ol";
import type BaseLayer from "ol/layer/Base";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import { MAP_ZOOM } from "@/features/interactive-map/utils/mapUtils";
import { MapControls } from "@/components/map-controls/MapControls";

import { MapContext } from "@/providers/map-context";


if (typeof HTMLCanvasElement !== 'undefined') {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error - overriding native method
    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
        if (type === '2d') {
            attributes = { ...attributes, willReadFrequently: true };
        }
        return originalGetContext.call(this, type, attributes);
    };
}

interface MapProviderProps {
	children: React.ReactNode;
}

interface MapControlsWrapperProps {
	onZoomIn: () => void;
	onZoomOut: () => void;
	onCenterMap: () => void;
}

const MapControlsWrapper: React.FC<MapControlsWrapperProps> = ({ onZoomIn, onZoomOut, onCenterMap }) => (
	<MapControls
		onZoomIn={onZoomIn}
		onZoomOut={onZoomOut}
		onCenterMap={onCenterMap}
	/>
);

// Separate component factory to avoid creating components inside parent
const createMapControlsComponent = (
	zoomIn: () => void,
	zoomOut: () => void,
	centerMap: () => void
) => {
	const MapControlsComponent = () => (
		<MapControlsWrapper
			onZoomIn={zoomIn}
			onZoomOut={zoomOut}
			onCenterMap={centerMap}
		/>
	);
	return MapControlsComponent;
};

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
	const mapRef = useRef<HTMLDivElement | null>(null);
	const { map, zoom, position, layers, baseLayer, selectedBaseLayerId, setMap, setBaseLayer, setZoom, setPosition, setSelectedBaseLayerId } = useMapStore();
	const { location: mapLocation } = useMapLocationStore();

	const initMapInstance = useCallback(async () => {
		if (!mapRef.current) return;

		if (map) {
			if (map.getTarget() !== mapRef.current) {
				map.setTarget(mapRef.current);
				requestAnimationFrame(() => {
					map.updateSize();
				});
			}
			return;
		}

		const normalizedSelectedBaseLayerId = normalizeBaseLayerId(selectedBaseLayerId);
		const baseLayerInfo = layers.find((l) => l.id === normalizedSelectedBaseLayerId) ?? layers[0];
		const isMapLibre = isMapLibreDarkLayerId(baseLayerInfo.id);
		if (baseLayerInfo.id !== selectedBaseLayerId) {
			setSelectedBaseLayerId(baseLayerInfo.id);
		}
		const initialBaseLayer = new TileLayer({
			source: baseLayerInfo.source,
			visible: !isMapLibre,
		});

		const olMap = new OlMap({
			target: mapRef.current,
			layers: [initialBaseLayer],
			view: new View({
				center: fromLonLat(position),
				zoom: zoom,
				maxZoom: MAP_ZOOM.MAX,
				minZoom: MAP_ZOOM.MIN,
			}),
			controls: defaultControls({
				zoom: false,
				attribution: true,
				rotate: false,
			}),
		});

		setMap(olMap);
		setBaseLayer(initialBaseLayer);

		requestAnimationFrame(() => {
			olMap.updateSize();
		});
	}, [map, layers, selectedBaseLayerId, position, zoom, setMap, setBaseLayer, setSelectedBaseLayerId]);

	const changeToSelectedMapLayer = useCallback(() => {
		const normalizedSelectedBaseLayerId = normalizeBaseLayerId(selectedBaseLayerId);
		const selected = layers.find((l) => l.id === normalizedSelectedBaseLayerId) ?? layers[0];

		if (baseLayer && selected) {
			if (selected.id !== selectedBaseLayerId) {
				setSelectedBaseLayerId(selected.id);
			}
			if (isMapLibreDarkLayerId(selected.id)) {
				baseLayer.setVisible(false);
			} else {
				baseLayer.setVisible(true);
				baseLayer.setSource(selected.source);
			}
			if (map) {
				requestAnimationFrame(() => {
					map.getLayers().forEach((layer: BaseLayer) => {
						layer.changed();
					});
					map.updateSize();
					map.renderSync();
				});
			}
		}
		const copyright = document.querySelector(".ol-attribution.ol-unselectable.ol-control");
		if (copyright) copyright.setAttribute("style", "display: none !important");
	}, [layers, selectedBaseLayerId, baseLayer, map, setSelectedBaseLayerId]);

	useEffect(() => {
		if (!map) return;

		const view = map.getView();

		const onMoveEnd = () => {
			const center = toLonLat(view.getCenter()!);
			const z = view.getZoom()!;
			setPosition([center[0], center[1]]);
			setZoom(z);
		};

		map.on("moveend", onMoveEnd);
		return () => {
			map.un("moveend", onMoveEnd);
		};
	}, [map, setPosition, setZoom]);

	useEffect(() => {
		if (!map) return;

		const view = map.getView();
		const newCenter = fromLonLat([mapLocation.longitude, mapLocation.latitude]);
		const currentCenter = view.getCenter();

		if (currentCenter) {
			const [currentLon, currentLat] = toLonLat(currentCenter);
			const hasChanged =
				Math.abs(currentLon - mapLocation.longitude) > 0.001 ||
				Math.abs(currentLat - mapLocation.latitude) > 0.001;

			if (hasChanged) {
				view.animate({
					center: newCenter,
					zoom: mapLocation.zoom,
					duration: 500,
				});
			}
		}

	}, [map, mapLocation]);

	useEffect(() => {
		changeToSelectedMapLayer();
	}, [changeToSelectedMapLayer]);

	const zoomIn = useCallback(() => {
		if (!map) return;
		const view = map.getView();
		const zoom = view.getZoom();
		if (zoom !== undefined) {
			view.animate({
				zoom: zoom + 1,
				duration: 250,
			});
		}
	}, [map]);

	const zoomOut = useCallback(() => {
		if (!map) return;
		const view = map.getView();
		const zoom = view.getZoom();
		if (zoom !== undefined) {
			view.animate({
				zoom: zoom - 1,
				duration: 250,
			});
		}
	}, [map]);

	const centerMap = useCallback(() => {
		if (!map) return;
		const savedCenter = fromLonLat([mapLocation.longitude, mapLocation.latitude]);
		map.getView().animate({
			center: savedCenter,
			zoom: mapLocation.zoom || zoom,
			duration: 1000,
		});
	}, [map, mapLocation, zoom]);

	const clearDrawingLayers = useCallback(() => {
		if (!map) return;
		// Snapshot arrays before iterating - getLayers().getArray() returns the
		// live internal array, so removing during iteration skips elements.
		const layers = [...map.getLayers().getArray()];
		for (const layer of layers) {
			if (layer instanceof VectorLayer) {
				const source = layer.getSource();
				if (source instanceof VectorSource) {
					map.removeLayer(layer);
				}
			}
		}

		const interactions = [...map.getInteractions().getArray()];
		for (const interaction of interactions) {
			if (interaction instanceof Draw) {
				map.removeInteraction(interaction);
			}
		}
	}, [map]);

	const MapControlsComponent = useMemo(
		() => createMapControlsComponent(zoomIn, zoomOut, centerMap),
		[zoomIn, zoomOut, centerMap]
	);

	const contextValue = useMemo(() => ({
		mapRef,
		zoomIn,
		zoomOut,
		centerMap,
		initMapInstance,
		clearDrawingLayers,
		MapControls: MapControlsComponent,
	}), [mapRef, zoomIn, zoomOut, centerMap, initMapInstance, clearDrawingLayers, MapControlsComponent]);

	return (
		<MapContext value={contextValue}>
			{children}
		</MapContext>
	);
};

// Hook moved to map-context.ts to satisfy react-refresh export hygiene
