import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "@/lib/axios";

import type { AvailableLayer, FrameWeather } from "../viewer-config";

interface RankedRiskDay {
  date: string;
  fwi: number;
}

// per-day aoi-mean fire
export const useFrameWeather = (
  modelId: number | undefined,
  dailyFrames: AvailableLayer[],
  playingFrameDate: string | null
) => {
  const [frameWeather, setFrameWeather] = useState<Record<string, FrameWeather | null>>({});
  const frameWeatherRef = useRef<Record<string, FrameWeather | null>>({});
  const inflightRef = useRef<Set<string>>(new Set());

  const fetchFrameWeather = useCallback(
    async (day: string) => {
      if (!modelId) return;
      if (frameWeatherRef.current[day] !== undefined || inflightRef.current.has(day)) return;
      inflightRef.current.add(day);
      try {
        const resp = await axios.get(`/models/${modelId}/fire-weather`, {
          params: { date: day },
          // on-demand engine computation
          timeout: 90_000,
        });
        const summary = (resp.data?.data?.weather_summary ?? null) as FrameWeather | null;
        frameWeatherRef.current[day] = summary;
        setFrameWeather((m) => ({ ...m, [day]: summary }));
      } catch (err) {
        if (import.meta.env.DEV) console.warn(`[useFrameWeather] ${day} failed`, err);
      } finally {
        inflightRef.current.delete(day);
      }
    },
    [modelId]
  );

  // prefetch every frame
  useEffect(() => {
    if (dailyFrames.length < 2) return;
    let cancelled = false;
    (async () => {
      for (const frame of dailyFrames) {
        if (cancelled) return;
        await fetchFrameWeather(frame.key.slice(5));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dailyFrames, fetchFrameWeather]);

  // retry demand visible
  useEffect(() => {
    if (playingFrameDate && frameWeather[playingFrameDate] === undefined) {
      void fetchFrameWeather(playingFrameDate);
    }
  }, [playingFrameDate, frameWeather, fetchFrameWeather]);

  // days ranked aoi-mean
  const rankedRiskDays = useMemo<RankedRiskDay[] | null>(() => {
    const days: RankedRiskDay[] = [];
    for (const frame of dailyFrames) {
      const day = frame.key.slice(5);
      const fwi = frameWeather[day]?.fwi;
      if (typeof fwi !== "number") return null;
      days.push({ date: day, fwi });
    }
    return days.sort((a, b) => b.fwi - a.fwi);
  }, [dailyFrames, frameWeather]);

  const peakDate = rankedRiskDays?.[0]?.date ?? null;
  // nothing picked map
  const shownDate = playingFrameDate ?? peakDate;
  const currentFrameWeather = shownDate ? frameWeather[shownDate] : null;

  return { currentFrameWeather, rankedRiskDays, peakDate };
};
