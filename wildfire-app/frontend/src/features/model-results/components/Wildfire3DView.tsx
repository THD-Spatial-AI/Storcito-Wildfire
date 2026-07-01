import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Mountain, X } from "lucide-react";
import { BASE_STYLE_VOYAGER } from "@/components/map-controls/maplibre/maplibre-styles";

interface Wildfire3DViewProps {
    /** Workspace-scoped WMS endpoint (the same one the 2D viewer drapes). */
    wmsUrl: string;
    /** GeoServer layer name to drape on the terrain. */
    layerName: string;
    /** Model AOI as a GeoJSON geometry / Feature (EPSG:4326). */
    aoi?: unknown;
    /** Element to overlay (the map area) — the 3D view is positioned over its rect. */
    anchorEl?: HTMLElement | null;
    /** Px to trim off the right of the overlay so the assessment sidebar stays visible. */
    rightInset?: number;
    onClose: () => void;
}

// Free, keyless global terrain (Mapzen/AWS "terrarium" encoded DEM).
const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

// Walk any GeoJSON node and collect [lon,lat] positions to compute a bbox.
function collectCoords(node: unknown, out: number[][]): void {
    if (!node) return;
    if (Array.isArray(node)) {
        if (typeof node[0] === "number" && typeof node[1] === "number") {
            out.push(node as number[]);
            return;
        }
        node.forEach((n) => collectCoords(n, out));
        return;
    }
    const obj = node as Record<string, unknown>;
    if (obj.type === "FeatureCollection") (obj.features as unknown[])?.forEach((f) => collectCoords(f, out));
    else if (obj.type === "Feature") collectCoords(obj.geometry, out);
    else if (obj.coordinates) collectCoords(obj.coordinates, out);
}

function aoiBounds(aoi: unknown): maplibregl.LngLatBoundsLike | null {
    const coords: number[][] = [];
    collectCoords(aoi, coords);
    if (coords.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of coords) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return [[minX, minY], [maxX, maxY]];
}

export const Wildfire3DView = ({ wmsUrl, layerName, aoi, anchorEl, rightInset = 0, onClose }: Wildfire3DViewProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    // Track the map area's on-screen rect so the body-portal overlays exactly it
    // (keeps the top toolbar + right sidebar visible). Falls back to full screen.
    const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

    useEffect(() => {
        if (!anchorEl) return;
        const update = () => {
            const r = anchorEl.getBoundingClientRect();
            setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(anchorEl);
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, [anchorEl]);

    useEffect(() => {
        if (!containerRef.current) return;

        const wmsTiles =
            `${wmsUrl}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${encodeURIComponent(layerName)}` +
            `&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`;

        const aoiFeature = aoi
            ? { type: "Feature" as const, properties: {}, geometry: aoi as GeoJSON.Geometry }
            : null;

        let cancelled = false;
        let map: maplibregl.Map | null = null;
        let retryId: number | null = null;
        let ro: ResizeObserver | null = null;

        // Mirror MapLibreOverlay: don't create the map until the container has a
        // real size, otherwise the canvas inits at 0×0 and stays blank (this is
        // why full-screen worked but the in-layout container did not).
        const tryInit = () => {
            const container = containerRef.current;
            if (!container || cancelled || map) return;
            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                retryId = window.setTimeout(tryInit, 200);
                return;
            }
            initMap(container);
        };

        const initMap = (container: HTMLDivElement) => {
            map = new maplibregl.Map({
                container,
                style: BASE_STYLE_VOYAGER,
                center: [-8.0, 42.5],
                zoom: 11,
                pitch: 62,
                bearing: -20,
                maxPitch: 85,
                attributionControl: false,
            });
            const m = map;

            m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
            m.on("error", (e) => console.warn("[Wildfire3DView] map error", e?.error ?? e));

            m.on("load", () => {
                try {
                    m.addSource("terrain-dem", { type: "raster-dem", tiles: [TERRAIN_TILES], encoding: "terrarium", tileSize: 256, maxzoom: 15 });
                    m.addSource("hillshade-dem", { type: "raster-dem", tiles: [TERRAIN_TILES], encoding: "terrarium", tileSize: 256, maxzoom: 15 });
                    m.addLayer({ id: "hillshade", type: "hillshade", source: "hillshade-dem", paint: { "hillshade-exaggeration": 0.5 } });
                    m.addSource("risk", { type: "raster", tiles: [wmsTiles], tileSize: 256 });
                    m.addLayer({ id: "risk", type: "raster", source: "risk", paint: { "raster-opacity": 0.8 } });
                    if (aoiFeature) {
                        m.addSource("aoi", { type: "geojson", data: aoiFeature });
                        m.addLayer({ id: "aoi-line", type: "line", source: "aoi", paint: { "line-color": "#0f172a", "line-width": 2 } });
                    }
                    m.setTerrain({ source: "terrain-dem", exaggeration: 1.6 });
                    m.setSky?.({ "sky-color": "#9cc3e6", "horizon-color": "#e6eef5", "fog-color": "#ffffff", "fog-ground-blend": 0.4 });
                    const b = aoiBounds(aoi);
                    if (b) m.fitBounds(b, { padding: 80, pitch: 62, bearing: -20, duration: 0, maxZoom: 15 });
                } catch (e) {
                    console.warn("[Wildfire3DView] setup error", e);
                }
                m.resize();
            });

            ro = new ResizeObserver(() => m.resize());
            ro.observe(container);
        };

        const raf = requestAnimationFrame(tryInit);

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            if (retryId !== null) clearTimeout(retryId);
            ro?.disconnect();
            map?.remove();
        };
    }, [wmsUrl, layerName, aoi]);

    // Full-screen via a portal to <body>: embedding a 2nd MapLibre map inside
    // the OpenLayers map area renders blank (stacking/WebGL conflicts), but
    // full-screen renders reliably.
    const frame: React.CSSProperties = rect
        ? { position: "fixed", top: rect.top, left: rect.left, width: Math.max(0, rect.width - rightInset), height: rect.height, zIndex: 3000, background: "#dfe7ee" }
        : { position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 3000, background: "#dfe7ee" };

    return createPortal(
        <div style={frame}>
            <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            <div className="absolute left-1/2 top-3 -translate-x-1/2 z-[3001] flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur">
                <Mountain className="h-4 w-4 text-emerald-600" /> 3D terrain view
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close 3D view"
                className="absolute right-3 top-3 z-[3001] flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg backdrop-blur hover:bg-white"
            >
                <X className="h-5 w-5" />
            </button>
        </div>,
        document.body,
    );
};
