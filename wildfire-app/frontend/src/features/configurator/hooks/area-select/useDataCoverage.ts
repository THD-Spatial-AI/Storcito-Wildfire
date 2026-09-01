import { useEffect, useMemo, useRef, useState } from "react";
import GeoJSON from "ol/format/GeoJSON";
import type Geometry from "ol/geom/Geometry";
import type { Coordinate } from "ol/coordinate";

import {
  webservicesService,
  type StorcitoCoverageFeatureCollection,
} from "@/features/admin-dashboard/services/webservices";

// Fetched once, shared.
let coveragePromise: Promise<StorcitoCoverageFeatureCollection | null> | null = null;

const loadCoverage = () => {
  coveragePromise ??= webservicesService.getAvailableDataCoverage().catch(() => null);
  return coveragePromise;
};

interface DataCoverage {
  containsCoordinate: (coordinate: Coordinate) => boolean | null;
  /** Covered region names. */
  coverageNames: string[];
}

const readName = (properties: Record<string, unknown> | undefined) => {
  for (const key of ["name", "region", "title", "label"]) {
    const value = properties?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

/** Coverage as geometry. */
export const useDataCoverage = (): DataCoverage => {
  const [coverage, setCoverage] = useState<StorcitoCoverageFeatureCollection | null>(null);
  const geometriesRef = useRef<Geometry[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadCoverage().then((data) => {
      if (!cancelled) setCoverage(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const coverageNames = useMemo(() => {
    if (!coverage?.features?.length) return [];
    const names = coverage.features
      .map((feature) => readName(feature.properties))
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [coverage]);

  useEffect(() => {
    if (!coverage?.features?.length) {
      geometriesRef.current = [];
      return;
    }
    try {
      geometriesRef.current = new GeoJSON()
        .readFeatures(coverage, { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" })
        .map((feature) => feature.getGeometry())
        .filter((geometry): geometry is Geometry => Boolean(geometry));
    } catch {
      geometriesRef.current = [];
    }
  }, [coverage]);

  const containsCoordinate = useMemo(
    () => (coordinate: Coordinate) => {
      const geometries = geometriesRef.current;
      if (geometries.length === 0) return null;
      return geometries.some((geometry) => geometry.intersectsCoordinate(coordinate));
    },
    []
  );

  return { containsCoordinate, coverageNames };
};
