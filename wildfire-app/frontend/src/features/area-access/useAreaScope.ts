import { useEffect, useState } from "react";
import { boundariesService } from "@/features/admin-boundaries/services/boundariesService";
import type { BoundaryItem, BoundaryLevelId } from "@/features/admin-boundaries/types";
import { areaAccessService, COUNTRY, type AreaRef } from "./service";

export interface AreaScope {
	filterItems: (level: BoundaryLevelId, items: BoundaryItem[]) => BoundaryItem[];
	canApply: (level: BoundaryLevelId, item: BoundaryItem) => boolean;
}

// expand refs to sets
export async function buildAreaScope(refs: AreaRef[]): Promise<AreaScope> {
	const pick = (level: AreaRef["level"]) => new Set(refs.filter((r) => r.level === level).map((r) => r.code));
	const communities = pick("community");
	const provinces = pick("province");
	const municipalities = pick("municipality");

	// whole provinces allowed
	const fullProvinces = new Set(provinces);
	for (const c of communities) {
		for (const p of await boundariesService.list("province", c)) fullProvinces.add(p.code);
	}
	// parents to drill
	const parentProvinces = new Set([...municipalities].map((m) => m.slice(0, 2)));
	const parentCommunities = new Set<string>();
	const needParent = new Set([...parentProvinces, ...provinces]);
	if (needParent.size > 0) {
		for (const c of await boundariesService.list("community", COUNTRY)) {
			if (!c.covered) continue;
			const kids = await boundariesService.list("province", c.code);
			if (kids.some((p) => needParent.has(p.code))) parentCommunities.add(c.code);
		}
	}

	const inside = (level: BoundaryLevelId, item: BoundaryItem) => {
		if (level === "community") return communities.has(item.code);
		if (level === "province") return fullProvinces.has(item.code);
		if (level === "municipality") return fullProvinces.has(item.code.slice(0, 2)) || municipalities.has(item.code);
		return false;
	};
	const visible = (level: BoundaryLevelId, item: BoundaryItem) => {
		if (level === "country") return true;
		if (level === "community") return inside(level, item) || parentCommunities.has(item.code);
		if (level === "province") return inside(level, item) || parentProvinces.has(item.code);
		return inside(level, item);
	};
	return {
		filterItems: (level, items) => items.filter((item) => visible(level, item)),
		canApply: inside,
	};
}

/** null when unrestricted */
export function useAreaScope(): { ready: boolean; scope: AreaScope | null } {
	const [state, setState] = useState<{ ready: boolean; scope: AreaScope | null }>({ ready: false, scope: null });
	useEffect(() => {
		let alive = true;
		areaAccessService
			.mine()
			.then(async (me) => (me.restricted ? buildAreaScope(me.effective) : null))
			.then((scope) => alive && setState({ ready: true, scope }))
			// server still enforces
			.catch(() => alive && setState({ ready: true, scope: null }));
		return () => {
			alive = false;
		};
	}, []);
	return state;
}
