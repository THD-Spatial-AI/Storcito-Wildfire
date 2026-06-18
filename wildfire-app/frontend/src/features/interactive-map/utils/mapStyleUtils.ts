/**
 * Map styling utilities for boundary features (generic).
 */

import { Style, Fill, Stroke, Text } from 'ol/style';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { Point } from 'ol/geom';
import { getCenter } from 'ol/extent';

export function boundaryStyleFunction(_feature: Feature<Geometry>, resolution?: number): Style[] {
    const res = resolution || 1;

    // Zoomed out (seeing large area) — clean solid line, no dashes
    if (res > 20) {
        return [
            // Soft outer glow
            new Style({
                stroke: new Stroke({
                    color: 'rgba(99, 102, 241, 0.10)',
                    width: 6,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            }),
            // Solid line
            new Style({
                fill: new Fill({
                    color: 'rgba(99, 102, 241, 0.04)'
                }),
                stroke: new Stroke({
                    color: 'rgba(79, 70, 229, 0.6)',
                    width: 2,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            })
        ];
    }

    // Medium zoom — solid line with stronger presence
    if (res > 5) {
        return [
            // Outer glow
            new Style({
                stroke: new Stroke({
                    color: 'rgba(99, 102, 241, 0.12)',
                    width: 8,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            }),
            // Fill + main line
            new Style({
                fill: new Fill({
                    color: 'rgba(99, 102, 241, 0.05)'
                }),
                stroke: new Stroke({
                    color: 'rgba(79, 70, 229, 0.75)',
                    width: 2.5,
                    lineDash: [16, 8],
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            }),
            // White inner accent
            new Style({
                stroke: new Stroke({
                    color: 'rgba(255, 255, 255, 0.5)',
                    width: 1,
                    lineDash: [16, 8],
                    lineDashOffset: 4,
                    lineCap: 'round'
                })
            })
        ];
    }

    // Zoomed in — full detail with depth
    return [
        // Outer glow
        new Style({
            stroke: new Stroke({
                color: 'rgba(99, 102, 241, 0.10)',
                width: 10,
                lineCap: 'round',
                lineJoin: 'round'
            })
        }),
        // Shadow
        new Style({
            stroke: new Stroke({
                color: 'rgba(55, 48, 163, 0.15)',
                width: 6,
                lineCap: 'round',
                lineJoin: 'round'
            })
        }),
        // Main boundary line
        new Style({
            fill: new Fill({
                color: 'rgba(99, 102, 241, 0.06)'
            }),
            stroke: new Stroke({
                color: 'rgba(67, 56, 202, 0.85)',
                width: 2.5,
                lineDash: [16, 8],
                lineCap: 'round',
                lineJoin: 'round'
            })
        }),
        // White accent line for contrast
        new Style({
            stroke: new Stroke({
                color: 'rgba(255, 255, 255, 0.55)',
                width: 1,
                lineDash: [16, 8],
                lineDashOffset: 4,
                lineCap: 'round'
            })
        })
    ];
}

/**
 * Style for search result boundary — uses a bold rose/magenta color
 * to clearly stand out from default (indigo), selected (amber), and the green map background.
 */
export function searchBoundaryStyleFunction(_feature: Feature<Geometry>, resolution?: number): Style[] {
    const res = resolution || 1;

    if (res > 20) {
        return [
            new Style({
                stroke: new Stroke({
                    color: 'rgba(190, 24, 93, 0.20)',
                    width: 8,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            }),
            new Style({
                stroke: new Stroke({
                    color: 'rgba(190, 24, 93, 0.85)',
                    width: 3,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            })
        ];
    }

    if (res > 5) {
        return [
            new Style({
                stroke: new Stroke({
                    color: 'rgba(190, 24, 93, 0.22)',
                    width: 10,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            }),
            new Style({
                stroke: new Stroke({
                    color: 'rgba(190, 24, 93, 0.88)',
                    width: 3,
                    lineDash: [16, 8],
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            }),
            new Style({
                stroke: new Stroke({
                    color: 'rgba(255, 255, 255, 0.6)',
                    width: 1,
                    lineDash: [16, 8],
                    lineDashOffset: 4,
                    lineCap: 'round'
                })
            })
        ];
    }

    return [
        new Style({
            stroke: new Stroke({
                color: 'rgba(190, 24, 93, 0.20)',
                width: 12,
                lineCap: 'round',
                lineJoin: 'round'
            })
        }),
        new Style({
            stroke: new Stroke({
                color: 'rgba(131, 24, 67, 0.25)',
                width: 7,
                lineCap: 'round',
                lineJoin: 'round'
            })
        }),
        new Style({
            stroke: new Stroke({
                color: 'rgba(190, 24, 93, 0.92)',
                width: 3,
                lineDash: [16, 8],
                lineCap: 'round',
                lineJoin: 'round'
            })
        }),
        new Style({
            stroke: new Stroke({
                color: 'rgba(255, 255, 255, 0.6)',
                width: 1,
                lineDash: [16, 8],
                lineDashOffset: 4,
                lineCap: 'round'
            })
        })
    ];
}

/**
 * Only shown when zoomed in enough to avoid clutter
 */
export function boundaryLabelStyle(name: string, geometry: Geometry, resolution?: number): Style {
    const center = getCenter(geometry.getExtent());
    const res = resolution || 1;

    // Hide label when zoomed out — the boundary line is enough
    if (res > 20) {
        return new Style({});
    }

    const fontSize = res > 5 ? 11 : 13;

    return new Style({
        geometry: new Point(center),
        text: new Text({
            text: name.toUpperCase(),
            font: `600 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`,
            fill: new Fill({ color: '#312e81' }),
            stroke: new Stroke({
                color: 'rgba(255, 255, 255, 0.95)',
                width: 3.5
            }),
            backgroundFill: new Fill({
                color: 'rgba(238, 242, 255, 0.92)'
            }),
            backgroundStroke: new Stroke({
                color: 'rgba(99, 102, 241, 0.4)',
                width: 1
            }),
            padding: [6, 12, 6, 12],
            overflow: true,
            offsetY: 0
        })
    });
}
