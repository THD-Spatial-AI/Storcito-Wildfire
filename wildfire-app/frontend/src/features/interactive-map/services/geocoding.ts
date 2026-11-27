import axios from "@/lib/axios";

export interface GeocodingResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  source: string;
  geojson?: GeoJSON.GeoJSON;
}

export interface AdministrativeRegionResult {
  id: string;
  name: string;
  displayName: string;
  country: string;
  countryCode?: string;
  source: "nominatim" | "ine";
  geojson: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

/** nominatim proxy client */
class GeocodingService {
  /** search places */
  async search(query: string): Promise<GeocodingResult[]> {
    if (!query.trim()) return [];

    try {
      const response = await axios.get<{ success: boolean; data?: unknown }>("/geocoding/search", {
        params: { q: query },
      });
      const data = response.data?.data;

      type NominatimItem = {
        place_id?: number;
        display_name?: string;
        lat: string;
        lon: string;
        address?: {
          city?: string;
          town?: string;
          village?: string;
          state?: string;
          country?: string;
        };
        geojson?: GeoJSON.GeoJSON;
      };

      if (!Array.isArray(data)) return [];

      return (data as NominatimItem[]).map((item, index: number) => {
        const displayParts = [];

        if (item.address?.city) displayParts.push(item.address.city);
        else if (item.address?.town) displayParts.push(item.address.town);
        else if (item.address?.village) displayParts.push(item.address.village);

        if (item.address?.state) displayParts.push(item.address.state);
        if (item.address?.country) displayParts.push(item.address.country);

        const name = displayParts.length > 0 ? displayParts.join(", ") : item.display_name || "";

        return {
          id: `nominatim-${item.place_id || index}`,
          name: name,
          latitude: Number.parseFloat(item.lat),
          longitude: Number.parseFloat(item.lon),
          source: "nominatim",
          geojson: item.geojson,
        };
      });
    } catch (error) {
      if (import.meta.env.DEV) console.error("Geocoding search failed:", error);
      return [];
    }
  }

  /** place name lookup */
  async reverse(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await axios.get<{
        success: boolean;
        data?: { display_name?: string };
      }>("/geocoding/reverse", {
        params: { lat: latitude, lon: longitude },
      });
      return response.data?.data?.display_name || null;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Reverse geocoding failed:", error);
      return null;
    }
  }

  async reverseAdministrativeRegion(
    latitude: number,
    longitude: number,
    signal?: AbortSignal
  ): Promise<AdministrativeRegionResult | null> {
    const response = await axios.get<{
      success: boolean;
      data?: AdministrativeRegionResult;
    }>("/geocoding/administrative-region", {
      params: { lat: latitude, lon: longitude },
      signal,
    });
    const data = response.data?.data;
    const geometry = data?.geojson;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      return null;
    }
    return data;
  }

  /** region country lookup */
  async reverseRegion(
    latitude: number,
    longitude: number
  ): Promise<{ region: string; country: string } | null> {
    try {
      const response = await axios.get<{
        success: boolean;
        data?: {
          address?: {
            city?: string;
            town?: string;
            village?: string;
            municipality?: string;
            state?: string;
            county?: string;
            country?: string;
          };
        };
      }>("/geocoding/reverse", {
        params: { lat: latitude, lon: longitude },
      });
      const address = response.data?.data?.address || {};

      // build detailed location
      const parts: string[] = [];

      // add city/town/village
      const city = address.city || address.town || address.village || address.municipality || "";
      if (city) parts.push(city);

      // add state/region
      const state = address.state || address.county || "";
      if (state && state !== city) parts.push(state);

      // add country
      const country = address.country || "";
      if (country) parts.push(country);

      // join comma space
      const region = parts.join(", ");

      return { region, country };
    } catch (error) {
      if (import.meta.env.DEV) console.error("Reverse geocoding for region failed:", error);
      return null;
    }
  }
}

export const geocodingService = new GeocodingService();
