import { useCallback, useEffect, useState } from "react";
import { settingsService } from "@/features/settings";
import {
  DEFAULT_BUFFER_DISTANCE,
  clampBuffer,
} from "@/features/configurator/constants/buffer-distance";
import {
  DUMMY_DYNAMIC_DATES,
  DUMMY_PRECOMPUTED_DATES,
  DUMMY_STATIC_DATES,
  dummyDatesEnabled,
} from "@/features/configurator/utils/dummyDates";
import { webservicesService } from "@/features/admin-dashboard";
import type {
  AreaInputMode,
  CalculationMode,
  DateRangeSelection,
} from "@/features/configurator/types/area-select";
import type { OptionalLayerKey } from "@/features/configurator/region-selector/components/layers/types";
import { readDtmPreview } from "@/features/configurator/utils/dtmFootprint";

const DEFAULT_OPTIONAL_LAYERS: Record<OptionalLayerKey, boolean> = {
  weather_overlay: true,
  terrain_analysis: true,
  historical_fires: true,
};

export interface UseAreaSelectStateOptions {
  editMode: boolean;
}

export const useAreaSelectState = ({ editMode }: UseAreaSelectStateOptions) => {
  const [modelName, setModelName] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [bufferDistance, setBufferDistanceRaw] = useState<number>(DEFAULT_BUFFER_DISTANCE);
  const [calculationMode, setCalculationMode] = useState<CalculationMode>("static");
  const [usePrecomputed, setUsePrecomputed] = useState(true);
  const [availableStaticDates, setAvailableStaticDates] = useState<string[]>([]);
  const [availableDynamicDates, setAvailableDynamicDates] = useState<string[]>([]);
  const [availablePrecomputedDates, setAvailablePrecomputedDates] = useState<string[]>([]);
  const [isLoadingStaticDates, setIsLoadingStaticDates] = useState(true);
  const [isLoadingDynamicDates, setIsLoadingDynamicDates] = useState(true);
  const [staticDatesError, setStaticDatesError] = useState<string | undefined>();
  const [dynamicDatesError, setDynamicDatesError] = useState<string | undefined>();
  const [originalConfig, setOriginalConfig] = useState<Record<string, unknown> | undefined>(
    undefined
  );

  const [areaInputMode, setAreaInputModeRaw] = useState<AreaInputMode>("draw");
  const [uploadedGeoJsonName, setUploadedGeoJsonName] = useState<string | undefined>();
  const [geoJsonUploadError, setGeoJsonUploadError] = useState<string | undefined>();

  const [optionalLayers, setOptionalLayersState] = useState<Record<OptionalLayerKey, boolean>>(
    () => ({ ...DEFAULT_OPTIONAL_LAYERS })
  );
  const setOptionalLayers = useCallback((value: Record<OptionalLayerKey, boolean>) => {
    setOptionalLayersState({ ...DEFAULT_OPTIONAL_LAYERS, ...value });
  }, []);
  const toggleOptionalLayer = useCallback((key: OptionalLayerKey) => {
    setOptionalLayersState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Optional per-model data uploads
  const [stationDataFile, setStationDataFileRaw] = useState<File | null>(null);
  const [stationDataName, setStationDataName] = useState<string | undefined>();
  const [stationDataError, setStationDataError] = useState<string | undefined>();
  const [dtmFile, setDtmFileRaw] = useState<File | null>(null);
  const [dtmName, setDtmName] = useState<string | undefined>();
  const [dtmError, setDtmError] = useState<string | undefined>();
  const [dtmFootprint, setDtmFootprint] = useState<[number, number][] | undefined>();
  const [dtmImageUrl, setDtmImageUrl] = useState<string | undefined>();
  const [dtmImageExtent, setDtmImageExtent] = useState<
    [number, number, number, number] | undefined
  >();
  const [dtmProcessing, setDtmProcessing] = useState(false);

  const setStationDataFile = useCallback((file: File | null) => {
    if (!file) {
      setStationDataFileRaw(null);
      setStationDataName(undefined);
      setStationDataError(undefined);
      return;
    }
    if (!/\.(xlsx|xls|csv|txt)$/i.test(file.name)) {
      setStationDataError("Use an Excel (.xlsx/.xls) or CSV (.csv) file.");
      return;
    }
    setStationDataError(undefined);
    setStationDataFileRaw(file);
    setStationDataName(file.name);
  }, []);

  const setStoredStationDataName = useCallback((name?: string) => {
    setStationDataFileRaw(null);
    setStationDataName(name);
    setStationDataError(undefined);
  }, []);

  const setDtmFile = useCallback((file: File | null) => {
    if (!file) {
      setDtmFileRaw(null);
      setDtmName(undefined);
      setDtmError(undefined);
      setDtmFootprint(undefined);
      setDtmImageUrl(undefined);
      setDtmImageExtent(undefined);
      return;
    }
    if (!/\.(tif|tiff)$/i.test(file.name)) {
      setDtmError("Use a GeoTIFF (.tif/.tiff) elevation raster.");
      return;
    }
    setDtmError(undefined);
    setDtmFileRaw(file);
    setDtmName(file.name);
    setDtmFootprint(undefined);
    setDtmImageUrl(undefined);
    setDtmImageExtent(undefined);
    setDtmProcessing(true);
    void readDtmPreview(file)
      .then((preview) => {
        if (!preview) {
          setDtmError("Could not read this GeoTIFF’s coverage/CRS; map preview is unavailable.");
          return;
        }
        if (preview.footprint) setDtmFootprint(preview.footprint);
        if (preview.imageDataUrl && preview.imageExtent3857) {
          setDtmImageUrl(preview.imageDataUrl);
          setDtmImageExtent(preview.imageExtent3857);
        }
      })
      .finally(() => setDtmProcessing(false));
  }, []);

  const setStoredDtmName = useCallback((name?: string) => {
    setDtmFileRaw(null);
    setDtmName(name);
    setDtmError(undefined);
    setDtmFootprint(undefined);
    setDtmImageUrl(undefined);
    setDtmImageExtent(undefined);
    setDtmProcessing(false);
  }, []);

  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const [showAreaSelectTour, setShowAreaSelectTour] = useState(false);

  const setBufferDistance = useCallback((value: number) => {
    setBufferDistanceRaw(clampBuffer(value));
  }, []);

  const setAreaInputMode = useCallback((mode: AreaInputMode) => {
    setAreaInputModeRaw(mode);
    setGeoJsonUploadError(undefined);
  }, []);

  const handleUpdateRange = useCallback((e: DateRangeSelection) => {
    const formatDate = ({ year, month, day }: { year: number; month: number; day: number }) =>
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setFromDate(formatDate(e.start));
    setToDate(formatDate(e.end));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingStaticDates(true);
        setIsLoadingDynamicDates(true);
        setStaticDatesError(undefined);
        setDynamicDatesError(undefined);
        const [staticDates, dynamicDates, precomputedDates] = await Promise.all([
          webservicesService.getAvailableStaticDates(),
          webservicesService.getAvailableDynamicDates(),
          webservicesService.getAvailablePrecomputedDates().catch(() => []),
        ]);
        if (!cancelled) {
          const useDummy = dummyDatesEnabled();
          const withFallback = (dates: string[], fallback: () => string[]) =>
            dates.length === 0 && useDummy ? fallback() : dates;

          setAvailableStaticDates([...new Set(withFallback(staticDates, DUMMY_STATIC_DATES))].sort());
          setAvailableDynamicDates([...new Set(withFallback(dynamicDates, DUMMY_DYNAMIC_DATES))].sort());
          setAvailablePrecomputedDates(
            [...new Set(withFallback(precomputedDates, DUMMY_PRECOMPUTED_DATES))].sort(),
          );
        }
      } catch {
        if (!cancelled) {
          if (dummyDatesEnabled()) {
            setAvailableStaticDates(DUMMY_STATIC_DATES());
            setAvailableDynamicDates(DUMMY_DYNAMIC_DATES());
            setAvailablePrecomputedDates(DUMMY_PRECOMPUTED_DATES());
          } else {
            setAvailableStaticDates([]);
            setAvailableDynamicDates([]);
            setStaticDatesError("Unable to load available static dates.");
            setDynamicDatesError("Unable to load available dynamic dates.");
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStaticDates(false);
          setIsLoadingDynamicDates(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preselect dummy date.
  useEffect(() => {
    if (editMode || !dummyDatesEnabled() || fromDate || toDate) return;
    if (calculationMode === "static") {
      const latest = availableStaticDates.at(-1);
      if (latest) {
        setFromDate(latest);
        setToDate(latest);
      }
      return;
    }
    const start = availableDynamicDates.at(-3) ?? availableDynamicDates[0];
    const end = availableDynamicDates.at(-1);
    if (start && end) {
      setFromDate(start);
      setToDate(end);
    }
  }, [availableDynamicDates, availableStaticDates, calculationMode, editMode, fromDate, toDate]);

  useEffect(() => {
    if (editMode) return;
    let cancelled = false;
    (async () => {
      try {
        const data = (await settingsService.getAllSettings()) as Record<string, unknown>;
        if (!cancelled && data && !data.area_select_tour_completed) {
          setTimeout(() => !cancelled && setShowAreaSelectTour(true), 1000);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editMode]);

  useEffect(() => {
    const handleRestartTour = () => setShowAreaSelectTour(true);
    globalThis.addEventListener("restart-area-select-tour", handleRestartTour);
    return () => globalThis.removeEventListener("restart-area-select-tour", handleRestartTour);
  }, []);

  const handleTourComplete = useCallback(() => {
    setShowAreaSelectTour(false);
    void settingsService.markAreaSelectTourCompleted();
  }, []);

  const handleTourSkip = useCallback(() => {
    setShowAreaSelectTour(false);
    void settingsService.markAreaSelectTourCompleted();
  }, []);

  return {
    // form fields
    modelName,
    setModelName,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    bufferDistance,
    setBufferDistance,
    setBufferDistanceRaw,
    calculationMode,
    setCalculationMode,
    usePrecomputed,
    setUsePrecomputed,
    availablePrecomputedDates,
    availableStaticDates,
    availableDynamicDates,
    isLoadingStaticDates,
    isLoadingDynamicDates,
    staticDatesError,
    dynamicDatesError,
    originalConfig,
    setOriginalConfig,
    // area input
    areaInputMode,
    setAreaInputMode,
    setAreaInputModeRaw,
    uploadedGeoJsonName,
    setUploadedGeoJsonName,
    geoJsonUploadError,
    setGeoJsonUploadError,
    // Optional layers.
    optionalLayers,
    setOptionalLayers,
    toggleOptionalLayer,
    // optional per-model data uploads
    stationDataFile,
    stationDataName,
    stationDataError,
    setStationDataFile,
    setStoredStationDataName,
    dtmFile,
    dtmName,
    dtmError,
    dtmFootprint,
    dtmImageUrl,
    dtmImageExtent,
    dtmProcessing,
    setDtmFile,
    setStoredDtmName,
    // drawing flags
    isDrawing,
    setIsDrawing,
    cursorPos,
    setCursorPos,
    // tour
    showAreaSelectTour,
    setShowAreaSelectTour,
    handleUpdateRange,
    handleTourComplete,
    handleTourSkip,
  };
};

export type AreaSelectStateApi = ReturnType<typeof useAreaSelectState>;
