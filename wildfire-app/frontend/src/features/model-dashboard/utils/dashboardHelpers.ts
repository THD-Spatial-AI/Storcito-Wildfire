import { Model } from "@/features/model-dashboard/services/modelService";

type LeveledModel = Model & { level: number };

export const organizeModelsHierarchically = (
	models: Model[],
	pinnedIds: ReadonlySet<number> = new Set()
): LeveledModel[] => {
	// Pins stay top-level.
	const isRoot = (model: Model) => !model.parent_model_id || pinnedIds.has(model.id);
	const childrenByParent = new Map<number, Model[]>();

	for (const model of models) {
		if (isRoot(model)) continue;
		const siblings = childrenByParent.get(model.parent_model_id!) ?? [];
		siblings.push(model);
		childrenByParent.set(model.parent_model_id!, siblings);
	}

	const organized: LeveledModel[] = [];
	const addedIds = new Set<number>();

	for (const model of models.filter(isRoot)) {
		organized.push({ ...model, level: 0 });
		addedIds.add(model.id);
		for (const child of childrenByParent.get(model.id) ?? []) {
			organized.push({ ...child, level: 1 });
			addedIds.add(child.id);
		}
	}

	// Orphans last.
	for (const model of models) {
		if (!addedIds.has(model.id)) organized.push({ ...model, level: 0 });
	}

	return organized;
};
