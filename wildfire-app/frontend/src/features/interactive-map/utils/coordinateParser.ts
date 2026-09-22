/** Coordinate query parsing. */

export interface ParsedCoordinate {
  latitude: number;
  longitude: number;
}

const NUMBER = "[+-]?\\d+(?:[.,]\\d+)?";

const isFiniteInRange = (value: number, min: number, max: number) =>
  Number.isFinite(value) && value >= min && value <= max;

const toNumber = (raw: string) => Number.parseFloat(raw.replace(",", "."));

const applyHemisphere = (value: number, hemisphere: string | undefined) => {
  const h = hemisphere?.toUpperCase();
  if (h === "S" || h === "W") return -Math.abs(value);
  if (h === "N" || h === "E") return Math.abs(value);
  return value;
};

const parseLabeled = (query: string): ParsedCoordinate | null => {
  const latMatch = query.match(new RegExp(`\\blat(?:itude)?\\s*[:=]?\\s*(${NUMBER})`, "i"));
  const lonMatch = query.match(new RegExp(`\\b(?:lon|lng|long|longitude)\\s*[:=]?\\s*(${NUMBER})`, "i"));
  if (!latMatch || !lonMatch) return null;
  return { latitude: toNumber(latMatch[1]), longitude: toNumber(lonMatch[1]) };
};

const parsePair = (query: string): ParsedCoordinate | null => {
  const match = query.match(
    new RegExp(
      `^\\s*(${NUMBER})\\s*([NSEW]?)(?:\\s*[,;]\\s*|\\s+)(${NUMBER})\\s*([NSEW]?)\\s*$`,
      "i"
    )
  );
  if (!match) return null;

  const first = applyHemisphere(toNumber(match[1]), match[2]);
  const second = applyHemisphere(toNumber(match[3]), match[4]);

  const h1 = match[2]?.toUpperCase();
  const h2 = match[4]?.toUpperCase();
  if (h1 === "E" || h1 === "W" || h2 === "N" || h2 === "S") {
    return { latitude: second, longitude: first };
  }
  // Swap implausible latitudes
  if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
    return { latitude: second, longitude: first };
  }
  return { latitude: first, longitude: second };
};

/** Parse query coordinates. */
export const parseCoordinateQuery = (query: string): ParsedCoordinate | null => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const parsed = parseLabeled(trimmed) ?? parsePair(trimmed);
  if (!parsed) return null;

  if (
    !isFiniteInRange(parsed.latitude, -90, 90) ||
    !isFiniteInRange(parsed.longitude, -180, 180)
  ) {
    return null;
  }
  return parsed;
};
