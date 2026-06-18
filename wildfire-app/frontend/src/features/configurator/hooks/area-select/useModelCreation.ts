import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { modelService } from '@/features/model-dashboard/services/modelService';
import { useCreateModelMutation, useUpdateModelMutation2 } from '@/features/model-dashboard/hooks/useModelsQuery';
import { useWorkspaceStore } from '@/components/workspace';
import { clampBuffer } from '@/features/configurator/constants/buffer-distance';
import type {
    AreaData,
    UseAreaSelectProps,
} from '@/features/configurator/types/area-select';
import {
    asRecord,
    extractPolygonsFromModelCoordinates,
    getAreaInputModeFromConfig,
    getCalculationModeFromConfig,
    getDateInputValue,
    getUploadedGeoJsonNameFromConfig,
    lookupRegionForPolygons,
} from './utils';
import type { AreaSelectStateApi } from './useAreaSelectState';
import type { MapDrawingApi } from './useMapDrawing';

const SAVE_DELAY_MS = 1200;
const DASHBOARD_ROUTE = '/app/model-dashboard';

export interface UseModelCreationOptions extends Pick<UseAreaSelectProps, 'onAreaSelected' | 'onCancel' | 'editMode' | 'existingModelId'> {
    state: AreaSelectStateApi;
    drawing: MapDrawingApi;
}

export const useModelCreation = ({
    state,
    drawing,
    onAreaSelected,
    onCancel,
    editMode = false,
    existingModelId,
}: UseModelCreationOptions) => {
    const navigate = useNavigate();
    const params = useParams();
    const modelId = editMode ? (existingModelId || Number.parseInt(params.id || '0', 10)) : undefined;

    const createModelMutation = useCreateModelMutation();
    const updateModelMutation = useUpdateModelMutation2();
    const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingModel, setIsLoadingModel] = useState(false);

    const {
        modelName, fromDate, toDate, bufferDistance, calculationMode, availableStaticDates,
        areaInputMode, uploadedGeoJsonName, originalConfig, optionalLayers,
        setModelName, setBufferDistanceRaw, setCalculationMode, setOriginalConfig,
        setAreaInputModeRaw, setUploadedGeoJsonName, setFromDate, setToDate, setOptionalLayers,
    } = state;

    const { allPolygons, loadedCoordinates, setAllPolygons, setLoadedCoordinates } = drawing;

    // ── Edit-mode load ────────────────────────────────────────────────
    useEffect(() => {
        if (!editMode || !modelId) return;
        let cancelled = false;
        setIsLoadingModel(true);
        (async () => {
            try {
                const response = await modelService.getModelById(modelId);
                if (cancelled || !response.success || !response.data) return;
                const model = response.data;
                if (model.title) setModelName(model.title);
                const cfg = asRecord(model.config);
                if (cfg) {
                    setOriginalConfig(cfg);
                    const rawBuffer = cfg.buffer_distance;
                    if (typeof rawBuffer === 'number') {
                        setBufferDistanceRaw(clampBuffer(rawBuffer));
                    }
                }
                const loadedAreaMode = cfg ? getAreaInputModeFromConfig(cfg) : undefined;
                if (loadedAreaMode) setAreaInputModeRaw(loadedAreaMode);
                const loadedGeoJsonName = cfg ? getUploadedGeoJsonNameFromConfig(cfg) : undefined;
                if (loadedGeoJsonName) setUploadedGeoJsonName(loadedGeoJsonName);
                const loadedCalculationMode = cfg ? getCalculationModeFromConfig(cfg) : undefined;
                if (loadedCalculationMode) setCalculationMode(loadedCalculationMode);
                const loadedParameters = cfg ? asRecord(cfg.parameters) : undefined;
                const loadedOptional = loadedParameters ? asRecord(loadedParameters.optional_layers) : undefined;
                if (loadedOptional) {
                    setOptionalLayers({
                        weather_overlay: Boolean(loadedOptional.weather_overlay),
                        terrain_analysis: Boolean(loadedOptional.terrain_analysis),
                        historical_fires: Boolean(loadedOptional.historical_fires),
                    });
                }
                const loadedFromDate = getDateInputValue(model.from_date);
                if (loadedFromDate) setFromDate(loadedFromDate);
                const loadedToDate = getDateInputValue(model.to_date);
                if (loadedToDate) setToDate(loadedToDate);
                const polys = extractPolygonsFromModelCoordinates(model.coordinates);
                if (polys.length > 0) setLoadedCoordinates(polys);
            } catch {
                /* ignore load errors */
            } finally {
                if (!cancelled) setIsLoadingModel(false);
            }
        })();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editMode, modelId]);

    useEffect(() => {
        if (editMode && loadedCoordinates && loadedCoordinates.length > 0) {
            setAllPolygons(loadedCoordinates);
        }
    }, [editMode, loadedCoordinates, setAllPolygons]);

    // ── Save / cancel ─────────────────────────────────────────────────
    const handleCancel = useCallback((): void => {
        if (onCancel) { onCancel(); return; }
        navigate(DASHBOARD_ROUTE);
    }, [onCancel, navigate]);

    const handleSave = useCallback(async (opts?: { runAfterSave?: boolean }): Promise<void> => {
        if (!fromDate || !toDate || !modelName.trim() || allPolygons.length === 0) return;
        if (calculationMode === 'static' && fromDate !== toDate) return;
        if (calculationMode === 'static' && !availableStaticDates.includes(fromDate)) return;
        setIsSaving(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
            const areaData: AreaData = {
                fromDate, toDate,
                bufferDistance,
                calculationMode,
                modelName: modelName.trim(),
                timestamp: new Date().toISOString(),
            };

            if (onAreaSelected) {
                onAreaSelected(areaData);
                return;
            }

            const coordinatesGeoJSON = {
                type: 'MultiPolygon',
                coordinates: allPolygons.map((polygon) => [polygon]),
            };

            const { region, country } = await lookupRegionForPolygons(allPolygons);
            const originalParameters = asRecord(originalConfig?.parameters);

            const modelData = {
                title: areaData.modelName,
                from_date: areaData.fromDate,
                to_date: areaData.toDate,
                workspace_id: currentWorkspace?.id,
                coordinates: coordinatesGeoJSON,
                config: {
                    ...(originalConfig ?? {}),
                    buffer_distance: areaData.bufferDistance,
                    parameters: {
                        ...(originalParameters ?? {}),
                        calculation_mode: areaData.calculationMode,
                        optional_layers: optionalLayers,
                    },
                    area_input: {
                        method: areaInputMode,
                        uploaded_geojson_name: uploadedGeoJsonName ?? null,
                    },
                } as Record<string, unknown>,
            };

            let savedModelId: number | undefined;
            if (editMode && modelId) {
                await updateModelMutation.mutateAsync({ id: modelId, data: modelData });
                savedModelId = modelId;
            } else {
                const created = await createModelMutation.mutateAsync({ ...modelData, region, country });
                savedModelId = created?.data?.id;
            }

            if (opts?.runAfterSave && savedModelId) {
                try {
                    await modelService.startCalculation(savedModelId);
                } catch { /* ignore — model still saved */ }
            }

            navigate(DASHBOARD_ROUTE, { state: { workspaceId: currentWorkspace?.id } });
        } catch {
            /* ignore save errors */
        } finally {
            setIsSaving(false);
        }
    }, [fromDate, toDate, modelName, bufferDistance, calculationMode, availableStaticDates, editMode, modelId, onAreaSelected,
        allPolygons, areaInputMode, uploadedGeoJsonName, currentWorkspace?.id, originalConfig, optionalLayers,
        updateModelMutation, createModelMutation, navigate]);

    return {
        isSaving,
        isLoadingModel,
        handleSave,
        handleCancel,
    };
};

export type ModelCreationApi = ReturnType<typeof useModelCreation>;
