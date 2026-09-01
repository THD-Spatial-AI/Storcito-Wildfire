import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { modelService } from "@/features/model-dashboard/services/modelService";
import {
  useCreateModelMutation,
  useUpdateModelMutation2,
} from "@/features/model-dashboard/hooks/useModelsQuery";
import { useWorkspaceStore } from "@/components/workspace";
import { clampBuffer } from "@/features/configurator/constants/buffer-distance";
import { dateRangeHasOnlyAvailableDates } from "@/features/configurator/utils/dateAvailability";
import type { AreaData, UseAreaSelectProps } from "@/features/configurator/types/area-select";
import {
  asRecord,
  extractPolygonsFromModelCoordinates,
  getAreaInputModeFromConfig,
  getCalculationModeFromConfig,
  getDateInputValue,
  getSelectedRegionCountryFromConfig,
  getSelectedRegionNameFromConfig,
  getUploadedGeoJsonNameFromConfig,
  lookupRegionForPolygons,
} from "./utils";
import type { AreaSelectStateApi } from "./useAreaSelectState";
import type { MapDrawingApi } from "./useMapDrawing";

const SAVE_DELAY_MS = 1200;
const DASHBOARD_ROUTE = "/app/model-dashboard";

export interface UseModelCreationOptions extends Pick<
  UseAreaSelectProps,
  "onAreaSelected" | "onCancel" | "editMode" | "existingModelId"
> {
  state: AreaSelectStateApi;
  drawing: MapDrawingApi;
  onError?: (message: string) => void;
  /** Translated fallbacks. */
  errorMessages?: {
    save?: string;
    create?: string;
    uploadInputs?: string;
    startCalculation?: string;
  };
}

const describeError = (error: unknown, fallback: string): string => {
  const response = (error as { response?: { data?: { error?: string; message?: string } } })
    ?.response;
  const serverMessage = response?.data?.error ?? response?.data?.message;
  if (typeof serverMessage === "string" && serverMessage.trim()) return serverMessage.trim();
  const message = (error as { message?: string })?.message;
  if (typeof message === "string" && message.trim()) return `${fallback} (${message.trim()})`;
  return fallback;
};

export const useModelCreation = ({
  state,
  drawing,
  onAreaSelected,
  onCancel,
  editMode = false,
  existingModelId,
  onError,
  errorMessages,
}: UseModelCreationOptions) => {
  const navigate = useNavigate();
  const params = useParams();
  const modelId = editMode ? existingModelId || Number.parseInt(params.id || "0", 10) : undefined;

  const createModelMutation = useCreateModelMutation();
  const updateModelMutation = useUpdateModelMutation2();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  const {
    modelName,
    fromDate,
    toDate,
    bufferDistance,
    calculationMode,
    usePrecomputed,
    availablePrecomputedDates,
    availableStaticDates,
    availableDynamicDates,
    areaInputMode,
    uploadedGeoJsonName,
    originalConfig,
    optionalLayers,
    stationDataFile,
    dtmFile,
    setModelName,
    setBufferDistanceRaw,
    setCalculationMode,
    setOriginalConfig,
    setAreaInputModeRaw,
    setUploadedGeoJsonName,
    setFromDate,
    setToDate,
    setOptionalLayers,
    setStoredStationDataName,
    setStoredDtmName,
  } = state;

  const {
    allPolygons,
    loadedCoordinates,
    setAllPolygons,
    setLoadedCoordinates,
    selectedRegionName,
    setSelectedRegionName,
    selectedRegionCountry,
    setSelectedRegionCountry,
    isResolvingRegion,
  } = drawing;

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
          if (typeof rawBuffer === "number") {
            setBufferDistanceRaw(clampBuffer(rawBuffer));
          }
        }
        const loadedAreaMode = cfg ? getAreaInputModeFromConfig(cfg) : undefined;
        if (loadedAreaMode) setAreaInputModeRaw(loadedAreaMode);
        const loadedGeoJsonName = cfg ? getUploadedGeoJsonNameFromConfig(cfg) : undefined;
        if (loadedGeoJsonName) setUploadedGeoJsonName(loadedGeoJsonName);
        const loadedRegionName = cfg ? getSelectedRegionNameFromConfig(cfg) : undefined;
        setSelectedRegionName(loadedRegionName);
        const loadedRegionCountry = cfg ? getSelectedRegionCountryFromConfig(cfg) : undefined;
        setSelectedRegionCountry(loadedRegionCountry);
        const loadedCalculationMode = cfg ? getCalculationModeFromConfig(cfg) : undefined;
        if (loadedCalculationMode) setCalculationMode(loadedCalculationMode);
        const loadedParameters = cfg ? asRecord(cfg.parameters) : undefined;
        const loadedOptional = loadedParameters
          ? asRecord(loadedParameters.optional_layers)
          : undefined;
        if (loadedOptional) {
          setOptionalLayers({
            weather_overlay: Boolean(loadedOptional.weather_overlay),
            terrain_analysis: Boolean(loadedOptional.terrain_analysis),
            historical_fires: Boolean(loadedOptional.historical_fires),
          });
        }
        const loadedUserInputs = cfg ? asRecord(cfg.user_inputs) : undefined;
        if (loadedUserInputs) {
          if (typeof loadedUserInputs.station_data === "string") {
            setStoredStationDataName(loadedUserInputs.station_data);
          }
          if (typeof loadedUserInputs.dtm === "string") {
            setStoredDtmName(loadedUserInputs.dtm);
          }
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
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, modelId]);

  useEffect(() => {
    if (editMode && loadedCoordinates && loadedCoordinates.length > 0) {
      setAllPolygons(loadedCoordinates);
    }
  }, [editMode, loadedCoordinates, setAllPolygons]);

  // ── Save / cancel ─────────────────────────────────────────────────
  const handleCancel = useCallback((): void => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate(DASHBOARD_ROUTE);
  }, [onCancel, navigate]);

  const handleSave = useCallback(
    async (opts?: { runAfterSave?: boolean }): Promise<void> => {
      if (!fromDate || !toDate || !modelName.trim() || allPolygons.length === 0) return;
      if (calculationMode === "static" && fromDate !== toDate) return;
      if (calculationMode === "static" && !availableStaticDates.includes(fromDate)) return;
      if (calculationMode === "dynamic" && fromDate > toDate) return;
      if (
        calculationMode === "dynamic" &&
        !dateRangeHasOnlyAvailableDates(fromDate, toDate, availableDynamicDates)
      )
        return;
      if (areaInputMode === "region" && (!selectedRegionName || isResolvingRegion)) return;
      setIsSaving(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
        const areaData: AreaData = {
          fromDate,
          toDate,
          bufferDistance,
          calculationMode,
          usePrecomputed,
          modelName: modelName.trim(),
          timestamp: new Date().toISOString(),
        };

        if (onAreaSelected) {
          onAreaSelected(areaData);
          return;
        }

        const coordinatesGeoJSON = {
          type: "MultiPolygon",
          coordinates: allPolygons.map((polygon) => [polygon]),
        };

        let region = areaInputMode === "region" ? (selectedRegionName ?? "") : "";
        let country = areaInputMode === "region" ? (selectedRegionCountry ?? "") : "";
        if (!region || !country) {
          const resolvedLocation = await lookupRegionForPolygons(allPolygons);
          region ||= resolvedLocation.region;
          country ||= resolvedLocation.country;
        }
        const originalParameters = asRecord(originalConfig?.parameters);

        const modelData = {
          title: areaData.modelName,
          from_date: areaData.fromDate,
          to_date: areaData.toDate,
          workspace_id: currentWorkspace?.id,
          region,
          country,
          coordinates: coordinatesGeoJSON,
          config: {
            ...(originalConfig ?? {}),
            buffer_distance: areaData.bufferDistance,
            parameters: {
              ...(originalParameters ?? {}),
              calculation_mode: areaData.calculationMode,
              optional_layers: optionalLayers,
              // off (or date not precomputed) = compute all steps fresh
              force_compute: !(
                areaData.usePrecomputed &&
                areaData.calculationMode === "dynamic" &&
                fromDate === toDate &&
                availablePrecomputedDates.includes(fromDate)
              ),
            },
            area_input: {
              method: areaInputMode,
              uploaded_geojson_name: uploadedGeoJsonName ?? null,
              selected_region_name:
                areaInputMode === "region" ? (selectedRegionName ?? null) : null,
              selected_region_country:
                areaInputMode === "region" ? (selectedRegionCountry ?? null) : null,
            },
          } as Record<string, unknown>,
        };

        let savedModelId: number | undefined;
        if (editMode && modelId) {
          await updateModelMutation.mutateAsync({ id: modelId, data: modelData });
          savedModelId = modelId;
        } else {
          const created = await createModelMutation.mutateAsync(modelData);
          savedModelId = created?.data?.id;
        }

        // Upload optional input files (station data + DTM) before any calculation.
        if (savedModelId && (stationDataFile || dtmFile)) {
          try {
            await modelService.uploadModelInputs(savedModelId, {
              stationData: stationDataFile,
              dtm: dtmFile,
            });
          } catch (error) {
            onError?.(
              describeError(
                error,
                errorMessages?.uploadInputs ??
                  "The model was saved, but its input files could not be uploaded."
              )
            );
          }
        }

        if (opts?.runAfterSave && savedModelId) {
          try {
            await modelService.startCalculation(savedModelId);
          } catch (error) {
            onError?.(
              describeError(
                error,
                errorMessages?.startCalculation ??
                  "The model was saved, but the calculation could not be started."
              )
            );
          }
        }

        navigate(DASHBOARD_ROUTE, { state: { workspaceId: currentWorkspace?.id } });
      } catch (error) {
        // #68: a failed save used to leave the wizard sitting there silently.
        onError?.(
          describeError(
            error,
            editMode
              ? errorMessages?.save ?? "The model could not be saved. Please try again."
              : errorMessages?.create ?? "The model could not be created. Please try again."
          )
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      fromDate,
      toDate,
      modelName,
      bufferDistance,
      calculationMode,
      usePrecomputed,
      availablePrecomputedDates,
      availableStaticDates,
      availableDynamicDates,
      editMode,
      modelId,
      onAreaSelected,
      allPolygons,
      areaInputMode,
      uploadedGeoJsonName,
      selectedRegionName,
      selectedRegionCountry,
      isResolvingRegion,
      currentWorkspace?.id,
      originalConfig,
      optionalLayers,
      stationDataFile,
      dtmFile,
      updateModelMutation,
      createModelMutation,
      navigate,
      onError,
      errorMessages,
    ]
  );

  return {
    isSaving,
    isLoadingModel,
    handleSave,
    handleCancel,
  };
};

export type ModelCreationApi = ReturnType<typeof useModelCreation>;
