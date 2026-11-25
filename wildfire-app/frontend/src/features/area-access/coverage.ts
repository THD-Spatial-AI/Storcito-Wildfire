import { webservicesService, type StorcitoCoverageFeatureCollection } from "@/features/admin-dashboard/services/webservices";
import { boundariesService } from "@/features/admin-boundaries/services/boundariesService";
import { areaAccessService } from "./service";

/** marks own areas */
export const USER_AREA_SCOPE = "user-area";

let cached: Promise<StorcitoCoverageFeatureCollection | null> | null = null;
let cachedAt = 0;
// short, user may change
const TTL_MS = 60_000;

// own areas else engine
async function load(): Promise<StorcitoCoverageFeatureCollection | null> {
	try {
		const me = await areaAccessService.mine();
		if (me.restricted) {
			const details = await Promise.all(me.effective.map((r) => boundariesService.get(r.level, r.code)));
			return {
				type: "FeatureCollection",
				features: details.map((d) => ({
					type: "Feature",
					properties: { name: d.name, scope: USER_AREA_SCOPE },
					geometry: d.geometry as unknown as Record<string, unknown>,
				})),
			};
		}
	} catch {
		// fall back engine
	}
	return webservicesService.getAvailableDataCoverage();
}

/** coverage for user */
export function loadEffectiveCoverage(): Promise<StorcitoCoverageFeatureCollection | null> {
	if (!cached || Date.now() - cachedAt > TTL_MS) {
		cachedAt = Date.now();
		cached = load().catch((error) => {
			cached = null;
			throw error;
		});
	}
	return cached;
}
