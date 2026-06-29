import { useMapStore } from '@/features/interactive-map/store/map-store';
import { useMapProvider } from '@/providers/map-context';
import { useNotification } from '@/features/notifications/hooks/useNotification';
import type {
    AreaSelectState,
    AreaSelectActions,
    UseAreaSelectProps,
} from '@/features/configurator/types/area-select';
import { useAreaSelectState } from './area-select/useAreaSelectState';
import { useMapDrawing } from './area-select/useMapDrawing';
import { useModelCreation } from './area-select/useModelCreation';

export { type AreaData } from '@/features/configurator/types/area-select';

export const useAreaSelect = ({
    onAreaSelected,
    onCancel,
    editMode = false,
    existingModelId,
}: UseAreaSelectProps) => {
    const state = useAreaSelectState({ editMode });
    const drawing = useMapDrawing({ state });
    const creation = useModelCreation({
        state,
        drawing,
        onAreaSelected,
        onCancel,
        editMode,
        existingModelId,
    });

    const { notification, showSuccess, showError, hide } = useNotification();
    const { map } = useMapStore();
    const { mapRef } = useMapProvider();

    const exposedState: AreaSelectState = {
        modelName: state.modelName,
        fromDate: state.fromDate,
        toDate: state.toDate,
        bufferDistance: state.bufferDistance,
        calculationMode: state.calculationMode,
        availableStaticDates: state.availableStaticDates,
        availableDynamicDates: state.availableDynamicDates,
        isLoadingStaticDates: state.isLoadingStaticDates,
        isLoadingDynamicDates: state.isLoadingDynamicDates,
        staticDatesError: state.staticDatesError,
        dynamicDatesError: state.dynamicDatesError,
        isSaving: creation.isSaving,
        isLoadingModel: creation.isLoadingModel,
        showAreaSelectTour: state.showAreaSelectTour,
        loadedCoordinates: drawing.loadedCoordinates,
        allPolygons: drawing.allPolygons,
        areaInputMode: state.areaInputMode,
        uploadedGeoJsonName: state.uploadedGeoJsonName,
        geoJsonUploadError: state.geoJsonUploadError,
        isDrawing: state.isDrawing,
        clearTrigger: drawing.clearTrigger,
        cursorPos: state.cursorPos,
        optionalLayers: state.optionalLayers,
        stationDataName: state.stationDataName,
        stationDataError: state.stationDataError,
        dtmName: state.dtmName,
        dtmError: state.dtmError,
        dtmFootprint: state.dtmFootprint,
        dtmProcessing: state.dtmProcessing,
    };

    const actions: AreaSelectActions = {
        setModelName: state.setModelName,
        setBufferDistance: state.setBufferDistance,
        setCalculationMode: state.setCalculationMode,
        handleUpdateRange: state.handleUpdateRange,
        setShowAreaSelectTour: state.setShowAreaSelectTour,
        handleTourComplete: state.handleTourComplete,
        handleTourSkip: state.handleTourSkip,
        handleSave: creation.handleSave,
        handleCancel: creation.handleCancel,
        setAllPolygons: drawing.setAllPolygons,
        setAreaInputMode: state.setAreaInputMode,
        handleGeoJsonUpload: drawing.handleGeoJsonUpload,
        handlePolygonDrawn: drawing.handlePolygonDrawn,
        handlePolygonModified: drawing.handlePolygonModified,
        handleClearAllPolygons: drawing.handleClearAllPolygons,
        setIsDrawing: state.setIsDrawing,
        toggleOptionalLayer: state.toggleOptionalLayer,
        setStationDataFile: state.setStationDataFile,
        setDtmFile: state.setDtmFile,
    };

    return {
        state: exposedState,
        actions,
        notification: { data: notification, showSuccess, showError, hide },
        setCursorPos: state.setCursorPos,
        map,
        mapRef,
    };
};
