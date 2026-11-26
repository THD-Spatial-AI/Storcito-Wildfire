import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useTranslation } from "@/i18n";
import { areaAccessService, type UserAreas } from "./service";
import { sortedAreaNames, useAreaNames } from "./useAreaNames";

// names shown collapsed
const PREVIEW = 3;

/** restricted user notice */
export function AreaLimitNotice() {
	const { t } = useTranslation();
	const [data, setData] = useState<UserAreas | null>(null);
	const [expanded, setExpanded] = useState(false);
	const names = useAreaNames(data?.effective ?? []);

	useEffect(() => {
		areaAccessService.mine().then(setData).catch(() => setData(null));
	}, []);

	if (!data?.restricted) return null;
	const all = sortedAreaNames(data.effective, names);
	const hidden = all.length - PREVIEW;
	const shown = expanded || hidden <= 0 ? all : all.slice(0, PREVIEW);

	return (
		<div className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-2 text-[11px] leading-snug text-foreground">
			<MapPin className="mt-px h-3 w-3 shrink-0 text-muted-foreground" />
			<p className="min-w-0">
				{all.length > PREVIEW
					? t("areaAccess.limitNoticeCount", { count: all.length, areas: shown.join(", "), defaultValue: "You can create models in {{count}} areas: {{areas}}" })
					: t("areaAccess.limitNotice", { areas: all.join(", "), defaultValue: "You can create models in: {{areas}}." })}
				{hidden > 0 && (
					<button
						type="button"
						data-compact
						onClick={() => setExpanded((v) => !v)}
						aria-expanded={expanded}
						className="ml-1 font-medium text-foreground underline-offset-2 hover:underline"
					>
						{expanded ? t("areaAccess.showLess", "Show less") : t("areaAccess.showMore", { count: hidden, defaultValue: "+{{count}} more" })}
					</button>
				)}
			</p>
		</div>
	);
}
