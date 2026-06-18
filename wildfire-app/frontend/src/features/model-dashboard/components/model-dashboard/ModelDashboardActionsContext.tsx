import { createContext, useContext, type ReactNode } from "react";
import type { Model } from "@/features/model-dashboard/services/modelService";
import type { CompletionInfo } from "./types";

export interface ModelDashboardActionsContextValue {
	selectedModels: Model[];
	handleSelectAll: (models: Model[]) => void;
	handleSort: (field: string) => void;
	orderBy: string;
	order: "asc" | "desc";
	user: { id?: number | string | null; access_level?: string | null } | null | undefined;
	isSelected: (model: Model) => boolean;
	editingModel: Model | null;
	editTitle: string;
	calculationStartTimes: Record<number, string>;
	calculationCompletionInfo: Record<number, CompletionInfo>;
	canUserDeleteModel: (model: Model) => boolean;
	hasAvailableWebservice: boolean;
	handleSelectModel: (model: Model) => void;
	startTitleEdit: (model: Model) => void;
	setEditTitle: (title: string) => void;
	updateTitle: () => void | Promise<void>;
	cancelTitleEdit: () => void;
	handleView: (model: Model) => void;
	handleEdit: (model: Model) => void;
	handleDownload: (model: Model) => void;
	handleCopy: (model: Model) => void;
	handleCalculateSingle: (model: Model) => void;
	handleSingleDelete: (model: Model) => void;
	handleShare: (model: Model) => void;
	handleMoveToWorkspace: (model: Model) => void;
	currentPage: number;
	itemsPerPage: number;
	handlePageChange: (page: number) => void;
	handleItemsPerPageChange: (items: number) => void;
	handleNewModel: () => void;
	isModelLimitReached: boolean;
	statsTotal: number | undefined;
	statsModelLimit: number | undefined;
}

interface ModelDashboardActionsProviderProps {
	value: ModelDashboardActionsContextValue;
	children: ReactNode;
}

const ModelDashboardActionsContext = createContext<ModelDashboardActionsContextValue | undefined>(undefined);

export function ModelDashboardActionsProvider({ value, children }: ModelDashboardActionsProviderProps) {
	return (
		<ModelDashboardActionsContext.Provider value={value}>
			{children}
		</ModelDashboardActionsContext.Provider>
	);
}

export function useModelDashboardActions(): ModelDashboardActionsContextValue {
	const context = useContext(ModelDashboardActionsContext);

	if (!context) {
		throw new Error("useModelDashboardActions must be used within ModelDashboardActionsProvider");
	}

	return context;
}
