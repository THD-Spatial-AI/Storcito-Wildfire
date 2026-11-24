import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { webservicesService } from "@/features/admin-dashboard";
import { modelService, type Model } from "@/features/model-dashboard";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

// calendar day
const dayOf = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const match = ISO_DAY.exec(value);
  return match ? match[0] : null;
};

export interface ModelDateStepper {
  currentDate: string | null;
  previousDate: string | null;
  nextDate: string | null;
  /** day switched */
  pendingDate: string | null;
  error: string | null;
  /** days data sorted */
  availableDates: string[];
  /** days prepared map */
  readyDates: string[];
  goTo: (date: string) => Promise<void>;
}

/** move model another */
export const useModelDateStepper = (
  model: Model | null,
  /** reloads model results */
  reload: () => void,
  messages: { failed: string },
): ModelDateStepper => {
  const [dates, setDates] = useState<string[]>([]);
  const [readyDates, setReadyDates] = useState<string[]>([]);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // queue time before
  const startQueuedAtRef = useRef<string | undefined>(undefined);
  // start request accepted
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [withData, ready] = await Promise.all([
        webservicesService.getAvailableDynamicDates().catch(() => [] as string[]),
        webservicesService.getAvailablePrecomputedDates().catch(() => [] as string[]),
      ]);
      if (cancelled) return;
      setDates([...new Set([...withData, ...ready])].sort());
      setReadyDates([...ready].sort());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // steps one dynamic
  const fromDay = dayOf(model?.from_date);
  const toDay = dayOf(model?.to_date) ?? fromDay;
  const parameters = (model?.config as { parameters?: { calculation_mode?: string } } | undefined)?.parameters;
  const steppable = parameters?.calculation_mode !== "static" && fromDay === toDay;
  const currentDate = steppable ? toDay : null;
  const { previousDate, nextDate } = useMemo(() => {
    if (!currentDate) return { previousDate: null, nextDate: null };
    return {
      previousDate: [...dates].reverse().find((day) => day < currentDate) ?? null,
      nextDate: dates.find((day) => day > currentDate) ?? null,
    };
  }, [currentDate, dates]);

  // server reports new
  const queuedAt = model?.calculation_queued_at;
  useEffect(() => {
    if (!pendingDate || !started) return;
    const status = model?.status;
    if (status === "completed" && currentDate === pendingDate) {
      setPendingDate(null);
      setStarted(false);
    } else if (status === "failed" && queuedAt !== startQueuedAtRef.current) {
      setPendingDate(null);
      setStarted(false);
      setError(messages.failed);
    }
  }, [currentDate, messages.failed, model?.status, pendingDate, queuedAt, started]);

  const goTo = useCallback(
    async (date: string) => {
      if (!model || pendingDate) return;
      setError(null);
      startQueuedAtRef.current = model.calculation_queued_at;
      setStarted(false);
      setPendingDate(date);
      try {
        const oldDay = currentDate;
        const title =
          oldDay && model.title?.endsWith(oldDay) ? `${model.title.slice(0, -oldDay.length)}${date}` : undefined;
        await modelService.updateModel(model.id, { from_date: date, to_date: date, ...(title ? { title } : {}) });
        await modelService.startCalculation(model.id, { notify: false });
        setStarted(true);
        reload();
      } catch {
        setPendingDate(null);
        setError(messages.failed);
      }
    },
    [currentDate, messages.failed, model, reload, pendingDate],
  );

  return { currentDate, previousDate, nextDate, pendingDate, error, availableDates: dates, readyDates, goTo };
};
