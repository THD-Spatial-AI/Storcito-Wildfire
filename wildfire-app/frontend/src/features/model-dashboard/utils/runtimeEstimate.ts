import type { Model } from "@/features/model-dashboard/services/modelService";

/** Sample bounds. */
const MIN_SAMPLE_SECONDS = 5;
const MAX_SAMPLE_SECONDS = 6 * 60 * 60;
/** Minimum samples. */
const MIN_SAMPLES = 3;

const durationSeconds = (model: Model): number | null => {
	if (!model.calculation_started_at || !model.calculation_completed_at) return null;
	const start = Date.parse(model.calculation_started_at);
	const end = Date.parse(model.calculation_completed_at);
	if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
	return (end - start) / 1000;
};

/** Median past runtime. */
export const typicalRuntimeSeconds = (models: Model[]): number | null => {
	const samples = models
		.filter((m) => m.status === "completed")
		.map(durationSeconds)
		.filter(
			(s): s is number => s !== null && s >= MIN_SAMPLE_SECONDS && s <= MAX_SAMPLE_SECONDS,
		)
		.sort((a, b) => a - b);

	if (samples.length < MIN_SAMPLES) return null;
	const mid = Math.floor(samples.length / 2);
	return samples.length % 2 === 0 ? (samples[mid - 1] + samples[mid]) / 2 : samples[mid];
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
