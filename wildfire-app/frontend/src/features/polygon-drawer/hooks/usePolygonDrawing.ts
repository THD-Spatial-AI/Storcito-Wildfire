import { useEffect, useRef, useState, type RefObject } from "react";
import Draw, { type DrawEvent } from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { toLonLat, fromLonLat } from "ol/proj";
import type { Coordinate } from "ol/coordinate";
import type Polygon from "ol/geom/Polygon";
import type Map from "ol/Map";
import { Feature } from "ol";
import { Polygon as OLPolygon, Point } from "ol/geom";
import { platformModifierKeyOnly } from "ol/events/condition";
import type { StyleLike } from "ol/style/Style";

interface PolygonDrawingLabels {
  clickToClose?: string;
  start?: string;
}

interface PolygonDrawingStyles {
  polygonStyle: StyleLike;
  bufferStyle: StyleLike;
  startPointStyle: StyleLike;
  sketchStyle: StyleLike;
  modifyStyle: StyleLike;
}

interface UsePolygonDrawingOptions {
  map: Map | null;
  onPolygonDrawn?: (coordinates: [number, number][], allPolygons: [number, number][][]) => void;
  onPolygonModified?: (allPolygons: [number, number][][]) => void;
  onDrawingChange?: (isDrawing: boolean) => void;
  onPointCountChange?: (count: number) => void;
  onClearAll?: () => void;
  allowMultiple: boolean;
  clearTrigger: number;
  initialPolygons?: [number, number][][];
  disableAfterDraw: boolean;
  drawingEnabled: boolean;
  readOnly: boolean;
  enableEditing: boolean;
  labels: PolygonDrawingLabels;
  styles: PolygonDrawingStyles;
  bufferSourceRef: RefObject<VectorSource | null>;
  bufferDistanceRef: RefObject<number>;
  bufferDistanceMeters: number;
  recomputeBuffers: (polygons: [number, number][][], distanceMeters?: number) => void;
}

const getNearStartState = (
  map: Map,
  startCoord: Coordinate | null,
  coords: Coordinate[],
  snapDistance: number,
): boolean | null => {
  if (!startCoord || coords.length <= 3) return null;

  const cursorCoord = coords[coords.length - 1];
  const startPixel = map.getPixelFromCoordinate(startCoord);
  const cursorPixel = map.getPixelFromCoordinate(cursorCoord);
  if (!startPixel || !cursorPixel) return null;

  return Math.hypot(startPixel[0] - cursorPixel[0], startPixel[1] - cursorPixel[1]) < snapDistance;
};

const toLonLatPolygon = (coords: Coordinate[]) => {
  let lonLatCoords = coords.map((coord: Coordinate) => {
    const [lon, lat] = toLonLat(coord);
    return [lon, lat] as [number, number];
  });

  if (
    lonLatCoords.length > 2 &&
    lonLatCoords[0][0] === lonLatCoords.at(-1)?.[0] &&
    lonLatCoords[0][1] === lonLatCoords.at(-1)?.[1]
  ) {
    lonLatCoords = lonLatCoords.slice(0, -1);
  }

  return lonLatCoords;
};

export const usePolygonDrawing = ({
  map,
  onPolygonDrawn,
  onPolygonModified,
  onDrawingChange,
  onPointCountChange,
  onClearAll,
  allowMultiple,
  clearTrigger,
  initialPolygons,
  disableAfterDraw,
  drawingEnabled,
  readOnly,
  enableEditing,
  styles,
  bufferSourceRef,
  bufferDistanceRef,
  bufferDistanceMeters,
  recomputeBuffers,
}: UsePolygonDrawingOptions) => {
  const onPolygonDrawnRef = useRef(onPolygonDrawn);
  const onPolygonModifiedRef = useRef(onPolygonModified);
  const onDrawingChangeRef = useRef(onDrawingChange);
  const onPointCountChangeRef = useRef(onPointCountChange);
  const onClearAllRef = useRef(onClearAll);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const startPointSourceRef = useRef<VectorSource | null>(null);
  const allPolygonsRef = useRef<[number, number][][]>([]);
  const drawingEnabledRef = useRef<boolean>(drawingEnabled);
  const drawInteractionRef = useRef<Draw | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const modifyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sourceReady, setSourceReady] = useState(false);

  useEffect(() => {
    drawingEnabledRef.current = drawingEnabled;
  }, [drawingEnabled]);

  useEffect(() => {
    onPolygonDrawnRef.current = onPolygonDrawn;
    onPolygonModifiedRef.current = onPolygonModified;
    onDrawingChangeRef.current = onDrawingChange;
    onPointCountChangeRef.current = onPointCountChange;
    onClearAllRef.current = onClearAll;
  }, [onPolygonDrawn, onPolygonModified, onDrawingChange, onPointCountChange, onClearAll]);

  useEffect(() => {
    if (clearTrigger > 0 && vectorSourceRef.current) {
      vectorSourceRef.current.clear();
      bufferSourceRef.current?.clear();
      startPointSourceRef.current?.clear();
      allPolygonsRef.current = [];

      if (map && drawInteractionRef.current && drawingEnabledRef.current && disableAfterDraw && !allowMultiple) {
        const interactions = map.getInteractions().getArray();
        if (!interactions.includes(drawInteractionRef.current)) {
          map.addInteraction(drawInteractionRef.current);
        }
      }
    }
  }, [allowMultiple, bufferSourceRef, clearTrigger, disableAfterDraw, map]);

  useEffect(() => {
    if (!initialPolygons?.length || !vectorSourceRef.current || !sourceReady || !map) return;

    vectorSourceRef.current.clear();
    allPolygonsRef.current = [];

    for (const polygonCoords of initialPolygons) {
      const mapCoords = polygonCoords.map(([lon, lat]) => fromLonLat([lon, lat]));
      mapCoords.push(mapCoords[0]);

      const polygon = new OLPolygon([mapCoords]);
      const feature = new Feature({ geometry: polygon });

      vectorSourceRef.current?.addFeature(feature);
      allPolygonsRef.current.push(polygonCoords);
    }

    if (bufferDistanceRef.current > 0) {
      recomputeBuffers(allPolygonsRef.current, bufferDistanceRef.current);
    }

    const fitToExtent = () => {
      if (!vectorSourceRef.current) return;
      const extent = vectorSourceRef.current.getExtent();
      if (extent && extent[0] !== Infinity) {
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 1500,
          maxZoom: 18,
        });
      }
    };

    fitToExtent();
    const timer = setTimeout(fitToExtent, 300);

    if (disableAfterDraw && !allowMultiple && drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
    }

    return () => clearTimeout(timer);
  }, [allowMultiple, bufferDistanceRef, disableAfterDraw, initialPolygons, map, recomputeBuffers, sourceReady]);

  useEffect(() => {
    if (!map) return;

    const vectorSource = new VectorSource({ wrapX: false });
    vectorSourceRef.current = vectorSource;
    setSourceReady(true);

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: styles.polygonStyle,
      zIndex: 2001,
    });
    map.addLayer(vectorLayer);

    const bufferSource = new VectorSource({ wrapX: false });
    bufferSourceRef.current = bufferSource;
    const bufferLayer = new VectorLayer({
      source: bufferSource,
      style: styles.bufferStyle,
      zIndex: 2000,
    });
    map.addLayer(bufferLayer);

    const startPointSource = new VectorSource({ wrapX: false });
    startPointSourceRef.current = startPointSource;
    const startPointLayer = new VectorLayer({
      source: startPointSource,
      style: styles.startPointStyle,
      zIndex: 2002,
    });
    map.addLayer(startPointLayer);

    const SNAP_DISTANCE = 20;
    const DRAW_SKETCH_Z_INDEX = 2003;
    const MODIFY_SKETCH_Z_INDEX = 2004;
    let startCoord: Coordinate | null = null;
    let isNearStartPoint = false;
    let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let handleContextMenu: ((e: MouseEvent) => void) | null = null;

    if (!readOnly) {
      const draw = new Draw({
        source: vectorSource,
        type: "Polygon",
        style: styles.sketchStyle,
      });
      drawInteractionRef.current = draw;

      map.addInteraction(draw);
      draw.setActive(drawingEnabledRef.current);
      draw.getOverlay().setZIndex(DRAW_SKETCH_Z_INDEX);

      let isFirstPoint = true;

      draw.on("drawstart", (event: DrawEvent) => {
        if (!drawingEnabledRef.current) {
          draw.abortDrawing();
          return;
        }

        if (!allowMultiple) {
          vectorSource.clear();
          bufferSourceRef.current?.clear();
          startPointSourceRef.current?.clear();
          allPolygonsRef.current = [];
        }

        isFirstPoint = true;
        startCoord = null;
        isNearStartPoint = false;

        const geom = event.feature.getGeometry() as Polygon;
        geom.on("change", () => {
          const coords = geom.getCoordinates()[0];
          const pointCount = Math.max(0, coords.length - 1);
          onPointCountChangeRef.current?.(pointCount);

          if (coords.length > 0 && isFirstPoint) {
            isFirstPoint = false;
            startCoord = coords[0];
            const startPoint = new Feature({ geometry: new Point(coords[0]) });
            startPoint.set("isNearStart", false);
            startPointSourceRef.current?.clear();
            startPointSourceRef.current?.addFeature(startPoint);
          }

          const nearStart = getNearStartState(map, startCoord, coords, SNAP_DISTANCE);
          if (nearStart === null || nearStart === isNearStartPoint) return;

          isNearStartPoint = nearStart;
          const features = startPointSourceRef.current?.getFeatures();
          features?.[0]?.set("isNearStart", isNearStartPoint);
          map.getViewport().style.cursor = isNearStartPoint ? "pointer" : "crosshair";
        });

        map.getViewport().style.cursor = "crosshair";
        onDrawingChangeRef.current?.(true);
      });

      draw.on("drawend", (event: DrawEvent) => {
        startPointSourceRef.current?.clear();
        startCoord = null;
        isNearStartPoint = false;
        map.getViewport().style.cursor = "";
        onPointCountChangeRef.current?.(0);

        const polygon = event.feature.getGeometry() as Polygon;
        const lonLatCoords = toLonLatPolygon(polygon.getCoordinates()[0]);
        allPolygonsRef.current.push(lonLatCoords);
        onPolygonDrawnRef.current?.(lonLatCoords, [...allPolygonsRef.current]);

        if (bufferDistanceRef.current > 0) {
          recomputeBuffers(allPolygonsRef.current, bufferDistanceRef.current);
        }

        onDrawingChangeRef.current?.(false);

        if (disableAfterDraw && !allowMultiple) {
          map.removeInteraction(draw);
        }
      });

      if (enableEditing) {
        const modify = new Modify({
          source: vectorSource,
          deleteCondition: (event) => platformModifierKeyOnly(event) && event.type === "singleclick",
          style: styles.modifyStyle,
        });
        modifyInteractionRef.current = modify;
        map.addInteraction(modify);
        modify.setActive(drawingEnabledRef.current);
        modify.getOverlay().setZIndex(MODIFY_SKETCH_Z_INDEX);

        modify.on("modifyend", () => {
          const updatedPolygons: [number, number][][] = [];

          for (const feature of vectorSource.getFeatures()) {
            const geom = feature.getGeometry() as Polygon;
            if (geom) {
              updatedPolygons.push(toLonLatPolygon(geom.getCoordinates()[0]));
            }
          }

          allPolygonsRef.current = updatedPolygons;

          if (bufferDistanceRef.current > 0) {
            recomputeBuffers(allPolygonsRef.current, bufferDistanceRef.current);
          }

          if (modifyDebounceRef.current) {
            clearTimeout(modifyDebounceRef.current);
          }

          modifyDebounceRef.current = setTimeout(() => {
            onPolygonModifiedRef.current?.([...updatedPolygons]);
          }, 300);
        });
      }

      let currentPointCount = 0;
      handleContextMenu = (e: MouseEvent) => {
        if (currentPointCount >= 3 && drawInteractionRef.current) {
          e.preventDefault();
          e.stopPropagation();
          drawInteractionRef.current.finishDrawing();
        }
      };

      draw.on("drawstart", (evt: DrawEvent) => {
        currentPointCount = 0;
        const geom = evt.feature.getGeometry() as Polygon;
        geom.on("change", () => {
          const coords = geom.getCoordinates()[0];
          currentPointCount = Math.max(0, coords.length - 1);
        });
      });
      draw.on("drawend", () => {
        currentPointCount = 0;
      });

      map.getViewport().addEventListener("contextmenu", handleContextMenu);

      handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;

        drawInteractionRef.current?.abortDrawing();
        startPointSourceRef.current?.clear();
        startCoord = null;
        isNearStartPoint = false;
        map.getViewport().style.cursor = "";
        onPointCountChangeRef.current?.(0);
        onDrawingChangeRef.current?.(false);
        vectorSourceRef.current?.clear();
        bufferSourceRef.current?.clear();
        allPolygonsRef.current = [];

        if (drawingEnabledRef.current && disableAfterDraw && !allowMultiple && drawInteractionRef.current) {
          const interactions = map.getInteractions().getArray();
          if (!interactions.includes(drawInteractionRef.current)) {
            map.addInteraction(drawInteractionRef.current);
          }
        }

        onClearAllRef.current?.();
      };

      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (handleKeyDown) document.removeEventListener("keydown", handleKeyDown);
      if (handleContextMenu) map.getViewport().removeEventListener("contextmenu", handleContextMenu);
      if (drawInteractionRef.current) map.removeInteraction(drawInteractionRef.current);
      if (modifyInteractionRef.current) map.removeInteraction(modifyInteractionRef.current);
      if (modifyDebounceRef.current) clearTimeout(modifyDebounceRef.current);
      map.removeLayer(vectorLayer);
      map.removeLayer(bufferLayer);
      map.removeLayer(startPointLayer);
      vectorSourceRef.current = null;
      bufferSourceRef.current = null;
      startPointSourceRef.current = null;
      drawInteractionRef.current = null;
      modifyInteractionRef.current = null;
      modifyDebounceRef.current = null;
      allPolygonsRef.current = [];
      setSourceReady(false);
    };
  }, [
    allowMultiple,
    bufferDistanceRef,
    bufferSourceRef,
    disableAfterDraw,
    enableEditing,
    map,
    readOnly,
    recomputeBuffers,
    styles.bufferStyle,
    styles.modifyStyle,
    styles.polygonStyle,
    styles.sketchStyle,
    styles.startPointStyle,
  ]);

  useEffect(() => {
    recomputeBuffers(allPolygonsRef.current, bufferDistanceMeters);
  }, [bufferDistanceMeters, recomputeBuffers]);

  useEffect(() => {
    drawInteractionRef.current?.setActive(drawingEnabled);
    modifyInteractionRef.current?.setActive(drawingEnabled);

    if (!drawingEnabled) {
      drawInteractionRef.current?.abortDrawing();
      startPointSourceRef.current?.clear();
      if (map) {
        map.getViewport().style.cursor = "";
      }
      onPointCountChangeRef.current?.(0);
      onDrawingChangeRef.current?.(false);
    }
  }, [drawingEnabled, map]);

  return { vectorSourceRef, allPolygonsRef, sourceReady };
};
