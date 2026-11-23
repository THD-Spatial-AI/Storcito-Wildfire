import { useEffect, useState } from "react";
import type { Model } from "@/features/model-dashboard/services/modelService";
import { processModelTimingUpdates } from "@/features/model-dashboard/utils/modelTimingUtils";
import type { CompletionInfo } from "@/features/model-dashboard/components/model-dashboard/types";

const START_KEY = "modelCalculationStartTimes";
const DONE_KEY = "modelCalculationCompletionInfo";

const readJson = <T,>(key: string): T => {
	try {
		const saved = localStorage.getItem(key);
		return saved ? JSON.parse(saved) : ({} as T);
	} catch {
		return {} as T;
	}
};

const writeJson = (key: string, value: unknown) => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// storage blocked
	}
};

/** run start duration */
export function useCalculationTiming(models: Model[]) {
	const [calculationStartTimes, setStartTimes] = useState<Record<number, string>>(() => readJson(START_KEY));
	const [calculationCompletionInfo, setCompletionInfo] = useState<Record<number, CompletionInfo>>(() => readJson(DONE_KEY));

	useEffect(() => {
		if (!models.length) return;
		const update = processModelTimingUpdates(models, calculationStartTimes, calculationCompletionInfo);
		if (update.hasStartChanges) {
			setStartTimes(update.updatedStartTimes);
			writeJson(START_KEY, update.updatedStartTimes);
		}
		if (update.hasCompletionChanges) {
			setCompletionInfo(update.updatedCompletionInfo);
			writeJson(DONE_KEY, update.updatedCompletionInfo);
		}
	}, [models, calculationStartTimes, calculationCompletionInfo]);

	return { calculationStartTimes, calculationCompletionInfo };
}
