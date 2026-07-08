import { useEffect, useRef } from "react";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import type Map from "ol/Map";

import {
  ESRI_ATTRIBUTION,
  ESRI_PLACES_REFERENCE_URL,
  ESRI_TRANSPORTATION_REFERENCE_URL,
  MAP_REFERENCE_DARK_OPACITY,
  MAP_REFERENCE_LIGHT_LABELS_OPACITY,
  MAP_REFERENCE_LIGHT_ROADS_OPACITY,
} from "../viewer-config";

// Transparent ESRI road/label tiles above the risk raster so the map stays readable.
export const useReferenceLayers = (
  map: Map | null,
  isDarkBaseLayer: boolean,
  roadsVisible: boolean,
  labelsVisible: boolean,
  scheduleMapRenderRefresh: () => void
) => {
  const roadsLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const labelsLayerRef = useRef<TileLayer<XYZ> | null>(null);

  useEffect(() => {
    if (!map) return;
    const roadsOpacity = isDarkBaseLayer
      ? MAP_REFERENCE_DARK_OPACITY
      : MAP_REFERENCE_LIGHT_ROADS_OPACITY;
    const labelsOpacity = isDarkBaseLayer
      ? MAP_REFERENCE_DARK_OPACITY
      : MAP_REFERENCE_LIGHT_LABELS_OPACITY;

    const roadsLayer = new TileLayer({
      source: new XYZ({
        url: ESRI_TRANSPORTATION_REFERENCE_URL,
        attributions: ESRI_ATTRIBUTION,
        crossOrigin: "anonymous",
        maxZoom: 19,
      }),
      opacity: roadsOpacity,
      className: "ol-layer ol-visible-in-maplibre",
    });
    const labelsLayer = new TileLayer({
      source: new XYZ({
        url: ESRI_PLACES_REFERENCE_URL,
        attributions: ESRI_ATTRIBUTION,
        crossOrigin: "anonymous",
        maxZoom: 20,
      }),
      opacity: labelsOpacity,
      className: "ol-layer ol-visible-in-maplibre",
    });

    roadsLayer.setVisible(false);
    labelsLayer.setVisible(false);
    roadsLayer.setZIndex(500);
    labelsLayer.setZIndex(510);
    map.addLayer(roadsLayer);
    map.addLayer(labelsLayer);
    roadsLayerRef.current = roadsLayer;
    labelsLayerRef.current = labelsLayer;
    scheduleMapRenderRefresh();

    return () => {
      map.removeLayer(roadsLayer);
      map.removeLayer(labelsLayer);
      if (roadsLayerRef.current === roadsLayer) roadsLayerRef.current = null;
      if (labelsLayerRef.current === labelsLayer) labelsLayerRef.current = null;
    };
  }, [isDarkBaseLayer, map, scheduleMapRenderRefresh]);

  useEffect(() => {
    roadsLayerRef.current?.setVisible(roadsVisible);
    labelsLayerRef.current?.setVisible(labelsVisible);
    scheduleMapRenderRefresh();
  }, [labelsVisible, roadsVisible, scheduleMapRenderRefresh]);
};
