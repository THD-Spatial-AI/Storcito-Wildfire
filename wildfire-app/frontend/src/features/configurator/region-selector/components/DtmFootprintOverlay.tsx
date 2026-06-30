import { useEffect } from "react";
import type Map from "ol/Map";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import ImageLayer from "ol/layer/Image";
import Static from "ol/source/ImageStatic";
import { Stroke, Style } from "ol/style";
import { fromLonLat } from "ol/proj";

interface DtmFootprintOverlayProps {
    map: Map | null;
    footprint?: [number, number][];
    imageUrl?: string;
    imageExtent?: [number, number, number, number];
}

const DTM_IMAGE_Z_INDEX = 2090;
const DTM_FOOTPRINT_Z_INDEX = 2100;

// Renders the uploaded DTM as a colored elevation raster on the map (plus a thin
// outline of its valid-data coverage) and fits the view to it, so the user sees
// the actual terrain and exactly where a valid area can be drawn.
export const DtmFootprintOverlay = ({ map, footprint, imageUrl, imageExtent }: DtmFootprintOverlayProps) => {
    useEffect(() => {
        if (!map) return;
        const layers: Array<VectorLayer<VectorSource> | ImageLayer<Static>> = [];

        // Colored elevation raster (georeferenced in the map projection).
        if (imageUrl && imageExtent) {
            const imageLayer = new ImageLayer({
                source: new Static({ url: imageUrl, imageExtent, projection: "EPSG:3857" }),
                opacity: 0.85,
                zIndex: DTM_IMAGE_Z_INDEX,
                className: "ol-layer dtm-image-layer ol-visible-in-maplibre",
            });
            map.addLayer(imageLayer);
            layers.push(imageLayer);
        }

        // Thin outline of the valid-data coverage.
        if (footprint && footprint.length >= 4) {
            const ring = footprint.map(([lon, lat]) => fromLonLat([lon, lat]));
            const feature = new Feature(new Polygon([ring]));
            const outline = new VectorLayer({
                source: new VectorSource({ features: [feature], wrapX: false }),
                className: "ol-layer dtm-footprint-layer ol-visible-in-maplibre",
                zIndex: DTM_FOOTPRINT_Z_INDEX,
                style: new Style({ stroke: new Stroke({ color: "rgba(15, 23, 42, 0.85)", width: 1.5 }) }),
            });
            map.addLayer(outline);
            layers.push(outline);
        }

        // Frame the DTM so the user sees where to draw.
        const fitExtent = imageExtent ?? layers[0]?.getExtent?.();
        if (fitExtent) {
            map.getView().fit(fitExtent, { padding: [80, 80, 80, 80], duration: 400, maxZoom: 16 });
        }

        return () => {
            layers.forEach((l) => map.removeLayer(l));
        };
    }, [map, footprint, imageUrl, imageExtent]);

    return null;
};
