import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, MapPinned } from "lucide-react";
import type Map from "ol/Map";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Text } from "ol/style";

import {
    webservicesService,
    type StorcitoCoverageFeatureCollection,
} from "@/features/admin-dashboard/services/webservices";

interface StorcitoCoverageOverlayProps {
    map: Map | null;
}

const COVERAGE_LAYER_Z_INDEX = 2000;
const FOOTPRINT_CLIP_PATH = "polygon(8% 14%, 70% 8%, 92% 28%, 83% 75%, 55% 88%, 18% 78%, 4% 46%)";
const FOOTPRINT_POINTS = "8,14 70,8 92,28 83,75 55,88 18,78 4,46";

const COVERAGE_CARD_ANIMATION_CSS = `
@keyframes wildfireCoverageIconPulse {
    0%, 100% { opacity: 0.22; transform: scale(0.92); }
    50% { opacity: 0.55; transform: scale(1.12); }
}

@keyframes wildfireCoverageScan {
    0% { transform: translateX(-130%) skewX(-14deg); opacity: 0; }
    18% { opacity: 0.85; }
    58% { opacity: 0.85; }
    100% { transform: translateX(250%) skewX(-14deg); opacity: 0; }
}

@keyframes wildfireCoverageDash {
    to { stroke-dashoffset: -48; }
}

@keyframes wildfireCoverageGlow {
    0%, 100% { box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.18), 0 0 0 rgba(20, 184, 166, 0); }
    50% { box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.34), 0 0 24px rgba(20, 184, 166, 0.18); }
}

@keyframes wildfireCoverageSheen {
    0% { transform: translateX(-100%); opacity: 0; }
    35% { opacity: 0.8; }
    100% { transform: translateX(100%); opacity: 0; }
}

.wildfire-coverage-icon-pulse { animation: wildfireCoverageIconPulse 2.8s ease-in-out infinite; }
.wildfire-coverage-scan { animation: wildfireCoverageScan 3.6s ease-in-out infinite; }
.wildfire-coverage-dash { animation: wildfireCoverageDash 9s linear infinite; }
.wildfire-coverage-glow { animation: wildfireCoverageGlow 3.4s ease-in-out infinite; }
.wildfire-coverage-sheen { animation: wildfireCoverageSheen 4.6s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
    .wildfire-coverage-animated .wildfire-coverage-icon-pulse,
    .wildfire-coverage-animated .wildfire-coverage-scan,
    .wildfire-coverage-animated .wildfire-coverage-dash,
    .wildfire-coverage-animated .wildfire-coverage-glow,
    .wildfire-coverage-animated .wildfire-coverage-sheen {
        animation: none;
    }
}
`;

const createCoverageStyle = () => new Style({
    fill: new Fill({ color: "rgba(20, 184, 166, 0.12)" }),
    stroke: new Stroke({
        color: "rgba(13, 148, 136, 0.95)",
        width: 2.5,
        lineDash: [10, 6],
    }),
    text: new Text({
        text: "Wildfire data available",
        font: "600 13px Inter, system-ui, sans-serif",
        fill: new Fill({ color: "#0f766e" }),
        stroke: new Stroke({ color: "rgba(255,255,255,0.92)", width: 4 }),
        overflow: true,
    }),
});

function getCoverageDates(coverage: StorcitoCoverageFeatureCollection | null) {
    const properties = coverage?.features?.[0]?.properties;
    const from = typeof properties?.date_from === "string" ? properties.date_from : undefined;
    const to = typeof properties?.date_to === "string" ? properties.date_to : undefined;
    if (from && to && from !== to) return `${from} to ${to}`;
    return from ?? to;
}

function getMainFootprintShare(coverage: StorcitoCoverageFeatureCollection | null) {
    const properties = coverage?.features?.[0]?.properties;
    const value = properties?.selected_component_area_fraction;
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return `${Math.round(value * 100)}% main footprint`;
}

export const StorcitoCoverageOverlay = ({ map }: StorcitoCoverageOverlayProps) => {
    const [coverage, setCoverage] = useState<StorcitoCoverageFeatureCollection | null>(null);
    const [error, setError] = useState<string | null>(null);
    const coverageStyle = useMemo(() => createCoverageStyle(), []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await webservicesService.getAvailableDataCoverage();
                if (!cancelled) {
                    setCoverage(data);
                    setError(null);
                }
            } catch {
                if (!cancelled) {
                    setCoverage(null);
                    setError("Coverage unavailable");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!map || !coverage || coverage.features.length === 0) return;

        const features = new GeoJSON().readFeatures(coverage, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
        });
        if (features.length === 0) return;

        const layer = new VectorLayer({
            source: new VectorSource({ features, wrapX: false }),
            style: coverageStyle,
            className: "ol-layer storcito-coverage-layer ol-visible-in-maplibre",
            declutter: true,
            zIndex: COVERAGE_LAYER_Z_INDEX,
        });
        layer.set("storcitoCoverage", true);
        map.addLayer(layer);

        return () => {
            map.removeLayer(layer);
        };
    }, [coverage, coverageStyle, map]);

    const dateRange = getCoverageDates(coverage);
    const footprintShare = getMainFootprintShare(coverage);

    if (!coverage && !error) return null;

    return (
        <>
            <style>{COVERAGE_CARD_ANIMATION_CSS}</style>
            <div className="wildfire-coverage-animated hidden lg:block absolute bottom-4 right-4 z-20 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-teal-500/25 bg-white/95 text-xs text-slate-950 shadow-2xl shadow-black/10 backdrop-blur-md">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/80 to-transparent wildfire-coverage-sheen" />
                <div className="flex items-start gap-3 border-b border-teal-500/15 bg-teal-50/90 px-3.5 py-3">
                    <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-500/25 bg-teal-500/12 text-teal-700 overflow-hidden">
                        {coverage && <span className="wildfire-coverage-icon-pulse absolute inset-1 rounded-lg bg-teal-400/35" />}
                        {coverage ? <MapPinned className="relative h-5 w-5" /> : <AlertTriangle className="relative h-5 w-5 text-amber-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-semibold leading-tight text-slate-950">
                            {coverage ? "Wildfire data coverage" : error}
                        </div>
                        {coverage && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                                    Exact raster footprint
                                </span>
                                {footprintShare && (
                                    <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                        {footprintShare}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {coverage && (
                    <div className="grid grid-cols-[104px_1fr] gap-3 px-3.5 py-3">
                        <div className="relative h-[104px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 wildfire-coverage-glow">
                            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.25)_1px,transparent_1px)] [background-size:16px_16px]" />
                            <div
                                className="absolute inset-3 overflow-hidden bg-teal-500/28"
                                style={{ clipPath: FOOTPRINT_CLIP_PATH }}
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_22%,rgba(255,255,255,0.42),transparent_28%),radial-gradient(circle_at_70%_68%,rgba(13,148,136,0.28),transparent_35%)]" />
                                <div className="wildfire-coverage-scan absolute -left-12 top-0 h-full w-12 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                            </div>
                            <svg className="pointer-events-none absolute inset-3" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                                <polygon
                                    className="wildfire-coverage-dash"
                                    points={FOOTPRINT_POINTS}
                                    fill="transparent"
                                    stroke="rgba(15,118,110,0.96)"
                                    strokeWidth="3"
                                    strokeDasharray="7 5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>
                            <div className="absolute left-8 top-7 h-4 w-7 rounded-md border border-white/80 bg-white/95 shadow-sm" />
                            <div className="absolute bottom-7 right-5 h-5 w-8 rounded-md border border-white/80 bg-white/95 shadow-sm" />
                            <span className="absolute left-3 top-3 h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,0.18)]" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-semibold text-teal-800">
                                <span>Data</span>
                                <span className="text-slate-600">No data</span>
                            </div>
                        </div>

                        <div className="space-y-2.5 text-[11px] leading-snug">
                            <div className="flex gap-2">
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                                <div>
                                    <div className="font-medium text-slate-950">Use teal areas</div>
                                    <div className="text-slate-600">
                                        Required wildfire inputs are available{dateRange ? ` for ${dateRange}` : ""}.
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <div>
                                    <div className="font-medium text-slate-950">Avoid blank gaps</div>
                                    <div className="text-slate-600">
                                        Blank areas have no valid source raster data for calculation.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
