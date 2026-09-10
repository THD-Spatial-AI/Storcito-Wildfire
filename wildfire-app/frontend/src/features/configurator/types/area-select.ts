import type { AdministrativeRegionResult } from '@/features/interactive-map';
import type { OptionalLayerKey } from '@/features/configurator/region-selector/components/layers/types';

export type AreaInputMode = 'draw' | 'upload' | 'region';
export type CalculationMode = 'static' | 'dynamic';

interface DateParts {
	year: number;
	month: number;
	day: number;
}

export interface DateRangeSelection {
	start: DateParts;
	end: DateParts;
}

export interface AreaData {
	fromDate: string;
	toDate: string;
	bufferDistance: number;
	calculationMode: CalculationMode;
	usePrecomputed: boolean;
	modelName: string;
	timestamp: string;
	region?: string;
	coordinates?: [number, number];
}

export interface UseAreaSelectProps {
	onAreaSelected?: (areaData: AreaData) => void;
	onCancel?: () => void;
	editMode?: boolean;
	existingModelId?: number;
}

export interface AreaSelectState {
	modelName: string;
	fromDate: string;
	toDate: string;
	bufferDistance: number;
	calculationMode: CalculationMode;
	usePrecomputed: boolean;
	availablePrecomputedDates: string[];
	availableStaticDates: string[];
	availableDynamicDates: string[];
	isLoadingStaticDates: boolean;
	isLoadingDynamicDates: boolean;
	staticDatesError?: string;
	dynamicDatesError?: string;
	isSaving: boolean;
	isLoadingModel: boolean;
	showAreaSelectTour: boolean;
	loadedCoordinates?: [number, number][][];
	allPolygons: [number, number][][];
	areaInputMode: AreaInputMode;
	uploadedGeoJsonName?: string;
	geoJsonUploadError?: string;
	selectedRegionName?: string;
	selectedRegionCountry?: string;
	isResolvingRegion: boolean;
	regionSelectionError?: string;
	isDrawing: boolean;
	clearTrigger: number;
	cursorPos: { x: number; y: number } | null;
	optionalLayers: Record<OptionalLayerKey, boolean>;
	// Optional uploads.
	stationDataName?: string;
	stationDataError?: string;
	dtmName?: string;
	dtmError?: string;
	dtmFootprint?: [number, number][];
	dtmImageUrl?: string;
	dtmImageExtent?: [number, number, number, number];
	dtmProcessing?: boolean;
}

export interface AreaSelectActions {
	setModelName: (name: string) => void;
	setBufferDistance: (distance: number) => void;
	setCalculationMode: (mode: CalculationMode) => void;
	setUsePrecomputed: (value: boolean) => void;
	handleUpdateRange: (range: DateRangeSelection) => void;
	setShowAreaSelectTour: (show: boolean) => void;
	handleTourComplete: () => void;
	handleTourSkip: () => void;
	handleSave: (opts?: { runAfterSave?: boolean }) => Promise<void>;
	handleCancel: () => void;
	setAllPolygons: (polygons: [number, number][][]) => void;
	setAreaInputMode: (mode: AreaInputMode) => void;
	handleGeoJsonUpload: (file: File) => Promise<void>;
	beginRegionSelection: () => void;
	handleRegionSelected: (region: AdministrativeRegionResult) => void;
	handleRegionSelectionError: (message: string) => void;
	cancelRegionSelection: () => void;
	handlePolygonDrawn: (coordinates: [number, number][], allPolygons: [number, number][][]) => Promise<void>;
	handlePolygonModified: (allPolygons: [number, number][][]) => Promise<void>;
	handleClearAllPolygons: () => void;
	setIsDrawing: (isDrawing: boolean) => void;
	toggleOptionalLayer: (key: OptionalLayerKey) => void;
	setStationDataFile: (file: File | null) => void;
	setDtmFile: (file: File | null) => void;
}
