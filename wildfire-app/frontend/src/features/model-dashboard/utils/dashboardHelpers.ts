import { Model } from "@/features/model-dashboard/services/modelService";

export interface ModelFamily {
	root: Model;
	/** Latest version shown. */
	display: Model;
	/** Remaining members, oldest first. */
	otherVersions: Model[];
	versionCount: number;
	memberIds: number[];
}

const createdAt = (model: Model): number => new Date(model.created_at).getTime() || 0;

// Newest, id tiebreak.
const pickLatest = (members: Model[]): Model =>
	members.reduce((latest, member) =>
		createdAt(member) > createdAt(latest) ||
		(createdAt(member) === createdAt(latest) && member.id > latest.id)
			? member
			: latest
	);

export const buildModelFamilies = (roots: Model[]): ModelFamily[] =>
	roots.map((root) => {
		const versions = root.versions ?? [];
		const members = [root, ...versions];
		const display = pickLatest(members);
		return {
			root,
			display,
			otherVersions: members.filter((member) => member.id !== display.id),
			versionCount: members.length,
			memberIds: members.map((member) => member.id),
		};
	});

export const flattenFamilies = (families: ModelFamily[]): Model[] =>
	families.flatMap((family) => [family.root, ...(family.root.versions ?? [])]);
