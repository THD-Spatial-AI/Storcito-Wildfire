import { useEffect, useState, useCallback } from "react";
import { isMapLibreLayerId, useMapStore } from "@/features/interactive-map/store/map-store";
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
import axios from "@/lib/axios";
import { settingsService } from "@/features/settings/services/settings";
import { useNavigate } from "react-router-dom";
import { Plus, Map as MapIcon, Layers } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";
import { MapLibreOverlay } from "@/components/map-controls/maplibre";
import { toLonLat, fromLonLat } from "ol/proj";
import { useMapPageLayers } from "./useMapPageLayers";
import { useMapPageOLLayers } from "./useMapPageOLLayers";

const PRIVACY_ACCEPTED_EVENT = "privacy-accepted";

export const MapComponent: React.FC = () => {
  useDocumentTitle("Interactive Map");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mapRef, initMapInstance, clearDrawingLayers, zoomIn, zoomOut, centerMap } =
    useMapProvider();
  const { isLoading: authLoading, user } = useAuth();
  const [muted, setMuted] = useState<boolean>(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState<boolean>(false);
  const [mapAccepted, setMapAccepted] = useState<boolean>(false);
  const [isCheckingPrivacy, setIsCheckingPrivacy] = useState<boolean>(true); // Add loading state
  const { map } = useMapStore();
  const isMapLibre = useMapStore((s) => isMapLibreLayerId(s.selectedBaseLayerId));

  // Fetch region boundaries (public) + user model polygons (private)
  const mapPageLayers = useMapPageLayers(user?.id);
  const newModelLabel = t("model.newModel");
  const openNewModel = useCallback(() => navigate("/app/model-dashboard/new-model"), [navigate]);
  useMapKeyboardShortcuts(map, { onNewModel: user ? openNewModel : undefined });

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

  // OL layers for boundaries and user models.
  useMapPageOLLayers({
    map,
    isMapLibre,
    availableBoundaryGeoJSON: mapPageLayers.availableBoundaryGeoJSON,
    userModelGeoJSON: mapPageLayers.userModelGeoJSON,
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
        duration: 800,
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
    // Hybrid approach: Check localStorage first, then verify with database for logged-in users
    const checkPrivacy = async () => {
      setIsCheckingPrivacy(true);

      // First, check localStorage for immediate feedback (works for both logged-in and non-logged-in users)
      const localPrivacy = localStorage.getItem("privacy_accepted");

      if (!user) {
        // For non-logged-in users, rely solely on localStorage
        const accepted = localPrivacy === "true";
        setMapAccepted(accepted);
        setIsCheckingPrivacy(false);
        return;
      }

      // For logged-in users: use localStorage for instant UI, then sync with database
      if (localPrivacy === "true") {
        setMapAccepted(true);
        setIsCheckingPrivacy(false);

        // Verify with backend in background (sync database state to localStorage)
        axios
          .get("/settings")
          .then(({ data }) => {
            if (data.success && data.data) {
              const dbAccepted = data.data.privacy_accepted;
              setMapAccepted(dbAccepted);
              localStorage.setItem("privacy_accepted", String(dbAccepted));
            }
          })
          .catch(() => {
            // Ignore errors, keep cached value
          });
        return;
      }

      // No localStorage cache, check database
      try {
        const { data } = await axios.get("/settings");
        if (data?.success && data?.data?.privacy_accepted) {
          setMapAccepted(true);
          localStorage.setItem("privacy_accepted", "true");
        } else {
          setMapAccepted(false);
          localStorage.setItem("privacy_accepted", "false");
        }
      } catch {
        // Error means settings not created yet or API issue
        setMapAccepted(false);
        localStorage.setItem("privacy_accepted", "false");
      } finally {
        setIsCheckingPrivacy(false);
      }
    };

    checkPrivacy();
  }, [user]); // Re-check when user changes

  const handleAcceptPrivacy = async () => {
    // Update state immediately for instant UI feedback
    setMapAccepted(true);
    setShowPrivacyDialog(false);

    // Update localStorage (hybrid approach - persists across logout)
    localStorage.setItem("privacy_accepted", "true");

    // Save to database for logged-in users
    if (user) {
      try {
        await axios.put("/settings/privacy-accepted", { accepted: true });
        settingsService.invalidateCache();
        // Wait for database update before triggering onboarding check
        setTimeout(() => {
          globalThis.dispatchEvent(new CustomEvent(PRIVACY_ACCEPTED_EVENT));
        }, 500);
      } catch {
        // Still dispatch event even if save fails
        settingsService.invalidateCache();
        globalThis.dispatchEvent(new CustomEvent(PRIVACY_ACCEPTED_EVENT));
      }
    } else {
      // For non-logged-in users, dispatch immediately
      globalThis.dispatchEvent(new CustomEvent(PRIVACY_ACCEPTED_EVENT));
    }
  };

  const handleDenyPrivacy = async () => {
    // Save denial to database for logged-in users
    if (user) {
      try {
        await axios.put("/settings/privacy-accepted", { accepted: false });
        settingsService.invalidateCache();
      } catch {
        // ignore
      }
    }

    setShowPrivacyDialog(false);
    setMapAccepted(false);

    // Update localStorage (hybrid approach)
    localStorage.setItem("privacy_accepted", "false");
  };

  const handleOpenPrivacyDialog = () => {
    setShowPrivacyDialog(true);
  };

  const handleClosePrivacyDialog = () => {
    setShowPrivacyDialog(false);
  };

  useEffect(() => {
    // Only initialize map if privacy has been accepted and check is complete
    if (map || authLoading || isCheckingPrivacy || !mapAccepted) return;
    initializeMap(mapRef, initMapInstance, setMuted);
  }, [map, mapRef, initMapInstance, authLoading, mapAccepted, isCheckingPrivacy]);

  useEffect(() => {
    // Only attach map to container if privacy has been accepted
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

  // Cleanup: detach map from container on component unmount
  useEffect(() => {
    const currentMap = map;
    return () => {
      if (currentMap) {
        currentMap.setTarget();
      }
    };
  }, [map]);

  // Determine what content to show
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
          {map && isMapLibre && (
            <MapLibreOverlay
              olMap={map}
              visible={isMapLibre}
              availableBoundaryGeoJSON={mapPageLayers.availableBoundaryGeoJSON}
              userModelGeoJSON={mapPageLayers.userModelGeoJSON}
              onUserModelClick={handleModelClick}
            />
          )}

          {map && <MapSearchBar />}

          <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onCenterMap={centerMap} />

          {/* Map legend — explains both base-map lines and application overlays. */}
          {map && (
            <section
              aria-label={t("map.legend.title", "Map outlines")}
              className="md-fade-in absolute bottom-[4.5rem] left-4 z-30 max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border/60 bg-card/95 p-2 text-xs shadow-lg backdrop-blur-md"
            >
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                {t("map.legend.title", "Map outlines")}
              </p>

              {(mapPageLayers.regionCount > 0 || mapPageLayers.modelCount > 0) && (
                <div className="mt-1 flex items-center gap-1">
                  {mapPageLayers.regionCount > 0 && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-indigo-500/8 px-2 py-1 dark:bg-indigo-400/10">
                      <MapIcon className="h-3 w-3 text-indigo-500" />
                      <span className="text-[10px] font-semibold text-foreground">
                        {mapPageLayers.regionCount} {t("map.regions", "regions")}
                      </span>
                    </div>
                  )}
                  {mapPageLayers.modelCount > 0 && (
                    <div
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500/8 px-2 py-1 dark:bg-emerald-400/10"
                      title={
                        mapPageLayers.modelTotal > mapPageLayers.modelCount
                          ? t("map.latestModelOf", {
                              total: mapPageLayers.modelTotal,
                              defaultValue: `Your most recent model, of {{total}} you have created. Open Simulations to see the rest.`,
                            })
                          : undefined
                      }
                    >
                      <Layers className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] font-semibold text-foreground">
                        {t("map.latestModel", "latest model")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-1.5 space-y-1 border-t border-border/60 px-1 pt-1.5 text-[10px] leading-snug text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-px w-4 shrink-0 bg-slate-500" />
                  <span>{t("map.legend.baseMap", "Gray lines: roads and administrative boundaries from the selected base map")}</span>
                </div>
                {mapPageLayers.regionCount > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="mt-1 w-4 shrink-0 border-t-2 border-dashed border-indigo-400" />
                    <span>{t("map.legend.availableRegions", "Dashed indigo: available administrative regions")}</span>
                  </div>
                )}
                {mapPageLayers.modelCount > 0 && (
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-0.5 h-2.5 w-4 shrink-0 rounded-sm border-2"
                      style={{ borderColor: "rgba(52, 211, 153, 0.95)", background: "rgba(52, 211, 153, 0.18)" }}
                    />
                    <span>{t("map.legend.yourModels", "Green area: your latest model — select it to open the results")}</span>
                  </div>
                )}
                <p className="pt-0.5">{t("map.legend.zoomDetail", "The default view is Galicia; the base map reveals more detail as you zoom in.")}</p>
              </div>
            </section>
          )}

          {map && (
            <div className="absolute top-4 right-4 z-30">
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
