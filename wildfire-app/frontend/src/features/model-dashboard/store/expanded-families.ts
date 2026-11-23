import { create } from "zustand";

interface ExpandedFamiliesStore {
	expanded: ReadonlySet<number>;
	toggle: (rootId: number) => void;
	expand: (rootId: number) => void;
}

/** open version lists */
export const useExpandedFamiliesStore = create<ExpandedFamiliesStore>()((set) => ({
	expanded: new Set(),
	toggle: (rootId) =>
		set((state) => {
			const next = new Set(state.expanded);
			if (next.has(rootId)) next.delete(rootId);
			else next.add(rootId);
			return { expanded: next };
		}),
	expand: (rootId) =>
		set((state) => (state.expanded.has(rootId) ? state : { expanded: new Set(state.expanded).add(rootId) })),
}));
