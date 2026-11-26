import { useEffect, useState } from "react";
import { webservicesService } from "@/features/admin-dashboard/services/webservices";

let cached: Promise<string[]> | null = null;

// same as configurator
function loadDates(): Promise<string[]> {
	cached ??= Promise.all([
		webservicesService.getAvailableDynamicDates().catch(() => [] as string[]),
		webservicesService.getAvailablePrecomputedDates().catch(() => [] as string[]),
		webservicesService.getAvailableStaticDates().catch(() => [] as string[]),
	]).then(([a, b, c]) => {
		const all = [...new Set([...a, ...b, ...c])].sort();
		// retry next time
		if (all.length === 0) cached = null;
		return all;
	});
	return cached;
}

/** engine data dates */
export function useEngineDates(): { ready: boolean; dates: string[] } {
	const [state, setState] = useState<{ ready: boolean; dates: string[] }>({ ready: false, dates: [] });
	useEffect(() => {
		let alive = true;
		void loadDates().then((dates) => alive && setState({ ready: true, dates }));
		return () => {
			alive = false;
		};
	}, []);
	return state;
}
