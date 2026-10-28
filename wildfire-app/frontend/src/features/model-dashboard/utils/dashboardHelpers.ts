import { Model } from "@/features/model-dashboard/services/modelService";

export interface ModelFamily {
	root: Model;
	/** Parent shown on top. */
	display: Model;
	/** Copies, oldest first. */
	otherVersions: Model[];
	versionCount: number;
	memberIds: number[];
}

export const buildModelFamilies = (roots: Model[]): ModelFamily[] =>
	roots.map((root) => {
		const versions = root.versions ?? [];
		const members = [root, ...versions];
		return {
			root,
			display: root,
			otherVersions: versions,
			versionCount: members.length,
			memberIds: members.map((member) => member.id),
		};
	});

export const flattenFamilies = (families: ModelFamily[]): Model[] =>
	families.flatMap((family) => [family.root, ...(family.root.versions ?? [])]);
