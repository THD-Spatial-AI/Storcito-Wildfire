import { useEffect } from 'react';
import type { Map as OlMap } from 'ol';
import { motionMs } from "@/lib/motion";

/** 3d camera controls */
export interface MapKeyControls {
  zoomIn: () => void;
  zoomOut: () => void;
  /** fractional pan */
  pan: (dx: number, dy: number) => void;
}

interface Options {
  /** new model key */
  onNewModel?: () => void;
  /** space play/pause */
  onTogglePlay?: () => void;
  /** f fullscreen */
  onToggleFullscreen?: () => void;
  /** t 3d terrain */
  onToggle3D?: () => void;
  /** l layer visibility */
  onToggleLayerVisible?: () => void;
  /** overrides zoom/pan */
  controls?: MapKeyControls | null;
}

const ZOOM_STEP = 1;
const PAN_FRACTION = 0.25;

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/** space not re-trigger */
function isActivatableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && ['BUTTON', 'A'].includes(el.tagName);
}

/** map keyboard shortcuts */
export function useMapKeyboardShortcuts(
  map: OlMap | null,
  {
    onNewModel,
    onTogglePlay,
    onToggleFullscreen,
    onToggle3D,
    onToggleLayerVisible,
    controls,
  }: Options = {}
) {
  useEffect(() => {
    if (!map && !controls) return;

    const zoomBy = (steps: number) => {
      if (controls) {
        if (steps > 0) controls.zoomIn();
        else controls.zoomOut();
        return;
      }
      const view = map?.getView();
      const zoom = view?.getZoom();
      if (!view || zoom === undefined) return;
      view.animate({ zoom: zoom + steps, duration: motionMs(200) });
    };

    const panBy = (dx: number, dy: number) => {
      if (controls) {
        controls.pan(dx, dy);
        return;
      }
      const view = map?.getView();
      const center = view?.getCenter();
      const resolution = view?.getResolution();
      const size = map?.getSize();
      if (!view || !center || resolution === undefined || !size) return;
      view.animate({
        center: [center[0] + dx * size[0] * resolution, center[1] + dy * size[1] * resolution],
        duration: motionMs(200),
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      switch (event.key) {
        case '+':
        case '=':
          zoomBy(ZOOM_STEP);
          break;
        case '-':
        case '_':
          zoomBy(-ZOOM_STEP);
          break;
        case 'ArrowLeft':
          panBy(-PAN_FRACTION, 0);
          break;
        case 'ArrowRight':
          panBy(PAN_FRACTION, 0);
          break;
        case 'ArrowUp':
          panBy(0, PAN_FRACTION);
          break;
        case 'ArrowDown':
          panBy(0, -PAN_FRACTION);
          break;
        case 'n':
        case 'N':
          if (!onNewModel) return;
          onNewModel();
          break;
        case ' ':
          if (!onTogglePlay || isActivatableTarget(event.target)) return;
          onTogglePlay();
          break;
        case 'f':
        case 'F':
          if (!onToggleFullscreen) return;
          onToggleFullscreen();
          break;
        case 't':
        case 'T':
          if (!onToggle3D) return;
          onToggle3D();
          break;
        case 'l':
        case 'L':
          if (!onToggleLayerVisible) return;
          onToggleLayerVisible();
          break;
        default:
          return;
      }

      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [map, controls, onNewModel, onTogglePlay, onToggleFullscreen, onToggle3D, onToggleLayerVisible]);
}
