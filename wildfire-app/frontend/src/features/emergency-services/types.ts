export type EmergencyServiceCategory =
	| "bombeiros"
	| "ges"
	| "policia_nacional"
	| "garda_civil"
	| "policia_local"
	| "smpc"
	| "avpc"
	| "upa";

export interface EmergencyService {
	id: number;
	name: string;
	category: EmergencyServiceCategory | string;
	serviceType: string | null;
	address: string | null;
	postcode: string | null;
	city: string | null;
	phone: string | null;
	email: string | null;
	longitude: number;
	latitude: number;
	distanceM: number | null;
}

interface CategoryMeta {
	color: string;
	labelKey: string;
}

const FALLBACK_CATEGORY_META: CategoryMeta = {
	color: "#6b7280",
	labelKey: "modelResults.emergencyServices.title",
};

export const EMERGENCY_SERVICE_CATEGORY_META: Record<EmergencyServiceCategory, CategoryMeta> = {
	bombeiros: {
		color: "#dc2626",
		labelKey: "modelResults.emergencyServices.categories.bombeiros",
	},
	ges: {
		color: "#e11d48",
		labelKey: "modelResults.emergencyServices.categories.ges",
	},
	policia_nacional: {
		color: "#2563eb",
		labelKey: "modelResults.emergencyServices.categories.policia_nacional",
	},
	garda_civil: {
		color: "#16a34a",
		labelKey: "modelResults.emergencyServices.categories.garda_civil",
	},
	policia_local: {
		color: "#0ea5e9",
		labelKey: "modelResults.emergencyServices.categories.policia_local",
	},
	smpc: {
		color: "#f59e0b",
		labelKey: "modelResults.emergencyServices.categories.smpc",
	},
	avpc: {
		color: "#f97316",
		labelKey: "modelResults.emergencyServices.categories.avpc",
	},
	upa: {
		color: "#7c3aed",
		labelKey: "modelResults.emergencyServices.categories.upa",
	},
};

export const getCategoryMeta = (category: string): CategoryMeta =>
	EMERGENCY_SERVICE_CATEGORY_META[category as EmergencyServiceCategory] ??
	FALLBACK_CATEGORY_META;

export const formatDistance = (distanceM: number | null): string | null => {
	if (distanceM === null || !Number.isFinite(distanceM)) return null;
	if (distanceM < 1000) return `${Math.round(distanceM)} m`;
	return `${(distanceM / 1000).toFixed(1)} km`;
};
