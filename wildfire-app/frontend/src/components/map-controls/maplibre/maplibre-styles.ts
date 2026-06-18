import type maplibregl from 'maplibre-gl';
import { MAPLIBRE_VOYAGER_LAYER_ID } from '@/features/interactive-map/store/map-store';

export const BASE_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
export const BASE_STYLE_VOYAGER = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export const POLYGON_COLORS = {
  fill: 'rgba(255, 255, 255, 0.06)',
  stroke: '#f8fafc',
} as const;

export const BOUNDARY_COLORS = {
  availableFill: 'rgba(129, 140, 248, 0.14)',
  availableHoverFill: 'rgba(129, 140, 248, 0.28)',
  availableStroke: 'rgba(165, 180, 252, 0.95)',
  selectedFill: 'rgba(251, 191, 36, 0.12)',
  selectedStroke: 'rgba(251, 191, 36, 1)',
} as const;

export const USER_MODEL_COLORS = {
  fill: 'rgba(52, 211, 153, 0.18)',
  stroke: 'rgba(52, 211, 153, 0.95)',
  hoverFill: 'rgba(52, 211, 153, 0.32)',
} as const;

const numericLineWidthBaselines = new WeakMap<maplibregl.Map, Map<string, number>>();

function setPaintPropertySafely(
  map: maplibregl.Map,
  layerId: string,
  property: string,
  value: unknown,
): void {
  try {
    map.setPaintProperty(layerId, property, value);
  } catch {
    // Some style layers do not support every paint property we tune.
  }
}

function getNumericLineWidthBaseline(map: maplibregl.Map, layerId: string, current: number): number {
  let baselines = numericLineWidthBaselines.get(map);
  if (!baselines) {
    baselines = new Map<string, number>();
    numericLineWidthBaselines.set(map, baselines);
  }

  const existing = baselines.get(layerId);
  if (existing !== undefined) return existing;

  baselines.set(layerId, current);
  return current;
}

export function tuneBaseStyle(map: maplibregl.Map, baseLayerId: string): void {
  if (baseLayerId === MAPLIBRE_VOYAGER_LAYER_ID) {
    // For Voyager (Light), we generally just want the crisp vector features exactly as Carto designed them.
    // However, if we wanted to tweak the colors of parks or buildings, we could do so here.
    return;
  }

  // Default MapLibre Dark tuning
  try {
    const style = map.getStyle();
    if (!style || !Array.isArray(style.layers)) return;

    for (const layer of style.layers) {
      const id = layer.id || '';
      const type = (layer as { type?: string }).type || '';

      if (type === 'background') {
        setPaintPropertySafely(map, id, 'background-color', '#10141c');
        continue;
      }

      const isParkish = /park|wood|forest|grass|scrub|meadow|farmland|cemetery|nature|landcover/i.test(id);
      if (type === 'fill' && isParkish) {
        setPaintPropertySafely(map, id, 'fill-color', '#16321f');
        setPaintPropertySafely(map, id, 'fill-opacity', 0.95);
        continue;
      }

      if (type === 'fill' && /water/i.test(id)) {
        setPaintPropertySafely(map, id, 'fill-color', '#0c1a2a');
        continue;
      }

      if (type === 'fill' && /building/i.test(id)) {
        setPaintPropertySafely(map, id, 'fill-color', '#3a4150');
        setPaintPropertySafely(map, id, 'fill-opacity', 0.92);
        setPaintPropertySafely(map, id, 'fill-outline-color', '#525a6b');
        try {
          map.setLayerZoomRange(id, 12, 24);
        } catch {
          // Not all layers support zoom range changes.
        }
        continue;
      }

      if (type === 'line' && /road|street|highway|motorway|tunnel|bridge/i.test(id)) {
        const isMajor = /motorway|trunk|primary|secondary/i.test(id);
        setPaintPropertySafely(map, id, 'line-color', isMajor ? '#5b6473' : '#3a4150');
        try {
          const current = map.getPaintProperty(id, 'line-width');
          if (typeof current === 'number') {
            const baseline = getNumericLineWidthBaseline(map, id, current);
            setPaintPropertySafely(map, id, 'line-width', baseline * (isMajor ? 1.25 : 1.1));
          }
        } catch {
          // Some line-width properties might be expressions rather than raw numbers.
        }
      }
    }
  } catch (e) {
    console.error('Failed to tune dark base style:', e);
  }
}
