import { useCallback, useMemo } from "react";
import { Copy, FolderInput, Play, Trash2 } from "lucide-react";

import type { Model } from "@/features/model-dashboard/services/modelService";
import type { ActionConfig } from "@/components/shared/ModelActionGroup";
import { useTranslation } from "@/i18n";

interface UseBulkActionConfigsParams {
	selectedModels: Model[];
	isModelDisabled: (model: Model) => boolean;
	canUserDeleteModel: (model: Model) => boolean;
	hasAvailableWebservice: boolean;
	handleCalculate: (ids: number[]) => Promise<void>;
	clearSelection: () => void;
	handleBulkMoveToWorkspace: () => void;
	handleBulkCopy: () => void;
	showBulkDeleteConfirm: () => void;
}

/** Bulk action config. */
export function useBulkActionConfigs({
	selectedModels,
	isModelDisabled,
	canUserDeleteModel,
	hasAvailableWebservice,
	handleCalculate,
	clearSelection,
	handleBulkMoveToWorkspace,
	handleBulkCopy,
	showBulkDeleteConfirm,
}: UseBulkActionConfigsParams): ActionConfig[] {
	const { t } = useTranslation();

	const canDeleteAnySelected = useMemo(() => {
		return selectedModels.some((model: Model) =>
			!isModelDisabled(model) && canUserDeleteModel(model)
		);
	}, [selectedModels, canUserDeleteModel, isModelDisabled]);

	const canMoveAnySelected = useMemo(() => {
		return selectedModels.some((model: Model) => canUserDeleteModel(model));
	}, [selectedModels, canUserDeleteModel]);

	const canCalculateAnySelected = useMemo(() => {
		return hasAvailableWebservice && selectedModels.some((model: Model) => !isModelDisabled(model));
	}, [selectedModels, isModelDisabled, hasAvailableWebservice]);

	const calculatableCount = useMemo(() => {
		return selectedModels.filter((model: Model) => !isModelDisabled(model)).length;
	}, [selectedModels, isModelDisabled]);

	const handleBulkCalculate = useCallback(async () => {
		const calculatableModels = selectedModels.filter((model: Model) => !isModelDisabled(model));
		const modelIds = calculatableModels.map((m) => m.id);
		await handleCalculate(modelIds);
		clearSelection();
	}, [selectedModels, isModelDisabled, handleCalculate, clearSelection]);

	const deletableCount = useMemo(() => {
		return selectedModels.filter((model: Model) =>
			!isModelDisabled(model) && canUserDeleteModel(model)
		).length;
	}, [selectedModels, canUserDeleteModel, isModelDisabled]);

	const getMoveTooltip = useCallback(() => {
		const modelWord = selectedModels.length > 1 ? t('model.models').toLowerCase() : t('model.title').toLowerCase();
		if (canMoveAnySelected) {
			return `${t('model.move')} ${selectedModels.length} ${t('model.selected')} ${modelWord}`;
		}
		return t('model.cannotMove');
	}, [selectedModels.length, canMoveAnySelected, t]);

	const getCalculateTooltip = useCallback(() => {
		if (!hasAvailableWebservice) {
			return t('model.noWebserviceAvailable');
		}
		if (canCalculateAnySelected) {
			return `${t('model.calculate')} ${calculatableCount} ${t('model.selected')}`;
		}
		return t('model.cannotCalculate');
	}, [hasAvailableWebservice, canCalculateAnySelected, calculatableCount, t]);

	const getCopyTooltip = useCallback(() => {
		return `${t('model.copy')} ${selectedModels.length} ${t('model.selected')}`;
	}, [selectedModels.length, t]);

	const getDeleteTooltip = useCallback(() => {
		if (canDeleteAnySelected) {
			return `${t('model.delete')} ${deletableCount} ${t('model.selected')}`;
		}
		return t('model.cannotDelete');
	}, [canDeleteAnySelected, deletableCount, t]);

	return useMemo(() => [
		{
			key: "bulk-move",
			icon: FolderInput,
			tooltip: getMoveTooltip(),
			variant: "secondary" as const,
			onClick: handleBulkMoveToWorkspace,
			disabled: !canMoveAnySelected,
		},
		{
			key: "bulk-copy",
			icon: Copy,
			tooltip: getCopyTooltip(),
			variant: "purple" as const,
			onClick: handleBulkCopy,
		},
		{
			key: "bulk-calculate",
			icon: Play,
			tooltip: getCalculateTooltip(),
			variant: "success" as const,
			onClick: handleBulkCalculate,
			disabled: !canCalculateAnySelected,
		},
		{
			key: "bulk-delete",
			icon: Trash2,
			tooltip: getDeleteTooltip(),
			variant: "danger" as const,
			onClick: showBulkDeleteConfirm,
			disabled: !canDeleteAnySelected,
		},
	], [getMoveTooltip, getCopyTooltip, getCalculateTooltip, getDeleteTooltip, handleBulkMoveToWorkspace, handleBulkCopy, handleBulkCalculate, showBulkDeleteConfirm, canMoveAnySelected, canCalculateAnySelected, canDeleteAnySelected]);
}
