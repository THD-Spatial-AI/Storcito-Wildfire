import { useMemo } from "react";
import { Fill, Stroke, Style, Circle as CircleStyle, Text } from "ol/style";
import type { Polygon } from "ol/geom";
import type { FeatureLike } from "ol/Feature";

interface PolygonStyleLabels {
  clickToClose?: string;
  start?: string;
  edit?: string;
}

/** Edit-badge flag. */
export const EDIT_BADGE_PROPERTY = "showEditBadge";

export const usePolygonStyles = (
  labels: PolygonStyleLabels = {},
  editableRef?: { current: boolean },
) => {
  return useMemo(() => {
    const outlineStyle = new Style({
      fill: new Fill({
        color: "transparent",
      }),
      stroke: new Stroke({
        color: "#000000",
        width: 2.5,
      }),
    });
    const editBadgeStyle = new Style({
      text: new Text({
        text: `\u270E ${labels.edit ?? "Edit"}`,
        font: "600 12px Inter, system-ui, sans-serif",
        fill: new Fill({ color: "#0e7490" }),
        stroke: new Stroke({ color: "#ffffff", width: 3 }),
        padding: [3, 6, 3, 6],
      }),
    });
    const polygonStyle = editableRef
      ? (feature: FeatureLike) => {
          if (!editableRef.current) return outlineStyle;
          if (!feature.get(EDIT_BADGE_PROPERTY)) return outlineStyle;
          const geometry = feature.getGeometry();
          if (!geometry || geometry.getType() !== "Polygon") return outlineStyle;
          editBadgeStyle.setGeometry((geometry as Polygon).getInteriorPoint());
          return [outlineStyle, editBadgeStyle];
        }
      : outlineStyle;

    const bufferStyle = new Style({
      fill: new Fill({ color: "rgba(251, 191, 36, 0.3)" }),
      stroke: new Stroke({ color: "#f59e0b", width: 3, lineDash: [8, 4] }),
    });

    const startPointStyle = (feature: { get: (key: string) => unknown }) => {
      const isNearStart = feature.get("isNearStart");
      return new Style({
        image: new CircleStyle({
          radius: isNearStart ? 12 : 8,
          fill: new Fill({ color: "#06b6d4" }),
          stroke: new Stroke({
            color: isNearStart ? "#0891b2" : "#0e7490",
            width: isNearStart ? 3 : 2,
          }),
        }),
        text: new Text({
          text: isNearStart ? (labels.clickToClose ?? "Click to close") : (labels.start ?? "Start"),
          offsetY: isNearStart ? -22 : -18,
          font: isNearStart
            ? "bold 12px Inter, system-ui, sans-serif"
            : "11px Inter, system-ui, sans-serif",
          fill: new Fill({ color: "#0e7490" }),
          stroke: new Stroke({ color: "#ffffff", width: 3 }),
          padding: [2, 4, 2, 4],
        }),
      });
    };

    const sketchStyle = new Style({
      fill: new Fill({ color: "rgba(0, 0, 0, 0.05)" }),
      stroke: new Stroke({ color: "#000000", width: 2, lineDash: [4, 4] }),
      image: new CircleStyle({ radius: 4, fill: new Fill({ color: "#000000" }) }),
    });

    const modifyStyle = new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "#06b6d4" }),
        stroke: new Stroke({ color: "#0891b2", width: 2 }),
      }),
    });

    return { polygonStyle, bufferStyle, startPointStyle, sketchStyle, modifyStyle };
  }, [editableRef, labels.clickToClose, labels.edit, labels.start]);
};
