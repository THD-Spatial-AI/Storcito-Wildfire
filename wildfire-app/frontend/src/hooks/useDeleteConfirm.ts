import { useCallback } from 'react';
import { useConfirm } from '@/hooks/useConfirmDialog';
import { Model } from '@/features/model-dashboard/services/modelService';

interface UseDeleteConfirmProps {
	sortedModels: Model[];
	onDelete: (model: Model) => Promise<void>;
}

export const useDeleteConfirm = ({
	sortedModels,
	onDelete,
}: UseDeleteConfirmProps) => {
	const confirm = useConfirm();

	const handleSingleDelete = useCallback(async (model: Model) => {
		const children = sortedModels.filter((m: Model) => m.parent_model_id === model.id);
		const hasChildren = children.length > 0;

		let customDescription: string | undefined;
		if (hasChildren) {
			const childText = children.length > 1 ? "s" : "";
			customDescription = `"${model.title}" has ${children.length} version${childText}; they will stay as separate models. This action cannot be undone.`;
		}

		await confirm({
			type: "delete",
			itemType: "model",
			itemName: model.title,
			description: customDescription,
			onConfirm: async () => {
				try {
					await onDelete(model);
				} catch (error) {
					if (import.meta.env.DEV) console.error("Delete failed:", error);
					alert("Failed to delete the model. Please try again.");
				}
			}
		});
	}, [sortedModels, confirm, onDelete]);

	return { handleSingleDelete };
};
