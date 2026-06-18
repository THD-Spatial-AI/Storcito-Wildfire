import { useCallback, useEffect, useRef } from "react";
import { Feature } from "ol";
import { Polygon as OLPolygon } from "ol/geom";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import buffer from "@turf/buffer";
import type { Feature as GeoJSONFeature, Polygon as GeoJSONPolygon, Position } from "geojson";

export const processPolygonBuffer = (
  lonLatCoords: number[][],
  distanceMeters: number,
  source: VectorSource,
) => {
  if (lonLatCoords.length < 3) return;

  const closed = [...lonLatCoords, lonLatCoords[0]];
  const feature: GeoJSONFeature<GeoJSONPolygon> = {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [closed] },
  };

  const distanceKm = distanceMeters / 1000;
  const buffered = buffer(feature, distanceKm);

  if (!buffered?.geometry) {
    if (import.meta.env.DEV) console.warn("Buffer computation returned null or no geometry");
    return;
  }

  // Inner ring (hole) = original polygon, keeping buffer fill as a donut/halo.
  const innerRing = closed.map(([lon, lat]) => fromLonLat([lon, lat]));

  if (buffered.geometry.type === "Polygon") {
    const outerRing = (buffered.geometry.coordinates[0] as [number, number][]).map(([lon, lat]) =>
      fromLonLat([lon, lat]),
    );
    const poly = new OLPolygon([outerRing, innerRing]);
    source.addFeature(new Feature({ geometry: poly }));
  } else if (buffered.geometry.type === "MultiPolygon") {
    for (const polyCoords of buffered.geometry.coordinates) {
      const rings = polyCoords[0];
      const outerRing = rings.map((pos: Position) => {
        const [lon, lat] = pos as [number, number];
        return fromLonLat([lon, lat]);
      });
      const poly = new OLPolygon([outerRing, innerRing]);
      source.addFeature(new Feature({ geometry: poly }));
    }
  }
};

export const usePolygonBuffer = (bufferDistanceMeters: number) => {
  const bufferSourceRef = useRef<VectorSource | null>(null);
  const bufferDistanceRef = useRef<number>(bufferDistanceMeters);

  useEffect(() => {
    bufferDistanceRef.current = bufferDistanceMeters;
  }, [bufferDistanceMeters]);

  const recomputeBuffers = useCallback((polygons: [number, number][][], distanceMeters = bufferDistanceRef.current) => {
    const source = bufferSourceRef.current;
    if (!source) return;

    source.clear();
    if (!distanceMeters || distanceMeters <= 0) return;

    try {
      for (const lonLatCoords of polygons) {
        processPolygonBuffer(lonLatCoords, distanceMeters, source);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn("Buffer computation failed", e);
    }
  }, []);

  return { bufferSourceRef, bufferDistanceRef, recomputeBuffers };
};
