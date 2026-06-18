import { useCallback, useEffect, useRef, useState } from 'react';
import { geocodingService, GeocodingResult } from '@/features/interactive-map/services/geocoding';
import { useWeatherLocationStore } from '@/features/weather/store/weather-location';

export const useWeatherSearch = () => {
  const { setLocation } = useWeatherLocationStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [selecting, setSelecting] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSelecting(true);
      try {
        const searchResults = await geocodingService.search(query);
        setResults(searchResults.slice(0, 5));
      } catch {
        setResults([]);
      } finally {
        setSelecting(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const onSelect = useCallback((result: GeocodingResult) => {
    setLocation({
      id: `geocoded-${result.latitude.toFixed(4)},${result.longitude.toFixed(4)}`,
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      source: 'geocoded',
    });
    setQuery('');
    setResults([]);
  }, [setLocation]);

  return { query, setQuery, results, selecting, onSelect };
};
