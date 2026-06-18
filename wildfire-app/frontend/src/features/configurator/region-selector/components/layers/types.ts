import type { ChangeEvent } from "react";
import type { DateValue } from "@internationalized/date";
import type { AreaSelectState, AreaSelectActions } from "@/features/configurator/types/area-select";

export type OptionalLayerKey = "weather_overlay" | "terrain_analysis" | "historical_fires";

export interface AreaStats {
    area: string;
    perimeter: string;
    regions: number;
}

export interface DateBounds {
    minValue: DateValue;
    maxValue: DateValue;
    minYear: number;
    maxYear: number;
}

export interface ConfiguratorContext {
    state: AreaSelectState;
    actions: AreaSelectActions;
    allPolygonsCount: number;
    polygonCoordinates: [number, number][][];
    areaStats: AreaStats | null;
    editMode: boolean;
    handleModelNameChange: (e: ChangeEvent<HTMLInputElement>) => void;
    getDateBounds: () => DateBounds;
    optionalLayers: Record<OptionalLayerKey, boolean>;
    toggleOptionalLayer: (key: OptionalLayerKey) => void;
}
