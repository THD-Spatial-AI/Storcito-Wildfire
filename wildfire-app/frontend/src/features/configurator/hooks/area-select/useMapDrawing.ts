import { useCallback, useState } from 'react';
import { extractPolygonsFromGeoJSON } from './utils';
import type { AreaSelectStateApi } from './useAreaSelectState';

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

    const handlePolygonDrawn = useCallback(
        async (_coordinates: [number, number][], polygons: [number, number][][]) => {
            setAreaInputModeRaw('draw');
            setUploadedGeoJsonName(undefined);
            setGeoJsonUploadError(undefined);
            setLoadedCoordinates(undefined);
            setAllPolygons(polygons);
        },
        [setAreaInputModeRaw, setUploadedGeoJsonName, setGeoJsonUploadError],
    );

    const handlePolygonModified = useCallback(
        async (updatedPolygons: [number, number][][]) => {
            if (updatedPolygons.length > 0) setGeoJsonUploadError(undefined);
            setAllPolygons(updatedPolygons);
        },
        [setGeoJsonUploadError],
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
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Could not read this GeoJSON file.';
                setGeoJsonUploadError(message);
            }
        },
        [setAreaInputModeRaw, setUploadedGeoJsonName, setGeoJsonUploadError],
    );

    const handleClearAllPolygons = useCallback(() => {
        setAllPolygons([]);
        setLoadedCoordinates(undefined);
        setUploadedGeoJsonName(undefined);
        setGeoJsonUploadError(undefined);
        setClearTrigger((prev) => prev + 1);
    }, [setUploadedGeoJsonName, setGeoJsonUploadError]);

    return {
        allPolygons,
        setAllPolygons,
        loadedCoordinates,
        setLoadedCoordinates,
        clearTrigger,
        handlePolygonDrawn,
        handlePolygonModified,
        handleGeoJsonUpload,
        handleClearAllPolygons,
    };
};

export type MapDrawingApi = ReturnType<typeof useMapDrawing>;
