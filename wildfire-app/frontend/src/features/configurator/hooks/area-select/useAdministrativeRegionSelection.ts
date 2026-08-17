import { useEffect, useRef } from 'react';
import type Map from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { toLonLat } from 'ol/proj';

import {
  geocodingService,
  type AdministrativeRegionResult,
} from '@/features/interactive-map/services/geocoding';
import { removeSearchBoundaryLayer } from '@/features/interactive-map/utils/searchBoundaryLayer';

interface AdministrativeRegionSelectionOptions {
  map: Map | null;
  enabled: boolean;
  onStart: () => void;
  onSelected: (region: AdministrativeRegionResult) => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

const NOT_FOUND_MESSAGE =
  'No administrative region boundary was found here. Try clicking farther inside the region.';
const REQUEST_FAILED_MESSAGE =
  'Could not load the administrative boundary. Check your connection and try again.';

export const useAdministrativeRegionSelection = ({
  map,
  enabled,
  onStart,
  onSelected,
  onError,
  onCancel,
}: AdministrativeRegionSelectionOptions) => {
  const callbacksRef = useRef({ onStart, onSelected, onError, onCancel });

  useEffect(() => {
    callbacksRef.current = { onStart, onSelected, onError, onCancel };
  }, [onCancel, onError, onSelected, onStart]);

  useEffect(() => {
    if (!map || !enabled) return;

    const viewport = map.getViewport();
    const previousCursor = viewport.style.cursor;
    let activeController: AbortController | null = null;
    let busy = false;
    let disposed = false;

    viewport.style.cursor = 'crosshair';

    const handleClick = async (event: MapBrowserEvent) => {
      if (busy || disposed) return;

      busy = true;
      activeController = new AbortController();
      viewport.style.cursor = 'progress';
      callbacksRef.current.onStart();

      const [longitude, latitude] = toLonLat(event.coordinate);

      try {
        const region = await geocodingService.reverseAdministrativeRegion(
          latitude,
          longitude,
          activeController.signal,
        );

        if (disposed) return;
        if (!region) {
          callbacksRef.current.onError(NOT_FOUND_MESSAGE);
          return;
        }

        removeSearchBoundaryLayer(map);
        callbacksRef.current.onSelected(region);
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === 'AbortError')) return;
        callbacksRef.current.onError(REQUEST_FAILED_MESSAGE);
      } finally {
        if (!disposed) {
          busy = false;
          activeController = null;
          viewport.style.cursor = 'crosshair';
        }
      }
    };

    map.on('click', handleClick);

    return () => {
      disposed = true;
      activeController?.abort();
      map.un('click', handleClick);
      viewport.style.cursor = previousCursor;
      callbacksRef.current.onCancel();
    };
  }, [enabled, map]);
};
