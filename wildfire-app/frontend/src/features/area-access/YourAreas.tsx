import { useEffect, useState, type ReactNode } from "react";
import { CalendarRange, MapPin } from "lucide-react";
import { useTranslation } from "@/i18n";
import { areaAccessService, formatPeriod, periodAccessService, type UserAreas, type UserPeriods } from "./service";
import { sortedAreaNames, useAreaNames } from "./useAreaNames";

// first n, rest counted
const shortList = (all: string[], n: number) => (all.length > n ? `${all.slice(0, n).join(", ")} +${all.length - n}` : all.join(", "));

interface AccessRowProps {
	icon: ReactNode;
	label: string;
	failed: boolean;
	loaded: boolean;
	restricted: boolean;
	all: string[];
	preview: number;
	unrestrictedLabel: string;
}

// shared settings row
function AccessRow({ icon, label, failed, loaded, restricted, all, preview, unrestrictedLabel }: AccessRowProps) {
	const { t } = useTranslation();
	const value = failed
		? t("areaAccess.unknown", "Unavailable")
		: !loaded
			? "…"
			: restricted
				? shortList(all, preview)
				: unrestrictedLabel;
	return (
		<div className="flex max-w-xl items-start justify-between gap-4 border-t border-border py-2.5 text-sm">
			<span className="flex items-center gap-2.5 text-foreground">
				{icon}
				{label}
			</span>
			<span className="text-right text-xs text-muted-foreground" title={all.join(", ")}>
				{value}
			</span>
		</div>
	);
}

/** own areas row */
export function YourAreas() {
	const { t } = useTranslation();
	const [data, setData] = useState<UserAreas | null>(null);
	const [failed, setFailed] = useState(false);
	const refs = data?.effective ?? [];
	const names = useAreaNames(refs);

	useEffect(() => {
		areaAccessService.mine().then(setData).catch(() => setFailed(true));
	}, []);

	return (
		<AccessRow
			icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
			label={t("areaAccess.yourAreas", "Areas where you can create models")}
			failed={failed}
			loaded={Boolean(data)}
			restricted={Boolean(data?.restricted)}
			all={sortedAreaNames(refs, names)}
			preview={3}
			unrestrictedLabel={t("areaAccess.allAreas", "All areas")}
		/>
	);
}

/** own periods row */
export function YourPeriods() {
	const { t, i18n } = useTranslation();
	const [data, setData] = useState<UserPeriods | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		periodAccessService.mine().then(setData).catch(() => setFailed(true));
	}, []);

	return (
		<AccessRow
			icon={<CalendarRange className="h-4 w-4 text-muted-foreground" />}
			label={t("periodAccess.yourPeriods", "Dates you can model")}
			failed={failed}
			loaded={Boolean(data)}
			restricted={Boolean(data?.restricted)}
			all={(data?.effective ?? []).map((p) => formatPeriod(p, i18n?.language ?? "en"))}
			preview={2}
			unrestrictedLabel={t("periodAccess.allDates", "All dates")}
		/>
	);
}
