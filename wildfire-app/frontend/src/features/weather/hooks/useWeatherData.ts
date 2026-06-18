import { useCallback, useEffect, useState } from 'react';
import { weatherService } from '@/features/weather/services/weather';
import { useWeatherLocationStore } from '@/features/weather/store/weather-location';
import { CurrentWeatherData } from '@/features/weather/types';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export const useWeatherData = () => {
  const { location, setLocation } = useWeatherLocationStore();
  const [data, setData] = useState<CurrentWeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await weatherService.getCurrentWeather(location.latitude, location.longitude);
      setData(response.current);
    } catch (err: unknown) {
      let message = 'Failed to fetch weather data';
      if (typeof err === 'object' && err !== null && 'error' in (err as Record<string, unknown>)) {
        const maybe = err as { error?: unknown };
        message = typeof maybe.error === 'string' ? maybe.error : message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [location.latitude, location.longitude]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { data, loading, error, refresh, location, setLocation };
};
