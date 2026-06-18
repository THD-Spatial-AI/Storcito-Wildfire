import { useEffect, useRef } from 'react';
import maplibregl, { type MapLibreEvent } from 'maplibre-gl';
import { toLonLat, fromLonLat } from 'ol/proj';
import type { Map as OlMap } from 'ol';
import type Interaction from 'ol/interaction/Interaction';
import { DoubleClickZoom, DragPan, MouseWheelZoom, PinchZoom } from 'ol/interaction';
import { BASE_STYLE, BASE_STYLE_VOYAGER, tuneBaseStyle } from './maplibre-styles';
import { useMapStore, MAPLIBRE_VOYAGER_LAYER_ID } from '@/features/interactive-map/store/map-store';

export function useMapLibreMap(olMap: OlMap, visible: boolean, isDrawing: boolean = false) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isDrawingRef = useRef(isDrawing);
  const selectedBaseLayerId = useMapStore(s => s.selectedBaseLayerId);

  useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);

  useEffect(() => {
    if (!containerRef.current || !visible) return;

    let map: maplibregl.Map | null = null;
    let cancelled = false;
    let cleanupFns: (() => void)[] = [];
    let retryInitTimeoutId: number | null = null;
    const resizeTimeoutIds: number[] = [];

    const rafId = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container || cancelled) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        retryInitTimeoutId = window.setTimeout(() => {
          if (cancelled || !containerRef.current) return;
          initMap(containerRef.current);
        }, 200);
        return;
      }
      initMap(container);
    });

    function initMap(container: HTMLDivElement) {
      if (cancelled || mapRef.current) return;

      const view = olMap.getView();
      const center = view.getCenter();
      const zoom = view.getZoom() ?? 14;
      const [lon, lat] = center ? toLonLat(center, view.getProjection()) : [0, 0];

      const styleUrl = selectedBaseLayerId === MAPLIBRE_VOYAGER_LAYER_ID ? BASE_STYLE_VOYAGER : BASE_STYLE;

      map = new maplibregl.Map({
        container,
        style: styleUrl,
        center: [lon, lat],
        zoom: zoom - 1,
        pitch: 0,
        bearing: 0,
        maxPitch: 0,
        attributionControl: false,
        dragPan: true,
        dragRotate: false,
        scrollZoom: true,
        doubleClickZoom: false,
        touchZoomRotate: false,
        boxZoom: false,
        keyboard: false,
      });

      let mlDriving = false;
      let olSyncRaf = 0;

      const syncOlToMl = () => {
        if (mlDriving || olSyncRaf) return;
        olSyncRaf = requestAnimationFrame(() => {
          olSyncRaf = 0;
          const mlMap = mapRef.current;
          if (!mlMap || mlDriving) return;
          const c = view.getCenter();
          const z = view.getZoom();
          if (!c || z === undefined) return;
          const [clon, clat] = toLonLat(c, view.getProjection());
          mlMap.jumpTo({ center: [clon, clat], zoom: z - 1 });
        });
      };

      view.on('change:center', syncOlToMl);
      view.on('change:resolution', syncOlToMl);

      const syncMlToOl = () => {
        const mlMap = mapRef.current;
        if (!mlMap) return;
        const c = mlMap.getCenter();
        const z = mlMap.getZoom();
        view.setCenter(fromLonLat([c.lng, c.lat], view.getProjection()));
        view.setZoom(z + 1);
      };

      map.on('move', () => {
        if (mlDriving) syncMlToOl();
      });

      map.on('movestart', (e: MapLibreEvent<Event | undefined>) => {
        if (e.originalEvent) mlDriving = true;
      });

      map.on('moveend', () => {
        if (mlDriving) {
          syncMlToOl();
          mlDriving = false;
        }
      });

      cleanupFns = [
        () => { view.un('change:center', syncOlToMl); },
        () => { view.un('change:resolution', syncOlToMl); },
        () => { if (olSyncRaf) cancelAnimationFrame(olSyncRaf); },
      ];

      mapRef.current = map;
      const createdMap = map;

      let tuneRaf = 0;
      const applyStyleTuning = () => {
        if (tuneRaf) return;
        tuneRaf = requestAnimationFrame(() => {
          tuneRaf = 0;
          if (cancelled || mapRef.current !== createdMap) return;
          tuneBaseStyle(createdMap, selectedBaseLayerId);
        });
      };

      if (createdMap.isStyleLoaded()) {
        applyStyleTuning();
      }
      createdMap.on('styledata', applyStyleTuning);
      createdMap.on('load', applyStyleTuning);

      const scheduleResize = (delayMs: number) => {
        const id = window.setTimeout(() => {
          if (cancelled || mapRef.current !== createdMap) return;
          try {
            createdMap.resize();
          } catch {
            // Ignore resize errors during fast route transitions.
          }
        }, delayMs);
        resizeTimeoutIds.push(id);
      };
      scheduleResize(100);
      scheduleResize(500);

      const olViewport = olMap.getViewport();
      const mlCanvas = container.querySelector('canvas') as HTMLCanvasElement | null;

      const onWheel = (e: WheelEvent) => {
        if (isDrawingRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        const target = mlCanvas || container;
        target.dispatchEvent(new WheelEvent('wheel', {
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          bubbles: true,
          cancelable: true,
        }));
      };
      olViewport.addEventListener('wheel', onWheel, { passive: false, capture: true });

      let dragStartPos: { x: number; y: number } | null = null;
      let isDragging = false;
      const DRAG_THRESHOLD = 3;

      const onMouseDown = (e: MouseEvent) => {
        if (isDrawingRef.current) return;
        if (e.button === 0 && !e.shiftKey) {
          dragStartPos = { x: e.clientX, y: e.clientY };
        }
      };

      const onMouseMove = (e: MouseEvent) => {
        if (isDrawingRef.current) return;
        if (dragStartPos && !isDragging) {
          const dx = e.clientX - dragStartPos.x;
          const dy = e.clientY - dragStartPos.y;
          if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            isDragging = true;
            olViewport.style.pointerEvents = 'none';
            const target = mlCanvas || container;
            target.dispatchEvent(new MouseEvent('mousedown', {
              button: 0,
              buttons: 1,
              clientX: dragStartPos.x,
              clientY: dragStartPos.y,
              bubbles: true,
            }));
            target.dispatchEvent(new MouseEvent('mousemove', {
              button: 0,
              buttons: 1,
              clientX: e.clientX,
              clientY: e.clientY,
              bubbles: true,
            }));
          }
        }
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          olViewport.style.pointerEvents = '';
        }
        dragStartPos = null;
      };

      olViewport.addEventListener('mousedown', onMouseDown);
      olViewport.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      let touchDragging = false;

      const forwardTouchEvent = (e: TouchEvent, type: string) => {
        const target = mlCanvas || container;
        target.dispatchEvent(new TouchEvent(type, {
          touches: Array.from(e.touches),
          targetTouches: Array.from(e.targetTouches),
          changedTouches: Array.from(e.changedTouches),
          bubbles: true,
          cancelable: true,
        }));
      };

      const onTouchStart = (e: TouchEvent) => {
        if (isDrawingRef.current) return;
        if (e.touches.length >= 2) {
          e.preventDefault();
          touchDragging = true;
          olViewport.style.pointerEvents = 'none';
          forwardTouchEvent(e, 'touchstart');
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (touchDragging) forwardTouchEvent(e, 'touchmove');
      };

      const onTouchEnd = (e: TouchEvent) => {
        if (touchDragging) {
          forwardTouchEvent(e, 'touchend');
          if (e.touches.length === 0) {
            touchDragging = false;
            olViewport.style.pointerEvents = '';
          }
        }
      };

      olViewport.addEventListener('touchstart', onTouchStart, { passive: false });
      olViewport.addEventListener('touchmove', onTouchMove, { passive: false });
      olViewport.addEventListener('touchend', onTouchEnd);

      cleanupFns.push(
        () => { createdMap.off('styledata', applyStyleTuning); },
        () => { createdMap.off('load', applyStyleTuning); },
        () => { if (tuneRaf) cancelAnimationFrame(tuneRaf); },
        () => { olViewport.removeEventListener('wheel', onWheel, { capture: true }); },
        () => { olViewport.removeEventListener('mousedown', onMouseDown); },
        () => { olViewport.removeEventListener('mousemove', onMouseMove); },
        () => { window.removeEventListener('mouseup', onMouseUp); },
        () => { olViewport.removeEventListener('touchstart', onTouchStart); },
        () => { olViewport.removeEventListener('touchmove', onTouchMove); },
        () => { olViewport.removeEventListener('touchend', onTouchEnd); },
        () => { olViewport.style.pointerEvents = ''; },
      );
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (retryInitTimeoutId !== null) clearTimeout(retryInitTimeoutId);
      resizeTimeoutIds.forEach((id) => clearTimeout(id));
      cleanupFns.forEach(fn => fn());
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [olMap, visible, selectedBaseLayerId]); // Re-initialize map when base layer changes

  useEffect(() => {
    if (!visible || isDrawing) return;
    const disabled: Interaction[] = [];
    olMap.getInteractions().forEach((interaction) => {
      if (
        (interaction instanceof DragPan ||
          interaction instanceof MouseWheelZoom ||
          interaction instanceof PinchZoom) &&
        interaction.getActive()
      ) {
        interaction.setActive(false);
        disabled.push(interaction);
      }
    });

    return () => {
      disabled.forEach(i => i.setActive(true));
    };
  }, [olMap, visible, isDrawing]);

  useEffect(() => {
    if (!visible) return;

    const deactivated: Interaction[] = [];
    olMap.getInteractions().forEach((interaction) => {
      if (interaction instanceof DoubleClickZoom && interaction.getActive()) {
        interaction.setActive(false);
        deactivated.push(interaction);
      }
    });

    return () => {
      deactivated.forEach((interaction) => interaction.setActive(true));
    };
  }, [olMap, visible]);

  useEffect(() => {
    if (!visible || !isDrawing) return;
    const map = mapRef.current;
    if (!map) return;

    if (map.getPitch() !== 0 || map.getBearing() !== 0) {
      map.easeTo({ pitch: 0, bearing: 0, duration: 300 });
    }
  }, [visible, isDrawing]);

  return { containerRef, mapRef };
}
