import { useCallback, useEffect, useState } from 'react';
import { settingsService } from '@/features/settings/services/settings';
import { DEFAULT_BUFFER_DISTANCE, clampBuffer } from '@/features/configurator/constants/buffer-distance';
import { webservicesService } from '@/features/admin-dashboard/services/webservices';
import type { AreaInputMode, CalculationMode, DateRangeSelection } from '@/features/configurator/types/area-select';
import type { OptionalLayerKey } from '@/features/configurator/region-selector/components/layers/types';

const DEFAULT_OPTIONAL_LAYERS: Record<OptionalLayerKey, boolean> = {
    weather_overlay: true,
    terrain_analysis: true,
    historical_fires: true,
};

export interface UseAreaSelectStateOptions {
    editMode: boolean;
}

export const useAreaSelectState = ({ editMode }: UseAreaSelectStateOptions) => {
    const [modelName, setModelName] = useState<string>('');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [bufferDistance, setBufferDistanceRaw] = useState<number>(DEFAULT_BUFFER_DISTANCE);
    const [calculationMode, setCalculationMode] = useState<CalculationMode>('static');
    const [availableStaticDates, setAvailableStaticDates] = useState<string[]>([]);
    const [availableDynamicDates, setAvailableDynamicDates] = useState<string[]>([]);
    const [isLoadingStaticDates, setIsLoadingStaticDates] = useState(true);
    const [isLoadingDynamicDates, setIsLoadingDynamicDates] = useState(true);
    const [staticDatesError, setStaticDatesError] = useState<string | undefined>();
    const [dynamicDatesError, setDynamicDatesError] = useState<string | undefined>();
    const [originalConfig, setOriginalConfig] = useState<Record<string, unknown> | undefined>(undefined);

    const [areaInputMode, setAreaInputModeRaw] = useState<AreaInputMode>('draw');
    const [uploadedGeoJsonName, setUploadedGeoJsonName] = useState<string | undefined>();
    const [geoJsonUploadError, setGeoJsonUploadError] = useState<string | undefined>();

    const [optionalLayers, setOptionalLayersState] = useState<Record<OptionalLayerKey, boolean>>(
        () => ({ ...DEFAULT_OPTIONAL_LAYERS }),
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

    const setStationDataFile = useCallback((file: File | null) => {
        if (!file) {
            setStationDataFileRaw(null);
            setStationDataName(undefined);
            setStationDataError(undefined);
            return;
        }
        if (!/\.(xlsx|xls|csv|txt)$/i.test(file.name)) {
            setStationDataError('Use an Excel (.xlsx/.xls) or CSV (.csv) file.');
            return;
        }
        setStationDataError(undefined);
        setStationDataFileRaw(file);
        setStationDataName(file.name);
    }, []);

    const setDtmFile = useCallback((file: File | null) => {
        if (!file) {
            setDtmFileRaw(null);
            setDtmName(undefined);
            setDtmError(undefined);
            return;
        }
        if (!/\.(tif|tiff)$/i.test(file.name)) {
            setDtmError('Use a GeoTIFF (.tif/.tiff) elevation raster.');
            return;
        }
        setDtmError(undefined);
        setDtmFileRaw(file);
        setDtmName(file.name);
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
            `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
                const [staticDates, dynamicDates] = await Promise.all([
                    webservicesService.getAvailableStaticDates(),
                    webservicesService.getAvailableDynamicDates(),
                ]);
                if (!cancelled) {
                    setAvailableStaticDates([...new Set(staticDates)].sort());
                    setAvailableDynamicDates([...new Set(dynamicDates)].sort());
                }
            } catch {
                if (!cancelled) {
                    setAvailableStaticDates([]);
                    setAvailableDynamicDates([]);
                    setStaticDatesError('Unable to load available static dates.');
                    setDynamicDatesError('Unable to load available dynamic dates.');
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
        globalThis.addEventListener('restart-area-select-tour', handleRestartTour);
        return () => globalThis.removeEventListener('restart-area-select-tour', handleRestartTour);
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
        modelName, setModelName,
        fromDate, setFromDate,
        toDate, setToDate,
        bufferDistance, setBufferDistance, setBufferDistanceRaw,
        calculationMode, setCalculationMode,
        availableStaticDates, availableDynamicDates,
        isLoadingStaticDates, isLoadingDynamicDates,
        staticDatesError, dynamicDatesError,
        originalConfig, setOriginalConfig,
        // area input
        areaInputMode, setAreaInputMode, setAreaInputModeRaw,
        uploadedGeoJsonName, setUploadedGeoJsonName,
        geoJsonUploadError, setGeoJsonUploadError,
        // optional layers (forwarded to STORCITO as parameters.optional_layers)
        optionalLayers, setOptionalLayers, toggleOptionalLayer,
        // optional per-model data uploads
        stationDataFile, stationDataName, stationDataError, setStationDataFile,
        dtmFile, dtmName, dtmError, setDtmFile,
        // drawing flags
        isDrawing, setIsDrawing,
        cursorPos, setCursorPos,
        // tour
        showAreaSelectTour, setShowAreaSelectTour,
        handleUpdateRange,
        handleTourComplete,
        handleTourSkip,
    };
};

export type AreaSelectStateApi = ReturnType<typeof useAreaSelectState>;
