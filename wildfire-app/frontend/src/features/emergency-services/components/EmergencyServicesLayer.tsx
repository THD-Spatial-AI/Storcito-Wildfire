import { FC, useEffect, useRef } from "react";
import type Map from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

import { getCategoryMeta, type EmergencyService } from "../types";

export const EMERGENCY_SERVICES_LAYER_NAME = "emergency-services";

interface EmergencyServicesLayerProps {
	map: Map;
	services: EmergencyService[];
	visible: boolean;
	onSelect: (service: EmergencyService) => void;
}

const markerStyle = (service: EmergencyService) =>
	new Style({
		image: new CircleStyle({
			radius: 8,
			fill: new Fill({ color: getCategoryMeta(service.category).color }),
			stroke: new Stroke({ color: "#ffffff", width: 2 }),
		}),
	});

// Clickable colored markers for the nearest emergency services.
export const EmergencyServicesLayer: FC<EmergencyServicesLayerProps> = ({
	map,
	services,
	visible,
	onSelect,
}) => {
	const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
	const onSelectRef = useRef(onSelect);
	onSelectRef.current = onSelect;

	useEffect(() => {
		const features = services.map((service) => {
			const feature = new Feature({
				geometry: new Point(fromLonLat([service.longitude, service.latitude])),
			});
			feature.set("service", service);
			return feature;
		});

		const layer = new VectorLayer({
			source: new VectorSource({ features }),
			className: "ol-layer ol-visible-in-maplibre",
			zIndex: 60,
			properties: { name: EMERGENCY_SERVICES_LAYER_NAME },
			style: (feature) => markerStyle(feature.get("service") as EmergencyService),
		});
		layer.setVisible(false);
		map.addLayer(layer);
		layerRef.current = layer;

		const hitLayer = (candidate: unknown) => candidate === layer;

		const handlePointerMove = (evt: MapBrowserEvent) => {
			if (evt.dragging) return;
			const hit = map.hasFeatureAtPixel(evt.pixel, { layerFilter: hitLayer });
			const target = map.getTargetElement();
			if (target) (target as HTMLElement).style.cursor = hit ? "pointer" : "";
		};

		const handleClick = (evt: MapBrowserEvent) => {
			map.forEachFeatureAtPixel(
				evt.pixel,
				(feature) => {
					const service = feature.get("service") as EmergencyService | undefined;
					if (service) {
						onSelectRef.current(service);
						return true;
					}
					return false;
				},
				{ layerFilter: hitLayer }
			);
		};

		map.on("pointermove", handlePointerMove);
		map.on("click", handleClick);

		return () => {
			map.un("pointermove", handlePointerMove);
			map.un("click", handleClick);
			const target = map.getTargetElement();
			if (target) (target as HTMLElement).style.cursor = "";
			map.removeLayer(layer);
			if (layerRef.current === layer) layerRef.current = null;
		};
	}, [map, services]);

	useEffect(() => {
		layerRef.current?.setVisible(visible);
	}, [visible]);

	return null;
};
