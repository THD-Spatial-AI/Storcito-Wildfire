import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "@/lib/axios";

import type { AvailableLayer, FrameWeather } from "../viewer-config";

export interface RankedRiskDay {
  date: string;
  fwi: number;
}

// Per-day AOI-mean fire weather for the player, plus the FWI-ranked day list.
// Failed fetches are left unset (not cached as null) so showing that day retries.
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
          // On-demand engine computation can outlast the default 30s timeout.
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

  // Prefetch every frame day sequentially once the daily layers are known.
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

  // Retry on demand when the visible frame still has no weather.
  useEffect(() => {
    if (playingFrameDate && frameWeather[playingFrameDate] === undefined) {
      void fetchFrameWeather(playingFrameDate);
    }
  }, [playingFrameDate, frameWeather, fetchFrameWeather]);

  const currentFrameWeather = playingFrameDate ? frameWeather[playingFrameDate] : null;

  // Days ranked by AOI-mean FWI (desc); null until every day's weather is known.
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

  const [riskRankIndex, setRiskRankIndex] = useState(0);
  const riskRankDay = rankedRiskDays?.[riskRankIndex % (rankedRiskDays.length || 1)] ?? null;

  return { currentFrameWeather, rankedRiskDays, riskRankIndex, setRiskRankIndex, riskRankDay };
};
