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
    const [isLoadingStaticDates, setIsLoadingStaticDates] = useState(true);
    const [staticDatesError, setStaticDatesError] = useState<string | undefined>();
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
                setStaticDatesError(undefined);
                const dates = await webservicesService.getAvailableStaticDates();
                if (!cancelled) {
                    setAvailableStaticDates([...new Set(dates)].sort());
                }
            } catch {
                if (!cancelled) {
                    setAvailableStaticDates([]);
                    setStaticDatesError('Unable to load available static dates.');
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingStaticDates(false);
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
        availableStaticDates, isLoadingStaticDates, staticDatesError,
        originalConfig, setOriginalConfig,
        // area input
        areaInputMode, setAreaInputMode, setAreaInputModeRaw,
        uploadedGeoJsonName, setUploadedGeoJsonName,
        geoJsonUploadError, setGeoJsonUploadError,
        // optional layers (forwarded to STORCITO as parameters.optional_layers)
        optionalLayers, setOptionalLayers, toggleOptionalLayer,
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
