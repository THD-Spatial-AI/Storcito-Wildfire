// Tooltip keys for translation lookup.
// Only keys actually referenced by UI components are listed here.
export const TOOLTIP_KEYS = {
  publicBuildings: 'tooltips.publicBuildings',
  privateBuildings: 'tooltips.privateBuildings',
  buildingEnrichment: 'tooltips.buildingEnrichment',
  windSpeed: 'tooltips.windSpeed',
  windDirection: 'tooltips.windDirection',
  temperature: 'tooltips.temperature',
  humidity: 'tooltips.humidity'
} as const;

export type TooltipKey = keyof typeof TOOLTIP_KEYS;

// Fallback content (English) — used when translations are not available.
export const TOOLTIP_CONTENTS: Record<TooltipKey, { title: string; description: string; example?: string }> = {
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
  },
  windSpeed: {
    title: 'Wind Speed',
    description: 'Average wind speed over the selected area for the given time period.',
    example: 'Higher wind speeds provide more oxygen to the fire and can rapidly spread embers, significantly increasing the rate of fire spread.'
  },
  windDirection: {
    title: 'Wind Direction',
    description: 'Average wind direction over the selected area, represented in degrees and compass points.',
    example: 'N (North), E (East), S (South), W (West), and intermediate points like NNE (North-Northeast) or WSW (West-Southwest).'
  },
  temperature: {
    title: 'Temperature',
    description: 'Average ambient temperature over the selected area for the given time period.',
    example: 'High temperatures dry out vegetation (fuels), making them easier to ignite and allowing the fire to burn more intensely.'
  },
  humidity: {
    title: 'Relative Humidity',
    description: 'Average relative humidity over the selected area for the given time period.',
    example: 'Low relative humidity means the air is dry, which draws moisture out of the vegetation, creating highly flammable fuels.'
  }
};
