export const BASE_LAYER_FAILURE_COOLDOWN_MS = 30_000;

const RASTER_RECOVERY_ORDER = [
  "osm_standard",
  "carto_positron",
  "osm_humanitarian",
] as const;

/** Pick a different raster provider that has not failed during the cooldown window. */
export function chooseRasterFallbackLayerId(
  failedLayerId: string,
  unavailableLayerIds: ReadonlySet<string> = new Set(),
): string | null {
  return RASTER_RECOVERY_ORDER.find(
    (layerId) => layerId !== failedLayerId && !unavailableLayerIds.has(layerId),
  ) ?? null;
}
