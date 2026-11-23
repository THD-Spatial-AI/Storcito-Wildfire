import { useEffect, useState } from "react";
import { riskMetricsService } from "@/features/model-results/services/riskMetrics";

/** mean risk score */
export const useRiskScores = (modelIds: number[], enabled: boolean): Record<number, number> => {
  const [scores, setScores] = useState<Record<number, number>>({});
  const key = modelIds.join(",");

  useEffect(() => {
    if (!enabled || modelIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        modelIds.map(async (id) => {
          try {
            const body = await riskMetricsService.getForModel(id);
            return body.ready && body.data ? ([id, body.data.overall_score * 5] as const) : null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setScores(Object.fromEntries(entries.filter((e): e is readonly [number, number] => e !== null)));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return scores;
};
