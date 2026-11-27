import { useEffect, useState, useCallback } from "react";
import { useMapStore } from "@/features/interactive-map/store/map-store";
import { useMapProvider } from "@/providers/map-context";
import { useAuth } from "@/providers/auth-provider";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { initializeMap } from "@/features/interactive-map/utils/mapUtils";
import { cn } from "@/lib/utils";
import { PrivacyConsentDialog, PrivacyBanner } from "@/features/privacy-controls";
import { CopyrightFooter } from "@/components/app-layout/CopyrightFooter";
import { MapControls } from "@/components/map-controls/MapControls";
import { BookmarkMenu } from "@/features/interactive-map/components/BookmarkMenu";
import MapSearchBar from "./MapSearchBar";
import { useMapKeyboardShortcuts } from "./useMapKeyboardShortcuts";
import { MapShortcutsPanel } from "@/components/map-controls/MapShortcutsPanel";
import { RISK_LEVELS } from "@/features/model-results/viewer-config";
import { settingsService } from "@/features/settings";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";
import { toLonLat, fromLonLat } from "ol/proj";
import { useMapPageLayers } from "./useMapPageLayers";
import { useMapPageOLLayers } from "./useMapPageOLLayers";
import { motionMs } from "@/lib/motion";

const PRIVACY_ACCEPTED_EVENT = "privacy-accepted";

export const MapComponent: React.FC = () => {
  useDocumentTitle("Interactive Map");
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { mapRef, initMapInstance, clearDrawingLayers, zoomIn, zoomOut, centerMap } =
    useMapProvider();
  const { isLoading: authLoading, user } = useAuth();
  const [muted, setMuted] = useState<boolean>(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState<boolean>(false);
  const [mapAccepted, setMapAccepted] = useState<boolean>(false);
  const [isCheckingPrivacy, setIsCheckingPrivacy] = useState<boolean>(true); // add loading state
  const { map } = useMapStore();

  // fetch map layers
  const mapPageLayers = useMapPageLayers(user?.id);
  const [riskOpacity, setRiskOpacity] = useState(1);
  const { resolvedTheme } = useTheme();
  const newModelLabel = t("model.newModel");
  const openNewModel = useCallback(() => navigate("/app/model-dashboard/new-model"), [navigate]);
  useMapKeyboardShortcuts(map, { onNewModel: user ? openNewModel : undefined });

  // first feature properties
  const latestProps = mapPageLayers.userModelGeoJSON?.features?.[0]?.properties;
  const latestModel = latestProps && typeof latestProps.model_id === "number"
    ? {
        id: latestProps.model_id as number,
        title: String(latestProps.title ?? ""),
        status: latestProps.status as string | undefined,
        region: typeof latestProps.region === "string" ? latestProps.region : "",
        createdAt: typeof latestProps.created_at === "string" ? latestProps.created_at : "",
      }
    : null;

  const handleModelClick = useCallback(
    (modelId: number, status?: string) => {
      if (status === "completed" || status === "published") {
        navigate(`/app/model-results/${modelId}`);
      } else {
        navigate(`/app/model-dashboard/edit/${modelId}`);
      }
    },
    [navigate]
  );

  // boundary model layers
  useMapPageOLLayers({
    map,
    availableBoundaryGeoJSON: mapPageLayers.availableBoundaryGeoJSON,
    userModelGeoJSON: mapPageLayers.userModelGeoJSON,
    riskLayer: mapPageLayers.riskLayer,
    riskOpacity,
    dark: resolvedTheme === "dark",
    onModelClick: handleModelClick,
  });

  const getCurrentView = useCallback(() => {
    if (!map) return { latitude: 42.8, longitude: -8.5, zoom: 8 };
    const view = map.getView();
    const center = view.getCenter();
    if (!center) return { latitude: 42.8, longitude: -8.5, zoom: 8 };
    const [lon, lat] = toLonLat(center);
    return { latitude: lat, longitude: lon, zoom: view.getZoom() ?? 12 };
  }, [map]);

  const flyTo = useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      if (!map) return;
      const view = map.getView();
      view.animate({
        center: fromLonLat([longitude, latitude]),
        zoom,
        duration: motionMs(800),
      });
    },
    [map]
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    // cache first verify
    const checkPrivacy = async () => {
      setIsCheckingPrivacy(true);

      // instant local read
      const localPrivacy = localStorage.getItem("privacy_accepted");

      if (!user) {
        // guests local only
        const accepted = localPrivacy === "true";
        setMapAccepted(accepted);
        setIsCheckingPrivacy(false);
        return;
      }

      // local first sync
      if (localPrivacy === "true") {
        setMapAccepted(true);
        setIsCheckingPrivacy(false);

        // background verify
        void settingsService.getPrivacyAccepted().then((dbAccepted) => {
          if (dbAccepted === null) return; // keep cache
          setMapAccepted(dbAccepted);
          localStorage.setItem("privacy_accepted", String(dbAccepted));
        });
        return;
      }

      // no cache ask
      const dbAccepted = await settingsService.getPrivacyAccepted();
      const accepted = dbAccepted === true;
      setMapAccepted(accepted);
      localStorage.setItem("privacy_accepted", String(accepted));
      setIsCheckingPrivacy(false);
    };

    checkPrivacy();
  }, [user]); // re-check user changes

  const handleAcceptPrivacy = async () => {
    // instant feedback
    setMapAccepted(true);
    setShowPrivacyDialog(false);

    // persist locally
    localStorage.setItem("privacy_accepted", "true");

    // persist for users
    if (user) {
      try {
        await settingsService.setPrivacyAccepted(true);
        // await save first
        setTimeout(() => {
          globalThis.dispatchEvent(new CustomEvent(PRIVACY_ACCEPTED_EVENT));
        }, 500);
      } catch {
        // dispatch regardless
        settingsService.invalidateCache();
        globalThis.dispatchEvent(new CustomEvent(PRIVACY_ACCEPTED_EVENT));
      }
    } else {
      // guests dispatch now
      globalThis.dispatchEvent(new CustomEvent(PRIVACY_ACCEPTED_EVENT));
    }
  };

  const handleDenyPrivacy = async () => {
    // persist denial
    if (user) {
      try {
        await settingsService.setPrivacyAccepted(false);
      } catch {
        // ignore
      }
    }

    setShowPrivacyDialog(false);
    setMapAccepted(false);

    // update localstorage
    localStorage.setItem("privacy_accepted", "false");
  };

  const handleOpenPrivacyDialog = () => {
    setShowPrivacyDialog(true);
  };

  const handleClosePrivacyDialog = () => {
    setShowPrivacyDialog(false);
  };

  useEffect(() => {
    // needs privacy consent
    if (map || authLoading || isCheckingPrivacy || !mapAccepted) return;
    initializeMap(mapRef, initMapInstance, setMuted);
  }, [map, mapRef, initMapInstance, authLoading, mapAccepted, isCheckingPrivacy]);

  useEffect(() => {
    // needs privacy consent
    if (!authLoading && map && mapRef.current && mapAccepted) {
      const timer = setTimeout(() => {
        const container = mapRef.current;
        if (container && map.getTarget() !== container) {
          map.setTarget(container);
        }
        map.updateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading, map, mapRef, mapAccepted]);

  useEffect(() => {
    if (muted && map) {
      clearDrawingLayers();
    }
  }, [muted, map, clearDrawingLayers]);

  // detach on unmount
  useEffect(() => {
    const currentMap = map;
    return () => {
      if (currentMap) {
        currentMap.setTarget();
      }
    };
  }, [map]);

  // pick content
  const renderMapContent = () => {
    if (isCheckingPrivacy) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center px-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 dark:border-gray-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Loading map...</p>
          </div>
        </div>
      );
    }

    if (mapAccepted) {
      return (
        <>
          <div ref={mapRef} className={cn("w-full h-full")} data-tour="map" />

          {map && <MapSearchBar />}

          <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onCenterMap={centerMap} />

          {/* shortcuts above legend */}
          {map && (
            <div className="absolute bottom-[4.5rem] left-4 z-30 flex flex-col items-start gap-2">
            <MapShortcutsPanel canNewModel={Boolean(user)} />
            {latestModel && (
              <section
                aria-label={t("map.legend.onMap", "On this map")}
                className="md-fade-in w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border/60 bg-card/95 p-3 text-xs shadow-lg backdrop-blur-md"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("map.legend.onMap", "On this map")}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground" title={latestModel.title}>
                  {latestModel.title}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                  {t("map.legend.latestHint", "Your most recent model")}
                  {latestModel.createdAt &&
                    ` · ${new Date(latestModel.createdAt).toLocaleDateString(i18n?.language ?? "en", { day: "numeric", month: "short" })}`}
                </p>
                {/* area if different */}
                {latestModel.region && latestModel.region !== latestModel.title && (
                  <p className="truncate text-[10px] text-muted-foreground" title={latestModel.region}>
                    {latestModel.region}
                  </p>
                )}

                {/* risk or area */}
                {mapPageLayers.riskLayer ? (
                  <div className="mt-2.5">
                    <p className="text-[11px] font-medium text-foreground">{t("modelResults.legend.title", "Fire Risk")}</p>
                    <div aria-hidden className="mt-1 flex h-2 overflow-hidden rounded-full">
                      {RISK_LEVELS.map((lvl) => (
                        <span key={lvl.id} className="flex-1" style={{ backgroundColor: lvl.color }} />
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>{t("modelResults.legend.levels.very_low", "Very Low")}</span>
                      <span>{t("modelResults.legend.levels.very_high", "Very High")}</span>
                    </div>
                    {/* see map below */}
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {t("modelResults.layer.opacity", "Opacity")}
                      <input
                        type="range"
                        min={0.2}
                        max={1}
                        step={0.05}
                        value={riskOpacity}
                        onChange={(e) => setRiskOpacity(Number.parseFloat(e.target.value))}
                        className="h-1.5 flex-1 cursor-pointer accent-foreground"
                      />
                      <span className="w-8 text-right tabular-nums">{Math.round(riskOpacity * 100)}%</span>
                    </label>
                  </div>
                ) : (
                  <p className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span
                      aria-hidden
                      className="h-2.5 w-4 shrink-0 rounded-sm border-2"
                      style={{ borderColor: "#059669", background: "rgba(16, 185, 129, 0.28)" }}
                    />
                    {t("map.legend.noResults", "Results not ready yet")}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleModelClick(latestModel.id, latestModel.status)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {latestModel.status === "completed" || latestModel.status === "published"
                      ? t("map.legend.openResults", "Open results")
                      : t("map.legend.openModel", "Open model")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  {mapPageLayers.modelTotal > 1 && (
                    <button
                      type="button"
                      onClick={() => navigate("/app/model-dashboard")}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {t("map.legend.allModels", { count: mapPageLayers.modelTotal, defaultValue: "All {{count}} models" })}
                    </button>
                  )}
                </div>
              </section>
            )}
            </div>
          )}

          {map && (
            // below locate button
            <div className="absolute top-[11rem] right-4 z-30">
              <BookmarkMenu getCurrentView={getCurrentView} flyTo={flyTo} />
            </div>
          )}

          {user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={openNewModel}
                  aria-label={newModelLabel}
                  title={t("map.newModelShortcut", "Shortcut: N")}
                  className="absolute bottom-20 right-3 flex h-12 max-w-[calc(100vw-1.5rem)] items-center gap-1.5 rounded-2xl bg-primary px-3 text-primary-foreground shadow-xl ring-2 ring-background transition-all duration-200 hover:scale-105 hover:bg-primary/90 sm:right-6 sm:h-14 sm:gap-2 sm:px-5 z-30"
                >
                  <Plus className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                  <span className="whitespace-nowrap text-xs font-semibold sm:text-sm">
                    {newModelLabel}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">{newModelLabel}</TooltipContent>
            </Tooltip>
          )}
        </>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center px-4">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
            {t("map.privacyRequired", "Please accept the Data & Privacy terms to view the map")}
          </p>
          <button
            onClick={handleOpenPrivacyDialog}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
          >
            Review Privacy Terms
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("w-full h-full", "relative overflow-hidden")}>
      {renderMapContent()}

      <PrivacyBanner onClick={handleOpenPrivacyDialog} hasAccepted={mapAccepted} />

      <CopyrightFooter />

      <PrivacyConsentDialog
        isOpen={showPrivacyDialog}
        onAccept={handleAcceptPrivacy}
        onDeny={handleDenyPrivacy}
        onClose={handleClosePrivacyDialog}
      />
    </div>
  );
};
