import { useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import type { Map as OlMap } from 'ol';
import type MapBrowserEvent from 'ol/MapBrowserEvent';

export interface InteractionCallbacks {
  onMapClick?: (lngLat: [number, number]) => void;
}

export function useMapLibreInteractions(
  mapRef: React.RefObject<maplibregl.Map | null>,
  olMap: OlMap,
  visible: boolean,
  callbacks: InteractionCallbacks,
) {
  const cbRefs = useRef(callbacks);
  cbRefs.current = callbacks;

  useEffect(() => {
    if (!visible) return;

    const handleClick = (evt: MapBrowserEvent) => {
      const map = mapRef.current;
      if (!map) return;
      const pixel: [number, number] = [evt.pixel[0], evt.pixel[1]];
      const lngLat = map.unproject(pixel);
      cbRefs.current.onMapClick?.([lngLat.lng, lngLat.lat]);
    };

    olMap.on('click', handleClick);

    return () => {
      olMap.un('click', handleClick);
      olMap.getTargetElement().style.cursor = '';
    };
  }, [mapRef, olMap, visible]);
}
