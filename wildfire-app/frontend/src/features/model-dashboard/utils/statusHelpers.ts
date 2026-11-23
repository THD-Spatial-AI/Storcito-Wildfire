import { ModelStatus, StatusColor } from '@/types/models';

/** get status color */
export const getStatusColor = (status: ModelStatus): StatusColor => {
	const colorMap: Record<ModelStatus, StatusColor> = {
		draft: "default",
		queue: "info",
		calculating: "info",
		running: "info",
		processing: "info",
		completed: "success", 
		published: "success",
		failed: "error",
		cancelled: "warning",
		modified: "warning",
	};
	return colorMap[status] || "default";
};

/** get css classes */
export const getModelStatusColor = (status: ModelStatus): string => {
	const colorMap: Record<ModelStatus, string> = {
		completed: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 hover:from-green-200 hover:to-emerald-200 shadow-sm",
		published: "bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border-purple-200 hover:from-purple-200 hover:to-indigo-200 shadow-sm",
		queue: "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200 hover:from-yellow-200 hover:to-amber-200 shadow-sm animate-pulse",
		calculating: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200 hover:from-blue-200 hover:to-cyan-200 shadow-sm animate-pulse",
		running: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200 hover:from-blue-200 hover:to-cyan-200 shadow-sm animate-pulse",
		processing: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200 hover:from-blue-200 hover:to-cyan-200 shadow-sm animate-pulse",
		failed: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200 hover:from-red-200 hover:to-rose-200 shadow-sm",
		cancelled: "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border-orange-200 hover:from-orange-200 hover:to-amber-200 shadow-sm",
		draft: "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200 hover:from-gray-200 hover:to-slate-200 shadow-sm",
		modified: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200 hover:from-amber-200 hover:to-yellow-200 shadow-sm",
	};
	return colorMap[status] || colorMap.draft;
};

export const isActiveStatus = (status: ModelStatus): boolean => {
	return status === "queue" || status === "running" || status === "calculating" || status === "processing";
};

export type StatusTab =
	| "all" | "pinned" | "running" | "completed" | "drafts" | "failed"
	| "queue" | "in_progress" | "completed_only" | "published";

export const STATUS_TAB_ORDER: StatusTab[] = ["all", "pinned", "running", "completed", "drafts", "failed"];

// admin tabs sum
export const ADMIN_STATUS_TAB_ORDER: StatusTab[] = ["all", "drafts", "queue", "in_progress", "completed_only", "published", "failed"];

const STATUS_TAB_STATUSES: Record<Exclude<StatusTab, "all" | "pinned">, ModelStatus[]> = {
	running: ["queue", "calculating", "running", "processing"],
	completed: ["completed", "published"],
	drafts: ["draft", "modified"],
	failed: ["failed", "cancelled"],
	queue: ["queue"],
	in_progress: ["calculating", "running", "processing"],
	completed_only: ["completed"],
	published: ["published"],
};

export const statusTabParam = (tab: StatusTab): string | undefined =>
	tab === "all" || tab === "pinned" ? undefined : STATUS_TAB_STATUSES[tab].join(",");

/** check model processing */
export const isModelDisabled = (status: ModelStatus): boolean => {
	return status === "running" || status === "queue" || status === "calculating" || status === "processing";
};

/** check model has */
export const isModelCompleted = (status: ModelStatus): boolean => {
	return status === "completed" || status === "published";
};


/** tab label keys */
export const TAB_LABEL_KEYS: Record<StatusTab, string> = {
	all: "model.tabs.all",
	pinned: "model.tabs.pinned",
	running: "model.tabs.running",
	completed: "model.tabs.completed",
	drafts: "model.tabs.drafts",
	failed: "model.tabs.failed",
	queue: "model.tabs.queue",
	in_progress: "model.tabs.inProgress",
	completed_only: "model.tabs.completed",
	published: "model.tabs.published",
};

export const TAB_LABEL_FALLBACK: Partial<Record<StatusTab, string>> = {
	queue: "In Queue",
	in_progress: "In Progress",
	published: "Published",
};
