import { useEffect, useRef, type FC } from "react";
import type Map from "ol/Map";
import { usePolygonBuffer, usePolygonDrawing, usePolygonStyles } from "./hooks";
import type { PolygonVariant } from "./hooks/usePolygonStyles";

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
  /** Edit request. */
  onEditRequest?: () => void;
  /** Region styling. */
  variant?: PolygonVariant;
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
  onEditRequest,
  variant = "drawn",
  labels = {},
}) => {
  const canEditNow = !readOnly && ((enableEditing && drawingEnabled) || Boolean(onEditRequest));
  const canEditRef = useRef(canEditNow);
  useEffect(() => {
    canEditRef.current = canEditNow;
  }, [canEditNow]);

  const styles = usePolygonStyles(labels, canEditRef, variant);
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
    onEditRequest,
  });

  // Repaint the badge.
  useEffect(() => {
    vectorSourceRef.current?.changed();
  }, [canEditNow, vectorSourceRef]);

  return null;
};
