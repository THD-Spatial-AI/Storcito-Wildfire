import { Model } from "@/features/model-dashboard/services/modelService";

export interface TimingUpdate {
	updatedStartTimes: Record<number, string>;
	updatedCompletionInfo: Record<number, CompletionDetails>;
	hasStartChanges: boolean;
	hasCompletionChanges: boolean;
}

const COMPLETION_STATUSES = new Set<Model['status']>(['completed', 'failed', 'cancelled']);
const ACTIVE_STATUSES = new Set<Model['status']>(['queue', 'calculating', 'running', 'processing']);

type CompletionDetails = { startTime: string; endTime: string; totalSeconds: number };

function ensureActiveStart(
	model: Model,
	startTimes: Record<number, string>,
	completionInfo: Record<number, CompletionDetails>
): { startChanged: boolean; completionCleared: boolean } {
	if (!ACTIVE_STATUSES.has(model.status)) {
		return { startChanged: false, completionCleared: false };
	}

	let completionCleared = false;
	
	// Reset on requeue.
	if (completionInfo[model.id]) {
		delete completionInfo[model.id];
		completionCleared = true;
	}

	const backendStart = model.calculation_queued_at ?? model.calculation_started_at;
	
	// Prefer backend time.
	if (backendStart) {
		if (startTimes[model.id] !== backendStart) {
			startTimes[model.id] = backendStart;
			return { startChanged: true, completionCleared };
		}
		return { startChanged: false, completionCleared };
	}
	
	// Fallback timestamp.
	if (!startTimes[model.id]) {
		startTimes[model.id] = new Date().toISOString();
		return { startChanged: true, completionCleared };
	}
	
	return { startChanged: false, completionCleared };
}

function ensureCompletionInfo(
	model: Model,
	startTimes: Record<number, string>,
	completionInfo: Record<number, CompletionDetails>
): { completionChanged: boolean; startChanged: boolean } {
	if (!COMPLETION_STATUSES.has(model.status)) {
		return { completionChanged: false, startChanged: false };
	}

	const backendStart = model.calculation_queued_at ?? model.calculation_started_at;
	const backendEnd = model.calculation_completed_at;

	if (backendStart && backendEnd) {
		const nextCompletion = {
			startTime: backendStart,
			endTime: backendEnd,
			totalSeconds: calculateDurationSeconds(backendStart, backendEnd),
		};
		const currentCompletion = completionInfo[model.id];
		const completionChanged =
			!currentCompletion ||
			currentCompletion.startTime !== nextCompletion.startTime ||
			currentCompletion.endTime !== nextCompletion.endTime ||
			currentCompletion.totalSeconds !== nextCompletion.totalSeconds;
		if (completionChanged) completionInfo[model.id] = nextCompletion;
		const hadStartEntry = Boolean(startTimes[model.id]);
		if (hadStartEntry) {
			delete startTimes[model.id];
		}
		return { completionChanged, startChanged: hadStartEntry };
	}

	if (completionInfo[model.id]) return { completionChanged: false, startChanged: false };

	const trackedStart = startTimes[model.id];
	if (!trackedStart) {
		return { completionChanged: false, startChanged: false };
	}

	const endTime = new Date().toISOString();
	completionInfo[model.id] = {
		startTime: trackedStart,
		endTime,
		totalSeconds: calculateDurationSeconds(trackedStart, endTime),
	};
	return { completionChanged: true, startChanged: false };
}

function calculateDurationSeconds(start: string, end: string): number {
	// Backend sends UTC.
	const startDate = new Date(start);
	const endDate = new Date(end);

	// Validate parsed dates
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		return 0;
	}

	const durationMs = endDate.getTime() - startDate.getTime();
	return Math.max(0, Math.floor(durationMs / 1000));
}

export function processModelTimingUpdates(
	models: Model[],
	calculationStartTimes: Record<number, string>,
	calculationCompletionInfo: Record<number, CompletionDetails>
): TimingUpdate {
	const updatedStartTimes = { ...calculationStartTimes };
	const updatedCompletionInfo = { ...calculationCompletionInfo };
	let hasStartChanges = false;
	let hasCompletionChanges = false;

	for (const model of models) {
		const { startChanged, completionCleared } = ensureActiveStart(model, updatedStartTimes, updatedCompletionInfo);
		if (startChanged) {
			hasStartChanges = true;
		}
		if (completionCleared) {
			hasCompletionChanges = true;
		}

		const { completionChanged, startChanged: startChangedFromCompletion } = ensureCompletionInfo(
			model,
			updatedStartTimes,
			updatedCompletionInfo
		);

		if (completionChanged) {
			hasCompletionChanges = true;
		}

		if (startChangedFromCompletion) {
			hasStartChanges = true;
		}
	}

	return { updatedStartTimes, updatedCompletionInfo, hasStartChanges, hasCompletionChanges };
}
