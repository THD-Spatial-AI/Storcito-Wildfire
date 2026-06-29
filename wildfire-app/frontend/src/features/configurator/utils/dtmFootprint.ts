import { fromBlob } from "geotiff";
import proj4 from "proj4";

// A closed lon/lat ring (EPSG:4326) describing an uploaded DTM's coverage.
export type DtmFootprintRing = [number, number][];

// Downsample target for the valid-data mask read (keeps the 430 MB on disk).
const MASK_SIZE = 256;

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

/**
 * Read an uploaded DTM and return its actual valid-data coverage as a lon/lat
 * ring. A downsampled mask (≈256 px) is read to trace the real data outline
 * (excluding nodata); falls back to the bounding box when the raster is a
 * filled grid, the CRS is unknown, or tracing fails. Returns null when the
 * file/CRS can't be interpreted at all.
 */
export async function readDtmFootprint(file: File): Promise<DtmFootprintRing | null> {
    try {
        const tiff = await fromBlob(file);
        const image = await tiff.getImage();
        const [minX, minY, maxX, maxY] = image.getBoundingBox();
        const keys = (image.getGeoKeys?.() ?? {}) as Record<string, number>;
        const epsg = keys.ProjectedCSTypeGeoKey || keys.GeographicTypeGeoKey;
        const def = epsg ? projDefForEpsg(epsg) : null;
        if (epsg && !def) return null; // unknown CRS — skip validation

        const toWgs = (x: number, y: number): [number, number] =>
            !def || def === "EPSG:4326" ? [x, y] : (proj4(def, "EPSG:4326", [x, y]) as [number, number]);

        const bboxRing = (): DtmFootprintRing => [
            toWgs(minX, minY), toWgs(maxX, minY), toWgs(maxX, maxY), toWgs(minX, maxY), toWgs(minX, minY),
        ];

        // Read a small overview to find the valid-data mask.
        const w = MASK_SIZE;
        const h = Math.max(1, Math.round(MASK_SIZE * (image.getHeight() / image.getWidth())));
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
        if (valid === 0) return bboxRing();
        // Filled grid (almost all valid) — the rectangle is the real boundary.
        if (valid / (w * h) > 0.985) return bboxRing();

        const boundary = traceMaskBoundary(mask, w, h);
        if (!boundary) return bboxRing();

        // Pixel (col,row) -> native CRS (pixel centre) -> WGS84.
        const spanX = maxX - minX, spanY = maxY - minY;
        const ring = decimate(boundary).map(([col, row]) =>
            toWgs(minX + ((col + 0.5) / w) * spanX, maxY - ((row + 0.5) / h) * spanY),
        );
        if (ring.length < 4) return bboxRing();
        ring.push(ring[0]); // close it
        return ring;
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
