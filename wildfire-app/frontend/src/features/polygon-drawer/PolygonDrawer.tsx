import { useEffect, useRef, type FC } from "react";
import type Map from "ol/Map";
import { usePolygonBuffer, usePolygonDrawing, usePolygonStyles } from "./hooks";

interface PolygonDrawerProps {
  map: Map | null;
  onPolygonDrawn?: (coordinates: [number, number][], allPolygons: [number, number][][]) => void;
  onPolygonModified?: (allPolygons: [number, number][][]) => void;
  onDrawingChange?: (isDrawing: boolean) => void;
  onPointCountChange?: (count: number) => void;
  onClearAll?: () => void;
  allowMultiple?: boolean;
  clearTrigger?: number;
  initialPolygons?: [number, number][][];
  bufferDistanceMeters?: number;
  disableAfterDraw?: boolean;
  drawingEnabled?: boolean;
  readOnly?: boolean;

  enableEditing?: boolean;
  /** Translation labels */
  labels?: {
    clickToClose?: string;
    start?: string;
    edit?: string;
  };
}

export const PolygonDrawer: FC<PolygonDrawerProps> = ({
  map,
  onPolygonDrawn,
  onPolygonModified,
  onDrawingChange,
  onPointCountChange,
  onClearAll,
  allowMultiple = false,
  clearTrigger = 0,
  initialPolygons,
  bufferDistanceMeters = 0,
  disableAfterDraw = false,
  drawingEnabled = true,
  readOnly = false,
  enableEditing = true,
  labels = {},
}) => {
  const canEditNow = enableEditing && !readOnly && drawingEnabled;
  const canEditRef = useRef(canEditNow);
  useEffect(() => {
    canEditRef.current = canEditNow;
  }, [canEditNow]);

  const styles = usePolygonStyles(labels, canEditRef);
  const { bufferSourceRef, bufferDistanceRef, recomputeBuffers } =
    usePolygonBuffer(bufferDistanceMeters);
  const { vectorSourceRef } = usePolygonDrawing({
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
    labels,
    styles,
    bufferSourceRef,
    bufferDistanceRef,
    bufferDistanceMeters,
    recomputeBuffers,
  });

  // Repaint so the badge appears or disappears with the edit state.
  useEffect(() => {
    vectorSourceRef.current?.changed();
  }, [canEditNow, vectorSourceRef]);

  return null;
};
