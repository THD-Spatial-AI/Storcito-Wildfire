import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, MapPinned } from "lucide-react";
import type Map from "ol/Map";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Text } from "ol/style";
import { useTranslation } from "@/i18n";

import {
    webservicesService,
    type StorcitoCoverageFeatureCollection,
} from "@/features/admin-dashboard";

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
    0%, 100% { box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.15), 0 0 0 rgba(15, 23, 42, 0); }
    50% { box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.3), 0 0 24px rgba(15, 23, 42, 0.14); }
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

const createCoverageStyle = (t: (key: string, data?: any) => string) => new Style({
    fill: new Fill({ color: "rgba(15, 23, 42, 0.10)" }),
    stroke: new Stroke({
        color: "rgba(15, 23, 42, 0.95)",
        width: 2.5,
        lineDash: [10, 6],
    }),
    text: new Text({
        text: t("configurator.coverage.availableData", "Wildfire data available"),
        font: "600 13px Inter, system-ui, sans-serif",
        fill: new Fill({ color: "#0f172a" }),
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
    const { t } = useTranslation();
    const [coverage, setCoverage] = useState<StorcitoCoverageFeatureCollection | null>(null);
    const [error, setError] = useState<string | null>(null);
    const coverageStyle = useMemo(() => createCoverageStyle(t), [t]);

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
                    setError(t("configurator.coverage.unavailable", "Coverage unavailable"));
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
            {coverage && (
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground shadow-lg backdrop-blur-md">
                    <span aria-hidden="true" className="w-5 border-t-2 border-dashed border-foreground/80" />
                    {t("configurator.coverage.legendLine", "Dashed line: available data coverage")}
                </div>
            )}
            <div className="wildfire-coverage-animated hidden lg:block absolute bottom-4 right-4 z-20 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card/95 text-xs text-card-foreground shadow-xl backdrop-blur-md">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent wildfire-coverage-sheen" />
                <div className="flex items-start gap-3 border-b border-border bg-muted/60 px-3.5 py-3">
                    <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted text-foreground overflow-hidden">
                        {coverage && <span className="wildfire-coverage-icon-pulse absolute inset-1 rounded-lg bg-foreground/10" />}
                        {coverage ? <MapPinned className="relative h-5 w-5" /> : <AlertTriangle className="relative h-5 w-5 text-amber-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-semibold leading-tight text-foreground">
                            {coverage ? t("configurator.coverage.title", "Wildfire data coverage") : error}
                        </div>
                        {coverage && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {t("configurator.coverage.exactFootprint", "Exact raster footprint")}
                                </span>
                                {footprintShare && (
                                    <span className="rounded-full border border-border bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        {t("configurator.coverage.mainFootprint", { percent: parseInt(footprintShare) || 0, defaultValue: footprintShare })}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {coverage && (
                    <div className="grid grid-cols-[104px_1fr] gap-3 px-3.5 py-3">
                        {/* Light in both themes. */}
                        <div className="relative h-[104px] overflow-hidden rounded-xl border border-border bg-slate-100 wildfire-coverage-glow">
                            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.25)_1px,transparent_1px)] [background-size:16px_16px]" />
                            <div
                                className="absolute inset-3 overflow-hidden bg-slate-900/20"
                                style={{ clipPath: FOOTPRINT_CLIP_PATH }}
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_22%,rgba(255,255,255,0.42),transparent_28%),radial-gradient(circle_at_70%_68%,rgba(15,23,42,0.25),transparent_35%)]" />
                                <div className="wildfire-coverage-scan absolute -left-12 top-0 h-full w-12 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                            </div>
                            <svg className="pointer-events-none absolute inset-3" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                                <polygon
                                    className="wildfire-coverage-dash"
                                    points={FOOTPRINT_POINTS}
                                    fill="transparent"
                                    stroke="rgba(15,23,42,0.92)"
                                    strokeWidth="3"
                                    strokeDasharray="7 5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>
                            <div className="absolute left-8 top-7 h-4 w-7 rounded-md border border-white/80 bg-white/95 shadow-sm" />
                            <div className="absolute bottom-7 right-5 h-5 w-8 rounded-md border border-white/80 bg-white/95 shadow-sm" />
                            <span className="absolute left-3 top-3 h-2 w-2 rounded-full bg-slate-900 shadow-[0_0_0_4px_rgba(15,23,42,0.15)]" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-semibold text-muted-foreground">
                                <span>{t("configurator.coverage.data", "Data")}</span>
                                <span className="text-muted-foreground/80">{t("configurator.coverage.noData", "No data")}</span>
                            </div>
                        </div>

                        <div className="space-y-2.5 text-[11px] leading-snug">
                            <div className="flex gap-2">
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                                <div>
                                    <div className="font-medium text-foreground">{t("configurator.coverage.useShaded", "Use shaded areas")}</div>
                                    <div className="text-muted-foreground">
                                        {dateRange ? t("configurator.coverage.requiredAvailableDates", `Required wildfire inputs are available for ${dateRange}.`, { dates: dateRange }) : t("configurator.coverage.requiredAvailable", "Required wildfire inputs are available.")}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <div>
                                    <div className="font-medium text-foreground">{t("configurator.coverage.avoidBlank", "Avoid blank gaps")}</div>
                                    <div className="text-muted-foreground">
                                        {t("configurator.coverage.blankDesc", "Blank areas have no valid source raster data for calculation.")}
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
