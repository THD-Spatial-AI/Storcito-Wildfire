import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { Plus, Minus } from "lucide-react";

interface CesiumWildfire3DViewProps {
  /** Workspace-scoped WMS endpoint (the same one the 2D viewer drapes). */
  wmsUrl: string;
  /** GeoServer layer name to drape on the terrain (swapped by the day player). */
  layerName: string;
  /** Model AOI as a GeoJSON geometry / Feature (EPSG:4326). */
  aoi?: unknown;
  /** Which risk levels (1–5) are visible — mirrors the shared 2D legend. */
  visibleRiskLevels?: Record<number, boolean>;
  /** Show the transparent roads reference above the risk drape. */
  roadsVisible?: boolean;
  /** Show the places/labels reference above the risk drape. */
  labelsVisible?: boolean;
}

// Transparent-background Esri reference overlays (built for draping over
// imagery: bold casings, no landuse fill) — kept above the risk layers so
// infrastructure stays readable through the drape.
const ESRI_TRANSPORTATION_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
const ESRI_PLACES_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
// Slightly dim the risk drape while roads are shown so casings read clearly.
const DRAPE_ALPHA_WITH_ROADS = 0.8;

// Same per-level GeoServer styles the 2D viewer uses, so the legend's level
// checkboxes control the 3D drape identically.
const RISK_LEVEL_STYLES: Record<number, string> = {
  1: "fire_risk_level_1",
  2: "fire_risk_level_2",
  3: "fire_risk_level_3",
  4: "fire_risk_level_4",
  5: "fire_risk_level_5",
};

// Self-hosted quantized-mesh terrain URL (license-clean for EU/funded projects —
// CesiumJS is Apache-2.0; we deliberately avoid Cesium ion's hosted terrain).
// When unset, the view uses the smooth ellipsoid (still a 3D perspective).
const TERRAIN_URL = import.meta.env.VITE_CESIUM_TERRAIN_URL as string | undefined;

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
  if (obj.type === "FeatureCollection")
    (obj.features as unknown[])?.forEach((f) => collectCoords(f, out));
  else if (obj.type === "Feature") collectCoords(obj.geometry, out);
  else if (obj.coordinates) collectCoords(obj.coordinates, out);
}

function aoiRectangle(aoi: unknown): Cesium.Rectangle | null {
  const coords: number[][] = [];
  collectCoords(aoi, coords);
  if (coords.length === 0) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return Cesium.Rectangle.fromDegrees(minX, minY, maxX, maxY);
}

/**
 * 3D terrain view rendered INSIDE the map container, underneath the shared 2D
 * overlays (legend, overlays panel, day player all sit at higher z-index), so
 * switching to 3D keeps the exact same page layout.
 */
export const CesiumWildfire3DView = ({
  wmsUrl,
  layerName,
  aoi,
  visibleRiskLevels,
  roadsVisible = true,
  labelsVisible = false,
}: CesiumWildfire3DViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const riskLayersRef = useRef<{ level: number; layer: Cesium.ImageryLayer }[]>([]);
  const removalTimersRef = useRef<number[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  // Latest drape target / level visibility — read by init() in case viewer
  // creation is deferred until the container has a size.
  const drapeRef = useRef({ wmsUrl, layerName });
  drapeRef.current = { wmsUrl, layerName };
  const aoiRectRef = useRef<Cesium.Rectangle | null>(null);
  {
    const r = aoiRectangle(aoi);
    if (r) {
      const padLon = Math.max((r.east - r.west) * 0.3, Cesium.Math.toRadians(0.05));
      const padLat = Math.max((r.north - r.south) * 0.3, Cesium.Math.toRadians(0.05));
      aoiRectRef.current = new Cesium.Rectangle(
        r.west - padLon,
        r.south - padLat,
        r.east + padLon,
        r.north + padLat
      );
    }
  }
  const visibleLevelsRef = useRef(visibleRiskLevels);
  visibleLevelsRef.current = visibleRiskLevels;
  const roadsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const labelsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const roadsVisibleRef = useRef(roadsVisible);
  roadsVisibleRef.current = roadsVisible;
  const labelsVisibleRef = useRef(labelsVisible);
  labelsVisibleRef.current = labelsVisible;

  const applyDrape = (viewer: Cesium.Viewer) => {
    if (viewer.isDestroyed()) return;
    const previous = riskLayersRef.current;
    riskLayersRef.current = Object.entries(RISK_LEVEL_STYLES).map(([levelKey, style]) => {
      const level = Number(levelKey);
      const layer = viewer.imageryLayers.addImageryProvider(
        new Cesium.WebMapServiceImageryProvider({
          url: drapeRef.current.wmsUrl,
          layers: drapeRef.current.layerName,
          parameters: { transparent: true, format: "image/png", styles: style },
          ...(aoiRectRef.current ? { rectangle: aoiRectRef.current } : {}),
        })
      );
      layer.show = visibleLevelsRef.current?.[level] ?? true;
      layer.alpha = roadsVisibleRef.current ? DRAPE_ALPHA_WITH_ROADS : 1.0;
      return { level, layer };
    });
    if (roadsLayerRef.current) viewer.imageryLayers.raiseToTop(roadsLayerRef.current);
    if (labelsLayerRef.current) viewer.imageryLayers.raiseToTop(labelsLayerRef.current);
    if (previous.length > 0) {
      const timer = window.setTimeout(() => {
        if (!viewer.isDestroyed()) {
          previous.forEach(({ layer }) => viewer.imageryLayers.remove(layer, true));
        }
      }, 1500);
      removalTimersRef.current.push(timer);
    }
  };

  // Create the viewer once (waiting for the container to have a size — a
  // zero-size canvas renders permanently blank).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let ro: ResizeObserver | null = null;

    const init = () => {
      if (disposed || viewerRef.current) return;
      try {
        initInner();
        const canvas = container.querySelector("canvas");
        console.info(
          `[Cesium3D] initialized — container ${container.clientWidth}x${container.clientHeight}, canvas ${canvas?.width ?? 0}x${canvas?.height ?? 0}`
        );
      } catch (e) {
        console.error("[Cesium3D] viewer creation failed", e);
        setInitError(e instanceof Error ? e.message : String(e));
      }
    };

    const initInner = () => {
      const terrain = TERRAIN_URL
        ? new Cesium.Terrain(
            Cesium.CesiumTerrainProvider.fromUrl(TERRAIN_URL, { requestVertexNormals: true })
          )
        : undefined;
      terrain?.errorEvent.addEventListener((error) => {
        console.warn(
          `[Cesium3D] terrain failed to load from ${TERRAIN_URL}; falling back to flat ellipsoid`,
          error
        );
      });

      // CARTO raster base (keyless, reliable) so we never depend on Ion imagery.
      const baseLayer = new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
          url: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
          credit: "© OpenStreetMap contributors, © CARTO",
        })
      );

      const viewer = new Cesium.Viewer(container, {
        baseLayer,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        terrain,
      });
      viewerRef.current = viewer;
      viewer.scene.globe.depthTestAgainstTerrain = true;

      if (TERRAIN_URL) {
        viewer.scene.verticalExaggeration = 2.5;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.light = new Cesium.DirectionalLight({
          direction: new Cesium.Cartesian3(0.35, -0.5, -0.8),
          intensity: 2.0,
        });
      }

      const cam = viewer.scene.screenSpaceCameraController;
      cam.rotateEventTypes = [Cesium.CameraEventType.LEFT_DRAG];
      cam.tiltEventTypes = [
        Cesium.CameraEventType.RIGHT_DRAG,
        Cesium.CameraEventType.MIDDLE_DRAG,
        {
          eventType: Cesium.CameraEventType.LEFT_DRAG,
          modifier: Cesium.KeyboardEventModifier.CTRL,
        },
      ];
      cam.zoomEventTypes = [Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH];

      applyDrape(viewer);

      // Transparent Esri reference overlays above the drape.
      roadsLayerRef.current = viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: ESRI_TRANSPORTATION_URL,
          credit: "Esri, HERE, Garmin",
        })
      );
      roadsLayerRef.current.show = roadsVisibleRef.current;
      labelsLayerRef.current = viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: ESRI_PLACES_URL,
          credit: "Esri, HERE, Garmin",
        })
      );
      labelsLayerRef.current.show = labelsVisibleRef.current;

      // Open centered on the AOI at a tilted angle: viewBoundingSphere frames
      // the target for the given pitch/range (a hand-computed flyTo destination
      // left the AOI at the bottom of the screen).
      const rectangle = aoiRectangle(aoi);
      if (rectangle) {
        const sphere = Cesium.BoundingSphere.fromRectangle3D(rectangle);
        viewer.camera.viewBoundingSphere(
          sphere,
          new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-40), sphere.radius * 2.6)
        );
        // Release the lookAt transform so mouse navigation is free again.
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      }
    };

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      init();
    } else {
      ro = new ResizeObserver(() => {
        const r = container.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          ro?.disconnect();
          ro = null;
          init();
        }
      });
      ro.observe(container);
    }

    return () => {
      disposed = true;
      ro?.disconnect();
      removalTimersRef.current.forEach((id) => clearTimeout(id));
      removalTimersRef.current = [];
      const viewer = viewerRef.current;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
      riskLayersRef.current = [];
      roadsLayerRef.current = null;
      labelsLayerRef.current = null;
    };
  }, []);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) applyDrape(viewer);
    // applyDrape reads drapeRef, which already holds the latest props.
  }, [wmsUrl, layerName]);

  // Mirror the legend's level checkboxes onto the per-level drape layers.
  useEffect(() => {
    riskLayersRef.current.forEach(({ level, layer }) => {
      layer.show = visibleRiskLevels?.[level] ?? true;
    });
  }, [visibleRiskLevels]);

  // Mirror the Overlays panel's Roads/Labels toggles; dim the drape while
  // roads are shown so the casings stay readable.
  useEffect(() => {
    if (roadsLayerRef.current) roadsLayerRef.current.show = roadsVisible;
    if (labelsLayerRef.current) labelsLayerRef.current.show = labelsVisible;
    riskLayersRef.current.forEach(({ layer }) => {
      layer.alpha = roadsVisible ? DRAPE_ALPHA_WITH_ROADS : 1.0;
    });
  }, [roadsVisible, labelsVisible]);

  const zoom = (factor: number) => {
    const v = viewerRef.current;
    if (!v) return;
    const h = v.camera.positionCartographic.height;
    v.camera.zoomIn(h * factor);
  };

  return (
    <div className="absolute inset-0 z-[5]" style={{ background: "#dfe7ee" }}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {initError && (
        <div className="absolute left-1/2 top-1/2 z-[6] w-[420px] max-w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-red-200 bg-white/95 p-4 text-center shadow-lg">
          <p className="text-sm font-semibold text-red-700">3D view failed to start</p>
          <p className="mt-1 break-words text-xs text-slate-600">{initError}</p>
        </div>
      )}

      {/* Zoom controls for the 3D camera (the 2D map controls underneath
                target the hidden OpenLayers view, so cover that spot). */}
      <div
        className="absolute z-[6] flex flex-col overflow-hidden rounded-lg border border-border bg-white/95 shadow-lg backdrop-blur"
        style={{ top: "3.5rem", right: "calc(1rem + var(--sidebar-offset, 0rem))" }}
      >
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoom(0.4)}
          className="flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoom(-0.6)}
          className="flex h-9 w-9 items-center justify-center border-t border-border text-slate-700 hover:bg-slate-100"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
