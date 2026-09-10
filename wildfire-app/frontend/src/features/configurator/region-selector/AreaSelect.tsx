import {
  useEffect,
  useState,
  useCallback,
  useRef,
  Fragment,
  type FC,
  type ChangeEvent,
} from "react";
import { Loader2, Move, Pencil } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { parseDate } from "@internationalized/date";
import { useTranslation } from "@/i18n";

import { AreaSelectTour } from "@/features/guided-tour";
import { MapContainer } from "@/components/shared/MapContainer";
import { useAreaSelect, type AreaData } from "@/features/configurator/hooks/useAreaSelect";
import { useAdministrativeRegionSelection } from "@/features/configurator/hooks/area-select/useAdministrativeRegionSelection";
import { useWizardSteps } from "@/features/configurator/hooks/area-select/useWizardSteps";
import { WizardStepBar, sidebarMapWidth } from "./components/wizard";
import { useDataCoverage } from "@/features/configurator/hooks/area-select/useDataCoverage";
import { PolygonDrawer } from "@/features/polygon-drawer";
import { PolygonDrawingGuide } from "@/components/map-controls/PolygonDrawingGuide";
import { CreateWorkspaceModal } from "@/components/workspace";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useWorkspaceStore } from "@/components/workspace";
import { type Workspace } from "@/components/workspace";
import Notification from "@/components/ui/Notification";

import { MapOverlays } from "./components/MapOverlays";
import { MapHeader } from "./components/MapHeader";
import { LayerStepper } from "./components/LayerStepper";
import { StorcitoCoverageOverlay } from "./components/StorcitoCoverageOverlay";
import { DtmFootprintOverlay } from "./components/DtmFootprintOverlay";
import { useAuthStore } from "@/store/auth-store";
import { useMapProvider } from "@/providers/map-context";
import { boundingExtent } from "ol/extent";
import { fromLonLat, transformExtent } from "ol/proj";
import { useDefaultRegionStore } from "@/features/configurator/region-selector/store/default-region";

const DATE_BOUNDS = { minYear: 2015, maxYear: 2025 };

const getDateBounds = () => ({
  minValue: parseDate(`${DATE_BOUNDS.minYear}-01-01`),
  maxValue: parseDate(`${DATE_BOUNDS.maxYear}-12-31`),
  minYear: DATE_BOUNDS.minYear,
  maxYear: DATE_BOUNDS.maxYear,
});

interface AreaSelectProps {
  onAreaSelected?: (areaData: AreaData) => void;
  onCancel?: () => void;
  editMode?: boolean;
  existingModelId?: number;
}

export const AreaSelect: FC<AreaSelectProps> = ({
  onAreaSelected,
  onCancel,
  editMode = false,
  existingModelId: existingModelIdProp,
}) => {
  const { t } = useTranslation();
  const { clearDrawingLayers } = useMapProvider();

  // Resolve model ID.
  const { id: urlModelId } = useParams<{ id: string }>();
  const existingModelId = existingModelIdProp ?? (urlModelId ? Number(urlModelId) : undefined);

  useDocumentTitle(editMode ? "Edit Model" : "New Model");

  const location = useLocation();
  const passedWorkspaceId = location.state?.workspaceId;
  const normalizedWorkspaceId =
    typeof passedWorkspaceId === "number" ? passedWorkspaceId : undefined;

  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const preferredWorkspaceId = useWorkspaceStore((s) => s.preferredWorkspaceId);
  const isLoadingPreference = useWorkspaceStore((s) => s.isLoading);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const initializeWorkspace = useWorkspaceStore((s) => s.initializeWorkspace);

  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [wsReloadKey, setWsReloadKey] = useState(0);
  const [currentPointCount, setCurrentPointCount] = useState(0);
  const [isPanMode, setIsPanMode] = useState(false);
  const wizard = useWizardSteps(editMode);
  const [activeConfiguratorStep, setActiveConfiguratorStep] = useState(editMode ? 1 : 0);
  const [tourRequestedConfiguratorStep, setTourRequestedConfiguratorStep] = useState<number | null>(
    null
  );

  useEffect(() => {
    initializeWorkspace();
  }, [initializeWorkspace]);

  useEffect(() => {
    if (!isLoadingPreference) {
      setTimeout(() => setWsReloadKey((prev) => prev + 1), 0);
    }
  }, [isLoadingPreference, preferredWorkspaceId]);

  const handleWorkspaceChange = useCallback(
    (workspace: Workspace | null) => {
      setCurrentWorkspace(workspace);
    },
    [setCurrentWorkspace]
  );

  const { state, actions, notification, map } = useAreaSelect({
    onAreaSelected,
    onCancel,
    editMode,
    existingModelId,
  });

  const regionSelectionEnabled = activeConfiguratorStep === 2 && state.areaInputMode === "region";
  const { containsCoordinate, coverageNames } = useDataCoverage();
  useAdministrativeRegionSelection({
    map,
    enabled: regionSelectionEnabled,
    onStart: actions.beginRegionSelection,
    onSelected: actions.handleRegionSelected,
    onError: actions.handleRegionSelectionError,
    onCancel: actions.cancelRegionSelection,
    isWithinCoverage: containsCoordinate,
    coverageNames,
    messages: {
      notFound: t(
        "configurator.layer2.regionNotFound",
        "No administrative region boundary was found here. Try clicking farther inside the region."
      ),
      requestFailed: t(
        "configurator.layer2.regionLookupFailed",
        "Could not load the administrative boundary. Check your connection and try again."
      ),
      outsideCoverage: coverageNames.length
        ? t("configurator.layer2.regionOutsideCoverageNamed", {
            regions: coverageNames.join(", "),
            defaultValue:
              "Wildfire data is only available for {{regions}}. Click inside the shaded area.",
          })
        : t(
            "configurator.layer2.regionOutsideCoverage",
            "That point is outside the area wildfire data covers. Click inside the shaded area."
          ),
    },
  });

  // Fly to default region.
  const hasAppliedDefaultRegion = useRef(false);
  const defaultRegion = useDefaultRegionStore((s) => s.defaultRegion);
  useEffect(() => {
    if (!map || hasAppliedDefaultRegion.current || editMode) return;
    if (!defaultRegion?.bbox) return;
    hasAppliedDefaultRegion.current = true;
    const view = map.getView();
    view.cancelAnimations();
    const { west, south, east, north } = defaultRegion.bbox;
    const extent = transformExtent([west, south, east, north], "EPSG:4326", "EPSG:3857");
    view.fit(extent, { padding: [60, 60, 60, 60], duration: 0, maxZoom: 14 });
  }, [map, defaultRegion, editMode]);

  // Unsaved changes guard
  const isDirty = state.allPolygons.length > 0;
  const isSessionExpired = useAuthStore((s) => s.isSessionExpired);
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (useAuthStore.getState().isSessionExpired) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isSessionExpired]);

  // Cleanup on unmount.
  const clearDrawingLayersRef = useRef(clearDrawingLayers);
  clearDrawingLayersRef.current = clearDrawingLayers;
  useEffect(() => {
    return () => {
      clearDrawingLayersRef.current();
    };
  }, []);

  const showDrawHint =
    activeConfiguratorStep === 2 &&
    state.areaInputMode === "draw" &&
    state.cursorPos &&
    !state.isDrawing &&
    state.allPolygons.length === 0;

  // Map visibility per step.
  const isDrawingStep = wizard.step === 2;
  const isMapSidebar = wizard.step > 2 && state.allPolygons.length > 0;
  const isMapVisible = isDrawingStep || isMapSidebar;

  useEffect(() => {
    if (!map || !isMapSidebar) return;
    const coordinates = state.allPolygons.flat();
    if (coordinates.length === 0) return;

    const size = map.getSize();
    const leftPadding = size ? Math.max(0, size[0] - sidebarMapWidth(size[0])) : 0;

    map
      .getView()
      .fit(boundingExtent(coordinates.map(([lon, lat]) => fromLonLat([lon, lat]))), {
        padding: [48, 48, 48, leftPadding + 32],
        duration: 1200,
        maxZoom: 15,
      });
  }, [isMapSidebar, map, state.allPolygons]);

  // Pause drawing to pan.
  const polygonDrawingEnabled =
    activeConfiguratorStep === 2 && state.areaInputMode === "draw" && !isPanMode;

  const handleModelNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      actions.setModelName(e.target.value);
    },
    [actions]
  );

  // Back to drawing step.
  const handleClearAllPolygons = useCallback(() => {
    actions.handleClearAllPolygons();
    if (wizard.step > 2) wizard.jumpTo(2);
  }, [actions, wizard]);

  const handleTourStepHandled = useCallback(() => {
    setTourRequestedConfiguratorStep(null);
  }, []);

  const handleAreaSelectTourComplete = useCallback(() => {
    setTourRequestedConfiguratorStep(1);
    actions.handleTourComplete();
  }, [actions]);

  return (
    <Fragment>
      <Notification
        isOpen={notification.data.open}
        message={notification.data.message}
        severity={notification.data.severity}
        onClose={notification.hide}
      />

      {editMode && state.isLoadingModel && (
        <div className="md-fade-in fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="md-rise bg-card rounded-xl shadow-xl p-8 max-w-md mx-4 border border-border">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <div className="text-lg font-medium text-foreground">
                {t("configurator.loadingModel", "Loading model")}
              </div>
              <div className="text-sm text-muted-foreground text-center">
                {t("configurator.loadingModelDesc", "Please wait while we load your model...")}
              </div>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        key={editMode ? `edit-${existingModelId}` : "create"}
        modal={false}
        hideMapControls={!isMapVisible}
        topBar={null}
        mapOverlays={
          <>
            {isDrawingStep && <StorcitoCoverageOverlay map={map} />}
            <DtmFootprintOverlay
              map={map}
              footprint={state.dtmFootprint}
              imageUrl={state.dtmImageUrl}
              imageExtent={state.dtmImageExtent}
            />
            {isDrawingStep && (
              <MapOverlays
                showDrawHint={Boolean(showDrawHint)}
                cursorPos={state.cursorPos}
                regionSelectionActive={regionSelectionEnabled}
                regionSelectionLoading={state.isResolvingRegion}
                selectedRegionName={state.selectedRegionName}
              />
            )}
            {!editMode && activeConfiguratorStep === 2 && state.areaInputMode === "draw" && (
              <button
                type="button"
                onClick={() => setIsPanMode((current) => !current)}
                aria-pressed={isPanMode}
                className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card/95 px-3.5 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-md transition-colors duration-150 hover:bg-muted"
              >
                {isPanMode ? <Pencil className="h-3.5 w-3.5" /> : <Move className="h-3.5 w-3.5" />}
                {isPanMode
                  ? t("drawing.resumeDrawing", "Resume drawing")
                  : t("drawing.moveMap", "Move map")}
              </button>
            )}
            {!editMode &&
              activeConfiguratorStep === 2 &&
              state.areaInputMode === "draw" &&
              !isPanMode && (
                <PolygonDrawingGuide
                  canDraw={polygonDrawingEnabled && state.allPolygons.length === 0}
                  isDrawing={state.isDrawing}
                  polygonCount={state.allPolygons.length}
                  currentPointCount={currentPointCount}
                  enableEditing={true}
                />
              )}
            <LayerStepper
              wizard={wizard}
              state={state}
              actions={actions}
              allPolygonsCount={state.allPolygons.length}
              handleModelNameChange={handleModelNameChange}
              getDateBounds={getDateBounds}
              editMode={editMode}
              polygonCoordinates={state.allPolygons}
              onStepChange={setActiveConfiguratorStep}
              tourRequestedStep={tourRequestedConfiguratorStep}
              onTourStepHandled={handleTourStepHandled}
            />
          </>
        }
        mapHeader={
          <MapHeader
            steps={
              wizard.hasStarted ? (
                <WizardStepBar
                  step={wizard.step}
                  completed={wizard.completed}
                  editMode={editMode}
                  onJump={wizard.jumpTo}
                />
              ) : undefined
            }
            allPolygonsCount={state.allPolygons.length}
            onClearAllPolygons={handleClearAllPolygons}
            isLoadingPreference={isLoadingPreference}
            wsReloadKey={wsReloadKey}
            currentWorkspace={currentWorkspace}
            preferredWorkspaceId={preferredWorkspaceId ?? undefined}
            normalizedWorkspaceId={normalizedWorkspaceId}
            onWorkspaceChange={handleWorkspaceChange}
            onOpenCreateWorkspace={() => setIsCreateWsOpen(true)}
          />
        }
        showSidebar={false}
      />

      <AreaSelectTour
        isOpen={state.showAreaSelectTour}
        onComplete={handleAreaSelectTourComplete}
        onSkip={actions.handleTourSkip}
        onConfiguratorStepChange={setTourRequestedConfiguratorStep}
      />

      <PolygonDrawer
        map={map}
        onPolygonDrawn={actions.handlePolygonDrawn}
        onPolygonModified={actions.handlePolygonModified}
        onDrawingChange={actions.setIsDrawing}
        onPointCountChange={setCurrentPointCount}
        onClearAll={actions.handleClearAllPolygons}
        allowMultiple={true}
        variant={state.areaInputMode === "region" ? "region" : "drawn"}
        clearTrigger={state.clearTrigger}
        initialPolygons={state.loadedCoordinates}
        bufferDistanceMeters={state.bufferDistance}
        disableAfterDraw={false}
        drawingEnabled={polygonDrawingEnabled}
        enableEditing={true}
        onEditRequest={isMapSidebar ? () => wizard.jumpTo(2) : undefined}
        labels={{
          clickToClose: t("drawing.clickToClose"),
          start: t("drawing.start"),
          edit: t("drawing.edit", "Edit"),
        }}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWsOpen}
        onClose={() => setIsCreateWsOpen(false)}
        onSuccess={(newWorkspace) => {
          setIsCreateWsOpen(false);
          handleWorkspaceChange(newWorkspace);
          setWsReloadKey((k) => k + 1);
        }}
      />
    </Fragment>
  );
};
