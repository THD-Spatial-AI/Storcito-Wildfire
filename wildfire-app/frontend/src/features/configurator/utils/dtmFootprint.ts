import { fromBlob } from "geotiff";
import proj4 from "proj4";

// A closed lon/lat ring (EPSG:4326) describing an uploaded DTM's coverage.
export type DtmFootprintRing = [number, number][];

// What we read from an uploaded DTM for the map preview: the valid-data outline
// (lon/lat, for validation) plus a colored elevation image georeferenced in the
// map projection (EPSG:3857) for an ImageStatic overlay.
export interface DtmPreview {
    footprint: DtmFootprintRing | null;
    imageDataUrl: string | null;
    imageExtent3857: [number, number, number, number] | null;
}

// Downsample target for the preview read (keeps the 430 MB on disk).
const PREVIEW_SIZE = 512;

// Terrain-style elevation ramp (low → high): green → tan → brown → white.
const ELEVATION_RAMP: [number, [number, number, number]][] = [
    [0.0, [46, 139, 87]],
    [0.3, [173, 209, 123]],
    [0.55, [240, 225, 150]],
    [0.8, [171, 120, 70]],
    [1.0, [245, 245, 245]],
];

function rampColor(t: number): [number, number, number] {
    const x = Math.max(0, Math.min(1, t));
    for (let i = 1; i < ELEVATION_RAMP.length; i++) {
        const [p1, c1] = ELEVATION_RAMP[i - 1];
        const [p2, c2] = ELEVATION_RAMP[i];
        if (x <= p2) {
            const f = (x - p1) / (p2 - p1 || 1);
            return [
                Math.round(c1[0] + (c2[0] - c1[0]) * f),
                Math.round(c1[1] + (c2[1] - c1[1]) * f),
                Math.round(c1[2] + (c2[2] - c1[2]) * f),
            ];
        }
    }
    return ELEVATION_RAMP[ELEVATION_RAMP.length - 1][1];
}

// 2nd/98th percentile of valid values, so a few outliers don't wash out the ramp.
function contrastRange(values: number[]): [number, number] {
    if (values.length === 0) return [0, 1];
    const sorted = [...values].sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.02)];
    const hi = sorted[Math.floor(sorted.length * 0.98)];
    return hi > lo ? [lo, hi] : [sorted[0], sorted[sorted.length - 1] || sorted[0] + 1];
}

// Build a proj4 definition for the common CRS we can reproject from. WGS84 UTM
// zones (EPSG 326xx/327xx) and plain lon/lat (4326) cover the realistic cases;
// anything else returns null and footprint validation is skipped gracefully.
function projDefForEpsg(code: number): string | null {
    if (code === 4326) return "EPSG:4326";
    if (code >= 32601 && code <= 32660) return `+proj=utm +zone=${code - 32600} +datum=WGS84 +units=m +no_defs`;
    if (code >= 32701 && code <= 32760) return `+proj=utm +zone=${code - 32700} +south +datum=WGS84 +units=m +no_defs`;
    return null;
}

// First foreground pixel in raster-scan order, or null when the mask is empty.
function findStartPixel(mask: Uint8Array, w: number, h: number): [number, number] | null {
    for (let i = 0; i < w * h; i++) {
        if (mask[i] === 1) return [i % w, Math.floor(i / w)];
    }
    return null;
}

// Moore-neighbour boundary trace of the largest foreground region in a binary
// mask. Returns an ordered, closed list of [col,row] pixels, or null when the
// mask is empty / degenerate.
function traceMaskBoundary(mask: Uint8Array, w: number, h: number): [number, number][] | null {
    const at = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h && mask[y * w + x] === 1;

    const start = findStartPixel(mask, w, h);
    if (!start) return null;
    const [sx, sy] = start;

    // Clockwise 8-neighbour offsets.
    const N: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const contour: [number, number][] = [[sx, sy]];
    let cx = sx, cy = sy;
    let backDir = 4; // came from the west (background to the left)
    const maxSteps = w * h * 4;

    for (let step = 0; step < maxSteps; step++) {
        let found = false;
        // Start searching just clockwise of where we came from.
        for (let i = 0; i < 8; i++) {
            const dir = (backDir + 1 + i) % 8;
            const nx = cx + N[dir][0];
            const ny = cy + N[dir][1];
            if (at(nx, ny)) {
                // Direction we entered the new pixel from = opposite of travel.
                backDir = (dir + 4) % 8;
                cx = nx; cy = ny;
                contour.push([cx, cy]);
                found = true;
                break;
            }
        }
        if (!found) break; // isolated pixel
        if (cx === sx && cy === sy) break; // closed the loop
    }
    return contour.length >= 4 ? contour : null;
}

// Keep at most ~targetPoints, preserving shape, by even decimation.
function decimate(points: [number, number][], targetPoints = 80): [number, number][] {
    if (points.length <= targetPoints) return points;
    const stride = Math.ceil(points.length / targetPoints);
    const out: [number, number][] = [];
    for (let i = 0; i < points.length; i += stride) out.push(points[i]);
    return out;
}

// Paint the downsampled elevation band to an RGBA canvas with the elevation
// ramp (nodata → transparent) and return a PNG data URL. Row 0 = top, matching
// an ImageStatic extent whose top edge is maxY.
function renderElevationImage(band: ArrayLike<number>, mask: Uint8Array, w: number, h: number): string | null {
    const values: number[] = [];
    for (let i = 0; i < w * h; i++) if (mask[i] === 1) values.push(band[i]);
    if (values.length === 0) return null;
    const [lo, hi] = contrastRange(values);
    const span = hi - lo || 1;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
        const o = i * 4;
        if (mask[i] !== 1) { img.data[o + 3] = 0; continue; }
        const [r, g, b] = rampColor((band[i] - lo) / span);
        img.data[o] = r;
        img.data[o + 1] = g;
        img.data[o + 2] = b;
        img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
}

/**
 * Read an uploaded DTM once (downsampled) and return everything the map needs:
 * the valid-data outline (lon/lat, for validation) and a colored elevation
 * image georeferenced in EPSG:3857 for an ImageStatic overlay. Falls back
 * gracefully (bbox / no image) for filled grids, unknown CRS, or read failures.
 */
export async function readDtmPreview(file: File): Promise<DtmPreview | null> {
    try {
        const tiff = await fromBlob(file);
        const image = await tiff.getImage();
        const [minX, minY, maxX, maxY] = image.getBoundingBox();
        const keys = (image.getGeoKeys?.() ?? {}) as Record<string, number>;
        const epsg = keys.ProjectedCSTypeGeoKey || keys.GeographicTypeGeoKey;
        const def = epsg ? projDefForEpsg(epsg) : null;
        if (epsg && !def) return null; // unknown CRS — skip preview/validation

        const toWgs = (x: number, y: number): [number, number] =>
            !def || def === "EPSG:4326" ? [x, y] : (proj4(def, "EPSG:4326", [x, y]) as [number, number]);
        const to3857 = (x: number, y: number): [number, number] =>
            proj4(def && def !== "EPSG:4326" ? def : "EPSG:4326", "EPSG:3857", [x, y]) as [number, number];

        const bboxRing = (): DtmFootprintRing => [
            toWgs(minX, minY), toWgs(maxX, minY), toWgs(maxX, maxY), toWgs(minX, maxY), toWgs(minX, minY),
        ];

        // Reproject the native bbox to a 3857 axis-aligned extent for the overlay.
        const c1 = to3857(minX, minY);
        const c2 = to3857(maxX, maxY);
        const imageExtent3857: [number, number, number, number] = [
            Math.min(c1[0], c2[0]), Math.min(c1[1], c2[1]), Math.max(c1[0], c2[0]), Math.max(c1[1], c2[1]),
        ];

        // One downsampled read drives both the colored image and the outline.
        const w = PREVIEW_SIZE;
        const h = Math.max(1, Math.round(PREVIEW_SIZE * (image.getHeight() / image.getWidth())));
        const nodata = image.getGDALNoData();
        const rasters = await image.readRasters({ width: w, height: h, samples: [0], resampleMethod: "nearest" });
        const band = rasters[0] as ArrayLike<number>;

        const mask = new Uint8Array(w * h);
        let valid = 0;
        for (let i = 0; i < w * h; i++) {
            const v = band[i];
            const ok = Number.isFinite(v) && (nodata === null || v !== nodata);
            if (ok) { mask[i] = 1; valid++; }
        }

        const imageDataUrl = valid > 0 ? renderElevationImage(band, mask, w, h) : null;

        // Footprint outline: filled grid (or empty) => bbox; else trace the mask.
        let footprint: DtmFootprintRing;
        if (valid === 0 || valid / (w * h) > 0.985) {
            footprint = bboxRing();
        } else {
            const boundary = traceMaskBoundary(mask, w, h);
            if (boundary) {
                const spanX = maxX - minX, spanY = maxY - minY;
                const ring = decimate(boundary).map(([col, row]) =>
                    toWgs(minX + ((col + 0.5) / w) * spanX, maxY - ((row + 0.5) / h) * spanY),
                );
                ring.push(ring[0]);
                footprint = ring.length >= 4 ? ring : bboxRing();
            } else {
                footprint = bboxRing();
            }
        }

        return { footprint, imageDataUrl, imageExtent3857 };
    } catch {
        return null;
    }
}

/** True when every vertex of the polygon ring lies inside the DTM footprint bbox. */
export function ringWithinFootprint(polygon: [number, number][], footprint: DtmFootprintRing): boolean {
    const xs = footprint.map((p) => p[0]);
    const ys = footprint.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return polygon.every(([x, y]) => x >= minX && x <= maxX && y >= minY && y <= maxY);
}
