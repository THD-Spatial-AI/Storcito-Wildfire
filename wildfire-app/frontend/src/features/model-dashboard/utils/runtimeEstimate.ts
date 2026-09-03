import type { Model } from "@/features/model-dashboard/services/modelService";

/** Sample bounds. */
const MIN_SAMPLE_SECONDS = 5;
const MAX_SAMPLE_SECONDS = 6 * 60 * 60;
/** Minimum samples. */
const MIN_SAMPLES = 3;
/** Sample window. */
const MAX_SAMPLES = 20;

/** Model runtime. */
export const modelRuntimeSeconds = (model: Model): number | null => {
	if (!model.calculation_started_at || !model.calculation_completed_at) return null;
	const start = Date.parse(model.calculation_started_at);
	const end = Date.parse(model.calculation_completed_at);
	if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
	return (end - start) / 1000;
};

/** Median of samples. */
export const typicalRuntimeFromSamples = (durations: number[]): number | null => {
	const samples = durations
		.filter((s) => s >= MIN_SAMPLE_SECONDS && s <= MAX_SAMPLE_SECONDS)
		.sort((a, b) => a - b);

	if (samples.length < MIN_SAMPLES) return null;
	const mid = Math.floor(samples.length / 2);
	return samples.length % 2 === 0 ? (samples[mid - 1] + samples[mid]) / 2 : samples[mid];
};

/** Median past runtime. */
export const typicalRuntimeSeconds = (models: Model[]): number | null => {
	return typicalRuntimeFromSamples(
		models
			.filter((m) => m.status === "completed")
			.map(modelRuntimeSeconds)
			.filter((s): s is number => s !== null),
	);
};

/** Merged runtimes by model. */
export const collectRuntimeSamples = (
	models: Model[],
	completionInfo: Record<number, { endTime: string; totalSeconds: number }>,
): number[] => {
	const byId = new Map<number, { endTime: string; seconds: number }>();

	for (const [id, info] of Object.entries(completionInfo)) {
		if (info.totalSeconds > 0) {
			byId.set(Number(id), { endTime: info.endTime, seconds: info.totalSeconds });
		}
	}
	for (const model of models) {
		if (model.status !== "completed" || byId.has(model.id)) continue;
		const seconds = modelRuntimeSeconds(model);
		if (seconds !== null && model.calculation_completed_at) {
			byId.set(model.id, { endTime: model.calculation_completed_at, seconds });
		}
	}

	// Recent samples only.
	return [...byId.values()]
		.sort((a, b) => Date.parse(b.endTime) - Date.parse(a.endTime))
		.slice(0, MAX_SAMPLES)
		.map((entry) => entry.seconds);
};

/** Seconds still expected. */
export const remainingSeconds = (
	typicalSeconds: number | null,
	startedAt: string | undefined,
): number | null => {
	if (typicalSeconds === null || !startedAt) return null;
	const start = Date.parse(startedAt);
	if (Number.isNaN(start)) return null;
	const elapsed = (Date.now() - start) / 1000;
	return Math.max(0, typicalSeconds - elapsed);
};
