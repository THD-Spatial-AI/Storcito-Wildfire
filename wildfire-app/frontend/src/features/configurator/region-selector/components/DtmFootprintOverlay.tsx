import { useEffect } from "react";
import type Map from "ol/Map";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Text } from "ol/style";
import { fromLonLat } from "ol/proj";

interface DtmFootprintOverlayProps {
    map: Map | null;
    footprint?: [number, number][];
}

const DTM_FOOTPRINT_Z_INDEX = 2100;

// Draws the uploaded DTM's coverage on the map and fits the view to it, so the
// user can see exactly where a valid area can be drawn.
export const DtmFootprintOverlay = ({ map, footprint }: DtmFootprintOverlayProps) => {
    useEffect(() => {
        if (!map || !footprint || footprint.length < 4) return;

        const ring = footprint.map(([lon, lat]) => fromLonLat([lon, lat]));
        const feature = new Feature(new Polygon([ring]));

        const layer = new VectorLayer({
            source: new VectorSource({ features: [feature], wrapX: false }),
            className: "ol-layer dtm-footprint-layer ol-visible-in-maplibre",
            zIndex: DTM_FOOTPRINT_Z_INDEX,
            style: new Style({
                fill: new Fill({ color: "rgba(15, 23, 42, 0.06)" }),
                stroke: new Stroke({ color: "rgba(15, 23, 42, 0.9)", width: 2, lineDash: [8, 5] }),
                text: new Text({
                    text: "Uploaded DTM coverage",
                    font: "600 12px Inter, system-ui, sans-serif",
                    fill: new Fill({ color: "#0f172a" }),
                    stroke: new Stroke({ color: "rgba(255,255,255,0.92)", width: 4 }),
                    overflow: true,
                }),
            }),
        });
        map.addLayer(layer);

        // Frame the footprint so the user sees where to draw.
        const extent = feature.getGeometry()?.getExtent();
        if (extent) {
            map.getView().fit(extent, { padding: [80, 80, 80, 80], duration: 400, maxZoom: 15 });
        }

        return () => {
            map.removeLayer(layer);
        };
    }, [map, footprint]);

    return null;
};
