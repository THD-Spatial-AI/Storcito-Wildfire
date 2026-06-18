import type { FC } from "react";
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
  /** If true, disables drawing after first polygon is created (unless cleared) */
  disableAfterDraw?: boolean;
  /** If false, keeps existing polygon layers visible but disables draw/modify interactions */
  drawingEnabled?: boolean;
  /** If true, only displays polygons without allowing editing */
  readOnly?: boolean;
  /** If true, enables polygon vertex editing (drag vertices, add/remove points) */
  enableEditing?: boolean;
  /** Translation labels */
  labels?: {
    clickToClose?: string;
    start?: string;
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
  const styles = usePolygonStyles(labels);
  const { bufferSourceRef, bufferDistanceRef, recomputeBuffers } = usePolygonBuffer(bufferDistanceMeters);
  usePolygonDrawing({
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

  return null;
};
