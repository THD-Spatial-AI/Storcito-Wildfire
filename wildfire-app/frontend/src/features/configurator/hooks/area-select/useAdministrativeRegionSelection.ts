import { useEffect, useRef } from "react";
import type Map from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import { toLonLat } from "ol/proj";

import {
  geocodingService,
  type AdministrativeRegionResult,
} from "@/features/interactive-map";
import { removeSearchBoundaryLayer } from "@/features/interactive-map";

interface AdministrativeRegionSelectionOptions {
  map: Map | null;
  enabled: boolean;
  onStart: () => void;
  onSelected: (region: AdministrativeRegionResult) => void;
  onError: (message: string) => void;
  onCancel: () => void;
  isWithinCoverage?: (coordinate: number[]) => boolean | null;
  /** Covered region names. */
  coverageNames?: string[];
  /** Translated copy. */
  messages?: {
    notFound?: string;
    requestFailed?: string;
    outsideCoverage?: string;
  };
}

const NOT_FOUND_MESSAGE =
  "No administrative region boundary was found here. Try clicking farther inside the region.";
const REQUEST_FAILED_MESSAGE =
  "Could not load the administrative boundary. Check your connection and try again.";

const outsideCoverageMessage = (names: string[]) =>
  names.length > 0
    ? `Wildfire data is only available for ${names.join(", ")}. Click inside the shaded area.`
    : "That point is outside the area wildfire data covers. Click inside the shaded area.";

export const useAdministrativeRegionSelection = ({
  map,
  enabled,
  onStart,
  onSelected,
  onError,
  onCancel,
  isWithinCoverage,
  coverageNames,
  messages,
}: AdministrativeRegionSelectionOptions) => {
  const callbacksRef = useRef({ onStart, onSelected, onError, onCancel });
  const coverageRef = useRef({ isWithinCoverage, coverageNames, messages });

  useEffect(() => {
    callbacksRef.current = { onStart, onSelected, onError, onCancel };
  }, [onCancel, onError, onSelected, onStart]);

  useEffect(() => {
    coverageRef.current = { isWithinCoverage, coverageNames, messages };
  }, [coverageNames, isWithinCoverage, messages]);

  useEffect(() => {
    if (!map || !enabled) return;

    const viewport = map.getViewport();
    const previousCursor = viewport.style.cursor;
    let activeController: AbortController | null = null;
    let busy = false;
    let disposed = false;

    viewport.style.cursor = "crosshair";

    const handleClick = async (event: MapBrowserEvent) => {
      if (busy || disposed) return;

      const { isWithinCoverage, coverageNames, messages } = coverageRef.current;
      if (isWithinCoverage?.(event.coordinate) === false) {
        callbacksRef.current.onError(
          messages?.outsideCoverage ?? outsideCoverageMessage(coverageNames ?? [])
        );
        return;
      }

      busy = true;
      activeController = new AbortController();
      viewport.style.cursor = "progress";
      callbacksRef.current.onStart();

      const [longitude, latitude] = toLonLat(event.coordinate);

      try {
        const region = await geocodingService.reverseAdministrativeRegion(
          latitude,
          longitude,
          activeController.signal
        );

        if (disposed) return;
        if (!region) {
          callbacksRef.current.onError(coverageRef.current.messages?.notFound ?? NOT_FOUND_MESSAGE);
          return;
        }

        removeSearchBoundaryLayer(map);
        callbacksRef.current.onSelected(region);
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === "AbortError")) return;
        callbacksRef.current.onError(
          coverageRef.current.messages?.requestFailed ?? REQUEST_FAILED_MESSAGE
        );
      } finally {
        if (!disposed) {
          busy = false;
          activeController = null;
          viewport.style.cursor = "crosshair";
        }
      }
    };

    map.on("click", handleClick);

    return () => {
      disposed = true;
      activeController?.abort();
      map.un("click", handleClick);
      viewport.style.cursor = previousCursor;
      callbacksRef.current.onCancel();
    };
  }, [enabled, map]);
};
