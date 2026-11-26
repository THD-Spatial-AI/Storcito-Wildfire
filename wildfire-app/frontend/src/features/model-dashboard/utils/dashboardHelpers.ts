import { Model } from "@/features/model-dashboard/services/modelService";

export interface ModelFamily {
	root: Model;
	/** parent shown top */
	display: Model;
	/** copies oldest first */
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

export const modelNameId = (id: number) => `model-name-${id}`;

/** focus model name */
export const focusModelName = (id: number) =>
	requestAnimationFrame(() => document.getElementById(modelNameId(id))?.focus());

/** focus after removal */
export const focusFirstModel = () =>
	window.setTimeout(() => {
		const target =
			document.querySelector<HTMLElement>('[id^="model-name-"]') ??
			document.querySelector<HTMLElement>('[data-tour="status-tabs"] [aria-pressed="true"]');
		target?.focus();
	}, 50);
