import { useEffect, useState } from "react";
import { areaKey, areaName, type AreaRef } from "./service";

// shared across mounts
const known = new Map<string, string>();

/** names for refs */
export function useAreaNames(refs: AreaRef[]): Record<string, string> {
	const [names, setNames] = useState<Record<string, string>>(() =>
		Object.fromEntries(refs.filter((r) => known.has(areaKey(r))).map((r) => [areaKey(r), known.get(areaKey(r)) as string]))
	);
	const signature = refs.map(areaKey).sort().join(",");

	useEffect(() => {
		let alive = true;
		const missing = refs.filter((r) => !known.has(areaKey(r)));
		const sync = () => setNames(Object.fromEntries(refs.map((r) => [areaKey(r), known.get(areaKey(r)) ?? r.code])));
		sync();
		if (missing.length === 0) return;
		void Promise.all(
			missing.map(async (r) => {
				known.set(areaKey(r), await areaName(r));
			})
		).then(() => alive && sync());
		return () => {
			alive = false;
		};
		// signature tracks refs
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [signature]);

	return names;
}

export function rememberAreaName(ref: AreaRef, name: string) {
	known.set(areaKey(ref), name);
}

/** names a to z */
export function sortedAreaNames(refs: AreaRef[], names: Record<string, string>): string[] {
	return refs.map((r) => names[areaKey(r)] ?? r.code).sort((a, b) => a.localeCompare(b));
}
