// Tooltip keys for translation lookup.
// Only keys actually referenced by UI components are listed here.
export const TOOLTIP_KEYS = {
  publicBuildings: 'tooltips.publicBuildings',
  privateBuildings: 'tooltips.privateBuildings',
  buildingEnrichment: 'tooltips.buildingEnrichment'
} as const;

export type TooltipKey = keyof typeof TOOLTIP_KEYS;

// Fallback content (English) — used when translations are not available.
export const TOOLTIP_CONTENTS: Record<TooltipKey, { title: string; description: string; example: string }> = {
  publicBuildings: {
    title: 'Public Custom Buildings',
    description: 'Include buildings shared by other users in the current selection.',
    example: 'You can also exclude individual buildings by clicking on them on the map.'
  },
  privateBuildings: {
    title: 'My Custom Buildings',
    description: 'Include your private custom buildings in the current selection.',
    example: 'You can also exclude individual buildings by clicking on them on the map.'
  },
  buildingEnrichment: {
    title: 'Building Enrichment Data',
    description: 'Optional per-country enrichment data attached to each building (e.g. building IDs, demographics, heights). Sources and availability vary by region.',
    example: 'Used to enrich the base building dataset with additional metadata.'
  }
};
