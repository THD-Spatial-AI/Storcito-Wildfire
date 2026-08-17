import { useCallback, useState } from 'react';
import { extractPolygonsFromGeoJSON } from './utils';
import type { AreaSelectStateApi } from './useAreaSelectState';
import type { AdministrativeRegionResult } from '@/features/interactive-map/services/geocoding';

export interface UseMapDrawingOptions {
    state: AreaSelectStateApi;
}

export const useMapDrawing = ({ state }: UseMapDrawingOptions) => {
    const {
        setAreaInputModeRaw,
        setUploadedGeoJsonName,
        setGeoJsonUploadError,
    } = state;

    const [allPolygons, setAllPolygons] = useState<[number, number][][]>([]);
    const [loadedCoordinates, setLoadedCoordinates] = useState<[number, number][][] | undefined>();
    const [clearTrigger, setClearTrigger] = useState(0);
    const [selectedRegionName, setSelectedRegionName] = useState<string | undefined>();
    const [selectedRegionCountry, setSelectedRegionCountry] = useState<string | undefined>();
    const [isResolvingRegion, setIsResolvingRegion] = useState(false);
    const [regionSelectionError, setRegionSelectionError] = useState<string | undefined>();

    const resetRegionSelection = useCallback(() => {
        setSelectedRegionName(undefined);
        setSelectedRegionCountry(undefined);
        setIsResolvingRegion(false);
        setRegionSelectionError(undefined);
    }, []);

    const handlePolygonDrawn = useCallback(
        async (_coordinates: [number, number][], polygons: [number, number][][]) => {
            setAreaInputModeRaw('draw');
            setUploadedGeoJsonName(undefined);
            setGeoJsonUploadError(undefined);
            setLoadedCoordinates(undefined);
            setAllPolygons(polygons);
            resetRegionSelection();
        },
        [resetRegionSelection, setAreaInputModeRaw, setUploadedGeoJsonName, setGeoJsonUploadError],
    );

    const handlePolygonModified = useCallback(
        async (updatedPolygons: [number, number][][]) => {
            if (updatedPolygons.length > 0) setGeoJsonUploadError(undefined);
            setAllPolygons(updatedPolygons);
            resetRegionSelection();
        },
        [resetRegionSelection, setGeoJsonUploadError],
    );

    const handleGeoJsonUpload = useCallback(
        async (file: File): Promise<void> => {
            try {
                const parsed = JSON.parse(await file.text()) as unknown;
                const polygons = extractPolygonsFromGeoJSON(parsed);
                if (polygons.length === 0) {
                    throw new Error('Upload a GeoJSON file containing Polygon or MultiPolygon geometry.');
                }

                setAreaInputModeRaw('upload');
                setUploadedGeoJsonName(file.name);
                setGeoJsonUploadError(undefined);
                setLoadedCoordinates(polygons);
                setAllPolygons(polygons);
                resetRegionSelection();
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Could not read this GeoJSON file.';
                setGeoJsonUploadError(message);
            }
        },
        [resetRegionSelection, setAreaInputModeRaw, setUploadedGeoJsonName, setGeoJsonUploadError],
    );

    const beginRegionSelection = useCallback(() => {
        setIsResolvingRegion(true);
        setRegionSelectionError(undefined);
    }, []);

    const handleRegionSelected = useCallback(
        (region: AdministrativeRegionResult) => {
            const polygons = extractPolygonsFromGeoJSON(region.geojson);
            if (polygons.length === 0) {
                setIsResolvingRegion(false);
                setRegionSelectionError('The selected region did not contain a usable Polygon or MultiPolygon boundary.');
                return;
            }

            setAreaInputModeRaw('region');
            setUploadedGeoJsonName(undefined);
            setGeoJsonUploadError(undefined);
            setSelectedRegionName(region.name);
            setSelectedRegionCountry(region.country || undefined);
            setRegionSelectionError(undefined);
            setIsResolvingRegion(false);
            setLoadedCoordinates(polygons);
            setAllPolygons(polygons);
        },
        [setAreaInputModeRaw, setGeoJsonUploadError, setUploadedGeoJsonName],
    );

    const handleRegionSelectionError = useCallback((message: string) => {
        setIsResolvingRegion(false);
        setRegionSelectionError(message);
    }, []);

    const cancelRegionSelection = useCallback(() => {
        setIsResolvingRegion(false);
    }, []);

    const handleClearAllPolygons = useCallback(() => {
        setAllPolygons([]);
        setLoadedCoordinates(undefined);
        setUploadedGeoJsonName(undefined);
        setGeoJsonUploadError(undefined);
        resetRegionSelection();
        setClearTrigger((prev) => prev + 1);
    }, [resetRegionSelection, setUploadedGeoJsonName, setGeoJsonUploadError]);

    return {
        allPolygons,
        setAllPolygons,
        loadedCoordinates,
        setLoadedCoordinates,
        selectedRegionName,
        setSelectedRegionName,
        selectedRegionCountry,
        setSelectedRegionCountry,
        isResolvingRegion,
        regionSelectionError,
        clearTrigger,
        handlePolygonDrawn,
        handlePolygonModified,
        handleGeoJsonUpload,
        beginRegionSelection,
        handleRegionSelected,
        handleRegionSelectionError,
        cancelRegionSelection,
        handleClearAllPolygons,
    };
};

export type MapDrawingApi = ReturnType<typeof useMapDrawing>;
