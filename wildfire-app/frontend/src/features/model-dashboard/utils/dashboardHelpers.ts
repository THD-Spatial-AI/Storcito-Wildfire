import { Model } from "@/features/model-dashboard/services/modelService";

export const organizeModelsHierarchically = (
	models: Model[]
): (Model & { level: number })[] => {
	const organized: (Model & { level: number })[] = [];
	const addedIds = new Set<number>();
	const parentMap = new Map<number, Model[]>();

	for (const model of models) {
		if (model.parent_model_id) {
			if (!parentMap.has(model.parent_model_id)) {
				parentMap.set(model.parent_model_id, []);
			}
			parentMap.get(model.parent_model_id)!.push(model);
		}
	}

	for (const model of models) {
		if (!model.parent_model_id) {
			organized.push({ ...model, level: 0 });
			addedIds.add(model.id);

			const children = parentMap.get(model.id) || [];
			for (const child of children) {
				organized.push({ ...child, level: 1 });
				addedIds.add(child.id);
			}
		}
	}

	for (const model of models) {
		if (!addedIds.has(model.id)) {
			organized.push({ ...model, level: 0 });
		}
	}

	return organized;
};
