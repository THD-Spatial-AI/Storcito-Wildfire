import { useCallback, useEffect, useRef } from "react";
import type { Map as OlMap } from "ol";
import type BaseLayer from "ol/layer/Base";
import type { CollectionEvent } from "ol/Collection";
import Modify from "ol/interaction/Modify";
import Draw from "ol/interaction/Draw";

const OL_HIDDEN_CLASS = "ol-maplibre-hidden";
const OL_VISIBLE_IN_MAPLIBRE_CLASS = "ol-visible-in-maplibre";
let styleInjected = false;

function ensureHidingStyle() {
  if (styleInjected) return;
  const style = document.createElement("style");
  style.setAttribute("data-ol-maplibre-hide", "");
  style.textContent = `
    .${OL_HIDDEN_CLASS} canvas,
    .${OL_HIDDEN_CLASS} .ol-overlaycontainer,
    .${OL_HIDDEN_CLASS} .ol-overlaycontainer-stopevent,
    .${OL_HIDDEN_CLASS} .ol-layer {
      visibility: hidden !important;
    }
    .${OL_HIDDEN_CLASS} .${OL_VISIBLE_IN_MAPLIBRE_CLASS},
    .${OL_HIDDEN_CLASS} .${OL_VISIBLE_IN_MAPLIBRE_CLASS} canvas {
      visibility: visible !important;
    }
  `;
  document.head.appendChild(style);
  styleInjected = true;
}

function isVisibleInMapLibreElement(el: Element) {
  return Boolean(el.closest(`.${OL_VISIBLE_IN_MAPLIBRE_CLASS}`));
}

function hideViewportChildren(viewport: HTMLElement) {
  viewport
    .querySelectorAll("canvas, .ol-overlaycontainer, .ol-overlaycontainer-stopevent, .ol-layer")
    .forEach((el) => {
      if (isVisibleInMapLibreElement(el)) {
        (el as HTMLElement).style.removeProperty("visibility");
        return;
      }
      (el as HTMLElement).style.setProperty("visibility", "hidden", "important");
    });
}

function showViewportChildren(viewport: HTMLElement) {
  viewport
    .querySelectorAll("canvas, .ol-overlaycontainer, .ol-overlaycontainer-stopevent, .ol-layer")
    .forEach((el) => {
      (el as HTMLElement).style.removeProperty("visibility");
    });
}

export function useOlLayerSync(olMap: OlMap, visible: boolean, isDrawing: boolean) {
  const observerRef = useRef<MutationObserver | null>(null);
  const activeRef = useRef(false);
  const pendingTimeoutsRef = useRef<number[]>([]);

  const clearPendingTimeouts = useCallback(() => {
    pendingTimeoutsRef.current.forEach((id) => clearTimeout(id));
    pendingTimeoutsRef.current = [];
  }, []);

  const rerenderOlSafely = useCallback(() => {
    if (!olMap.getTargetElement()) return;

    olMap.getLayers().forEach((layer: BaseLayer) => {
      layer.changed();
    });
    olMap.updateSize();
    olMap.renderSync();
  }, [olMap]);

  useEffect(() => {
    ensureHidingStyle();
  }, []);

  useEffect(() => {
    if (!visible) return;
    clearPendingTimeouts();
    const viewport = olMap.getViewport();
    if (!viewport) return;
    const origZ = viewport.style.zIndex;

    activeRef.current = true;
    viewport.style.zIndex = "2";
    viewport.classList.add(OL_HIDDEN_CLASS);
    hideViewportChildren(viewport);

    const observer = new MutationObserver(() => {
      if (activeRef.current) hideViewportChildren(viewport);
    });
    observer.observe(viewport, { childList: true, subtree: true });
    observerRef.current = observer;

    return () => {
      activeRef.current = false;
      observer.disconnect();
      observer.takeRecords();
      observerRef.current = null;
      viewport.classList.remove(OL_HIDDEN_CLASS);
      viewport.style.zIndex = origZ;

      clearPendingTimeouts();
      const restoreRasterViewport = () => {
        if (viewport.classList.contains(OL_HIDDEN_CLASS)) return;
        showViewportChildren(viewport);
        rerenderOlSafely();
      };

      restoreRasterViewport();

      const secondPassId = window.setTimeout(() => {
        restoreRasterViewport();
      }, 200);
      pendingTimeoutsRef.current.push(secondPassId);

      const thirdPassId = window.setTimeout(() => {
        restoreRasterViewport();
      }, 600);
      pendingTimeoutsRef.current.push(thirdPassId);
    };
  }, [clearPendingTimeouts, olMap, rerenderOlSafely, visible]);

  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (!visible || !isDrawing) return;
    const viewport = olMap.getViewport();
    if (!viewport) return;

    const observer = observerRef.current;
    if (observer) observer.disconnect();

    viewport.classList.remove(OL_HIDDEN_CLASS);
    showViewportChildren(viewport);

    const hiddenLayers: BaseLayer[] = [];
    const polygonZIndexMin = 2000;
    const polygonZIndexMax = 2004;

    olMap.getLayers().forEach((layer: BaseLayer) => {
      const z = layer.getZIndex();
      const isPolygonLayer = z !== undefined && z >= polygonZIndexMin && z <= polygonZIndexMax;
      if (!isPolygonLayer && layer.getVisible()) {
        layer.setVisible(false);
        hiddenLayers.push(layer);
      }
    });

    const onLayerAdd = (e: CollectionEvent<BaseLayer>) => {
      const layer = e.element;
      const z = layer.getZIndex();
      const isPolygonLayer = z !== undefined && z >= polygonZIndexMin && z <= polygonZIndexMax;
      if (!isPolygonLayer && layer.getVisible()) {
        layer.setVisible(false);
        hiddenLayers.push(layer);
      }
    };
    olMap.getLayers().on("add", onLayerAdd);

    return () => {
      olMap.getLayers().un("add", onLayerAdd);
      hiddenLayers.forEach((layer) => layer.setVisible(true));
      if (visibleRef.current) {
        viewport.classList.add(OL_HIDDEN_CLASS);
        hideViewportChildren(viewport);
        if (observer) {
          observer.observe(viewport, { childList: true, subtree: true });
        }
      }
    };
  }, [olMap, visible, isDrawing]);

  useEffect(() => {
    if (!visible) return;
    if (isDrawing) return;

    const deactivated: { interaction: Modify | Draw; wasActive: boolean }[] = [];

    olMap.getInteractions().forEach((interaction) => {
      if (interaction instanceof Modify || interaction instanceof Draw) {
        const wasActive = interaction.getActive();
        if (wasActive) {
          interaction.setActive(false);
          deactivated.push({ interaction, wasActive });
        }
      }
    });

    return () => {
      deactivated.forEach(({ interaction, wasActive }) => {
        interaction.setActive(wasActive);
      });
    };
  }, [olMap, visible, isDrawing]);
}
