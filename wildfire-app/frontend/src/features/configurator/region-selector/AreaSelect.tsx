import { useEffect, useState, useCallback, useRef, Fragment, type FC, type ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { parseDate } from "@internationalized/date";
import { useTranslation } from "@/i18n";

import { AreaSelectTour } from "@/features/guided-tour/AreaSelectTour";
import { MapContainer } from "@/components/shared/MapContainer";
import { useAreaSelect, type AreaData } from "@/features/configurator/hooks/useAreaSelect";
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
import { transformExtent } from "ol/proj";
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

    // Resolve model ID from URL params in edit mode
    const { id: urlModelId } = useParams<{ id: string }>();
    const existingModelId = existingModelIdProp ?? (urlModelId ? Number(urlModelId) : undefined);

    useDocumentTitle(editMode ? "Edit Model" : "New Model");

    const location = useLocation();
    const passedWorkspaceId = location.state?.workspaceId;
    const normalizedWorkspaceId = typeof passedWorkspaceId === "number" ? passedWorkspaceId : undefined;

    const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
    const preferredWorkspaceId = useWorkspaceStore((s) => s.preferredWorkspaceId);
    const isLoadingPreference = useWorkspaceStore((s) => s.isLoading);
    const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
    const initializeWorkspace = useWorkspaceStore((s) => s.initializeWorkspace);

    const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
    const [wsReloadKey, setWsReloadKey] = useState(0);
    const [currentPointCount, setCurrentPointCount] = useState(0);
    const [activeConfiguratorStep, setActiveConfiguratorStep] = useState(editMode ? 1 : 0);
    const [tourRequestedConfiguratorStep, setTourRequestedConfiguratorStep] = useState<number | null>(null);

    useEffect(() => { initializeWorkspace(); }, [initializeWorkspace]);

    useEffect(() => {
        if (!isLoadingPreference) {
            setTimeout(() => setWsReloadKey((prev) => prev + 1), 0);
        }
    }, [isLoadingPreference, preferredWorkspaceId]);

    const handleWorkspaceChange = useCallback((workspace: Workspace | null) => {
        setCurrentWorkspace(workspace);
    }, [setCurrentWorkspace]);

    const { state, actions, notification, map } = useAreaSelect({
        onAreaSelected,
        onCancel,
        editMode,
        existingModelId,
    });

    // Fly to default region when map is ready
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

    // Cleanup drawing layers on unmount
    const clearDrawingLayersRef = useRef(clearDrawingLayers);
    clearDrawingLayersRef.current = clearDrawingLayers;
    useEffect(() => {
        return () => { clearDrawingLayersRef.current(); };
    }, []);

    const showDrawHint =
        activeConfiguratorStep === 2 &&
        state.areaInputMode === "draw" &&
        state.cursorPos &&
        !state.isDrawing &&
        state.allPolygons.length === 0;

    const polygonDrawingEnabled = activeConfiguratorStep === 2 && state.areaInputMode === "draw";

    const handleModelNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        actions.setModelName(e.target.value);
    }, [actions]);

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
                <div className="fixed inset-0 bg-background/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-background dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md mx-4 border border-border">
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            <div className="text-lg font-medium text-foreground">Loading Model</div>
                            <div className="text-sm text-muted-foreground text-center">
                                Please wait while we load your model...
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <MapContainer
                key={editMode ? `edit-${existingModelId}` : "create"}
                modal={false}
                topBar={null}
                mapOverlays={
                    <>
                        <StorcitoCoverageOverlay map={map} />
                        <DtmFootprintOverlay
                            map={map}
                            footprint={state.dtmFootprint}
                            imageUrl={state.dtmImageUrl}
                            imageExtent={state.dtmImageExtent}
                        />
                        <MapOverlays
                            showDrawHint={Boolean(showDrawHint)}
                            cursorPos={state.cursorPos}
                        />
                        {!editMode && activeConfiguratorStep === 2 && state.areaInputMode === "draw" && (
                            <PolygonDrawingGuide
                                canDraw={polygonDrawingEnabled && state.allPolygons.length === 0}
                                isDrawing={state.isDrawing}
                                polygonCount={state.allPolygons.length}
                                currentPointCount={currentPointCount}
                                enableEditing={true}
                            />
                        )}
                        <LayerStepper
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
                        allPolygonsCount={state.allPolygons.length}
                        onClearAllPolygons={actions.handleClearAllPolygons}
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
                allowMultiple={false}
                clearTrigger={state.clearTrigger}
                initialPolygons={state.loadedCoordinates}
                bufferDistanceMeters={state.bufferDistance}
                disableAfterDraw={true}
                drawingEnabled={polygonDrawingEnabled}
                enableEditing={true}
                labels={{
                    clickToClose: t("drawing.clickToClose"),
                    start: t("drawing.start"),
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
