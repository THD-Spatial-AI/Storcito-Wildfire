import axios from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import { boundariesService } from "@/features/admin-boundaries/services/boundariesService";
import type { BoundaryItem } from "@/features/admin-boundaries/types";

export type AreaLevel = "community" | "province" | "municipality";

export interface AreaRef {
	level: AreaLevel;
	code: string;
}

export interface GroupAreas {
	group_id: string;
	group_name: string;
	areas: AreaRef[];
}

export interface UserAreas {
	restricted: boolean;
	direct: AreaRef[];
	groups: GroupAreas[];
	effective: AreaRef[];
}

export const areaKey = (ref: AreaRef) => `${ref.level}:${ref.code}`;

/** inclusive yyyy-mm-dd */
export interface Period {
	from: string;
	to: string;
}

export interface GroupPeriods {
	group_id: string;
	group_name: string;
	periods: Period[];
}

export interface UserPeriods {
	restricted: boolean;
	direct: Period[];
	groups: GroupPeriods[];
	effective: Period[];
}

export interface AccessOverview {
	users: Record<string, AreaRef[]>;
	groups: Record<string, AreaRef[]>;
	user_periods: Record<string, Period[]>;
	group_periods: Record<string, Period[]>;
}

export const periodKey = (p: Period) => `${p.from}_${p.to}`;

// day inside any
export const inPeriods = (day: string, periods: Period[]) => periods.some((p) => day >= p.from && day <= p.to);

// country root code
export const COUNTRY = "ES";

// same crud both kinds
function grantService<Mine, Item, Key extends string>(base: string, key: Key) {
	let inflight: Promise<Mine> | null = null;
	return {
		// shares concurrent calls
		mine(): Promise<Mine> {
			inflight ??= axios
				.get<ApiResponse<Mine>>(`${base}/me`)
				.then(({ data }) => data.data)
				.finally(() => {
					inflight = null;
				});
			return inflight;
		},
		async user(id: string | number): Promise<Mine> {
			const { data } = await axios.get<ApiResponse<Mine>>(`${base}/users/${id}`);
			return data.data;
		},
		async setUser(id: string | number, items: Item[]): Promise<void> {
			await axios.put(`${base}/users/${id}`, { [key]: items });
		},
		async group(id: string): Promise<Item[]> {
			const { data } = await axios.get<ApiResponse<Record<Key, Item[]>>>(`${base}/groups/${id}`);
			return data.data[key] ?? [];
		},
		async setGroup(id: string, items: Item[]): Promise<void> {
			await axios.put(`${base}/groups/${id}`, { [key]: items });
		},
	};
}

export const areaAccessService = {
	...grantService<UserAreas, AreaRef, "areas">("/areas", "areas"),
	async overview(): Promise<AccessOverview> {
		const { data } = await axios.get<ApiResponse<AccessOverview>>("/areas/grants");
		return data.data;
	},
};

const find = (items: BoundaryItem[], code: string) => items.find((i) => i.code === code)?.name;

// engine name lookup
export async function areaName(ref: AreaRef): Promise<string> {
	try {
		if (ref.level === "community") {
			return find(await boundariesService.list("community", COUNTRY), ref.code) ?? ref.code;
		}
		if (ref.level === "municipality") {
			return find(await boundariesService.list("municipality", ref.code.slice(0, 2)), ref.code) ?? ref.code;
		}
		const communities = await boundariesService.list("community", COUNTRY);
		// covered first
		const ordered = [...communities].sort((a, b) => Number(b.covered) - Number(a.covered));
		for (const c of ordered) {
			const name = find(await boundariesService.list("province", c.code), ref.code);
			if (name) return name;
		}
	} catch {
		// show code instead
	}
	return ref.code;
}

export const periodAccessService = grantService<UserPeriods, Period, "periods">("/periods", "periods");

// short readable range
export function formatPeriod(p: Period, locale: string): string {
	const d = (s: string) => new Date(`${s}T00:00:00`);
	const from = d(p.from);
	const to = d(p.to);
	const sameYear = from.getFullYear() === to.getFullYear();
	const fmt = (x: Date, year: boolean) => x.toLocaleDateString(locale, { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });
	return p.from === p.to ? fmt(from, true) : `${fmt(from, !sameYear)} – ${fmt(to, true)}`;
}
