import area from "@turf/area";
import type { Geometry } from "geojson";

import type { Model } from "@/features/model-dashboard/services/modelService";

const MIN_SAMPLE_SECONDS = 5;
const MAX_SAMPLE_SECONDS = 6 * 60 * 60;
const MIN_SAMPLES = 1;
const MAX_SAMPLES = 20;
const MAX_AREA_RATIO = 2;
/** Ratio 1 means exact match. */
const MAX_DAY_RATIO = 1;
const MAX_BUFFER_RATIO = 1;

export interface RuntimeEstimate {
	totalSeconds: number;
	sampleCount: number;
	/** Runs short. */
	approximate: boolean;
}

interface RuntimeSample {
	completedAt: number;
	model: Model;
	seconds: number;
	/** Backfilled queue time. */
	estimated: boolean;
}

interface WorkloadProfile {
	areaKm2: number | null;
	bufferMetres: number | null;
	calculationMode: string;
	country: string;
	dayCount: number;
	forceCompute: boolean | null;
	optionalLayers: string;
	userInputs: string;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: null;

const stableRecordSignature = (value: unknown): string => {
	const record = asRecord(value);
	if (!record) return "";
	return Object.entries(record)
		.filter(([, entry]) => typeof entry === "boolean" || typeof entry === "string" || typeof entry === "number")
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, entry]) => `${key}:${String(entry)}`)
		.join("|");
};

const stableRecordKeys = (value: unknown): string => {
	const record = asRecord(value);
	return record ? Object.keys(record).sort().join("|") : "";
};

const dateSpanDays = (fromDate: string, toDate: string): number => {
	const start = Date.parse(fromDate);
	const end = Date.parse(toDate);
	if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
	return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
};

const modelAreaKm2 = (model: Model): number | null => {
	const geometry = model.coordinates as unknown as Geometry | undefined;
	if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return null;
	try {
		const squareMetres = area(geometry);
		return Number.isFinite(squareMetres) && squareMetres > 0 ? squareMetres / 1_000_000 : null;
	} catch {
		return null;
	}
};

const workloadProfile = (model: Model): WorkloadProfile => {
	const config = asRecord(model.config);
	const parameters = asRecord(config?.parameters);
	const buffer = config?.buffer_distance;
	return {
		areaKm2: modelAreaKm2(model),
		bufferMetres: typeof buffer === "number" && buffer >= 0 ? buffer : null,
		calculationMode: typeof parameters?.calculation_mode === "string"
			? parameters.calculation_mode
			: "unknown",
		country: model.country?.trim().toLocaleLowerCase() ?? "",
		dayCount: dateSpanDays(model.from_date, model.to_date),
		forceCompute: typeof parameters?.force_compute === "boolean"
			? parameters.force_compute
			: null,
		optionalLayers: stableRecordSignature(parameters?.optional_layers),
		userInputs: stableRecordKeys(config?.user_inputs),
	};
};

const valuesWithinRatio = (left: number | null, right: number | null, maxRatio: number): boolean => {
	if (left === null || right === null) return left === right;
	if (left === 0 || right === 0) return left === right;
	return Math.max(left, right) / Math.min(left, right) <= maxRatio;
};

const comparableWorkload = (target: WorkloadProfile, sample: WorkloadProfile): boolean =>
	target.calculationMode === sample.calculationMode &&
	target.forceCompute === sample.forceCompute &&
	(!target.country || !sample.country || target.country === sample.country) &&
	target.optionalLayers === sample.optionalLayers &&
	target.userInputs === sample.userInputs &&
	valuesWithinRatio(target.areaKm2, sample.areaKm2, MAX_AREA_RATIO) &&
	valuesWithinRatio(target.dayCount, sample.dayCount, MAX_DAY_RATIO) &&
	valuesWithinRatio(target.bufferMetres, sample.bufferMetres, MAX_BUFFER_RATIO);

/** Full user-visible runtime. */
export const modelRuntimeSeconds = (model: Model): number | null => {
	if (!model.calculation_queued_at || !model.calculation_completed_at) return null;
	const start = Date.parse(model.calculation_queued_at);
	const end = Date.parse(model.calculation_completed_at);
	if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
	return (end - start) / 1000;
};

/** Median sample. */
export const typicalRuntimeFromSamples = (durations: number[]): number | null => {
	const samples = durations
		.filter((seconds) => seconds >= MIN_SAMPLE_SECONDS && seconds <= MAX_SAMPLE_SECONDS)
		.sort((left, right) => left - right);

	if (samples.length < MIN_SAMPLES) return null;
	const middle = Math.floor(samples.length / 2);
	return samples.length % 2 === 0
		? (samples[middle - 1] + samples[middle]) / 2
		: samples[middle];
};

/** Estimate remaining. */
export const estimateRuntimesForModels = (
	targets: Model[],
	history: Model[],
): Record<number, RuntimeEstimate> => {
	const profiles = new Map<number, WorkloadProfile>();
	const profileFor = (model: Model): WorkloadProfile => {
		const existing = profiles.get(model.id);
		if (existing) return existing;
		const profile = workloadProfile(model);
		profiles.set(model.id, profile);
		return profile;
	};
	const successfulSamples: RuntimeSample[] = history
		.filter((model) =>
			model.status === "completed" || model.status === "published")
		.map((model) => ({
			completedAt: Date.parse(model.calculation_completed_at ?? ""),
			model,
			seconds: modelRuntimeSeconds(model),
			estimated: model.calculation_queued_at_estimated === true,
		}))
		.filter((sample): sample is RuntimeSample =>
			sample.seconds !== null &&
			sample.seconds >= MIN_SAMPLE_SECONDS &&
			sample.seconds <= MAX_SAMPLE_SECONDS)
		.sort((left, right) => right.completedAt - left.completedAt);

	const estimates: Record<number, RuntimeEstimate> = {};
	for (const target of targets) {
		const targetProfile = profileFor(target);
		const comparable = successfulSamples.filter((sample) =>
			sample.model.id !== target.id &&
			comparableWorkload(targetProfile, profileFor(sample.model)));

		// Prefer measured samples.
		const measured = comparable.filter((sample) => !sample.estimated);
		const chosen = (measured.length > 0 ? measured : comparable).slice(0, MAX_SAMPLES);

		const totalSeconds = typicalRuntimeFromSamples(chosen.map((sample) => sample.seconds));
		if (totalSeconds !== null) {
			estimates[target.id] = {
				totalSeconds,
				sampleCount: chosen.length,
				approximate: measured.length === 0,
			};
		}
	}
	return estimates;
};

/** Estimate one model. */
export const estimateRuntimeForModel = (target: Model, history: Model[]): RuntimeEstimate | null =>
	estimateRuntimesForModels([target], history)[target.id] ?? null;

/** Seconds remaining. */
export const remainingSeconds = (
	typicalSeconds: number | null,
	queuedAt: string | undefined,
): number | null => {
	if (typicalSeconds === null || !queuedAt) return null;
	const start = Date.parse(queuedAt);
	if (Number.isNaN(start)) return null;
	const elapsed = (Date.now() - start) / 1000;
	return Math.max(0, typicalSeconds - elapsed);
};
