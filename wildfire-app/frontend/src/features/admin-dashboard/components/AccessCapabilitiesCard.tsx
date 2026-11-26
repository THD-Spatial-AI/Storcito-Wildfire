import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { useMapStore } from "@/features/interactive-map/store/map-store";
import { useModelStatsQuery } from "@/features/model-dashboard/hooks/useModelsQuery";
import { hasMinimumAccessLevel } from "@/utils/access-level";
import type { User } from "@/types/user";

interface AccessCapabilitiesCardProps {
	accessLevel: User["access_level"] | undefined;
}

interface Capability {
	key: string;
	label: string;
	allowed: boolean;
	detail?: string;
}

/** level allowed features */
export function AccessCapabilitiesCard({ accessLevel }: AccessCapabilitiesCardProps) {
	const { t } = useTranslation();
	const layers = useMapStore((s) => s.layers);
	const { data: statsResponse } = useModelStatsQuery();
	const stats = statsResponse?.data;

	const isExpert = accessLevel === "expert";
	const isManager = hasMinimumAccessLevel(accessLevel, "manager");
	const mapsAllowed = layers.filter((layer) => hasMinimumAccessLevel(accessLevel, layer.accessLevel)).length;

	// backend model limit
	const quota = !stats
		? undefined
		: stats.is_unlimited || !stats.model_limit
			? t("adminDashboard.access.quotaUnlimited", { count: stats.total, defaultValue: "{{count}} models, no limit" })
			: t("adminDashboard.access.quotaUsed", { used: stats.total, limit: stats.model_limit, defaultValue: "{{used}} of {{limit}} models used" });

	const capabilities: Capability[] = [
		{ key: "run", label: t("adminDashboard.access.runModels", "Create and run models"), allowed: true, detail: quota },
		{ key: "share", label: t("adminDashboard.access.shareOwn", "Workspaces and sharing your own models"), allowed: true },
		{
			key: "maps",
			label: t("adminDashboard.access.baseMaps", "Base maps"),
			allowed: mapsAllowed > 0,
			detail: t("adminDashboard.access.mapsCount", { count: mapsAllowed, total: layers.length, defaultValue: "{{count}} of {{total}}" }),
		},
		{ key: "compare", label: t("adminDashboard.access.compare", "Compare two models"), allowed: isManager },
		{
			key: "users",
			label: isExpert
				? t("adminDashboard.access.manageAllUsers", "Manage all users")
				: t("adminDashboard.access.manageGroupUsers", "Manage users in your groups"),
			allowed: isManager,
		},
		{ key: "allModels", label: t("adminDashboard.access.allModels", "See every user's models"), allowed: isExpert },
		{ key: "engine", label: t("adminDashboard.access.engine", "Edit engine settings and read feedback"), allowed: isExpert },
	];

	return (
		<div className="max-w-3xl">
			{/* two compact columns */}
			<ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
				{capabilities.map((cap) => (
					<li key={cap.key} className="flex items-center gap-3 py-1.5">
						<span
							className={cn(
								"flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
								cap.allowed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
							)}
							aria-hidden
						>
							{cap.allowed ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
						</span>
						<span className={cn("min-w-0 text-sm", cap.allowed ? "text-foreground" : "text-muted-foreground")}>
							{cap.label}
							{cap.detail && cap.allowed && (
								<span className="ml-1.5 text-xs tabular-nums text-muted-foreground">· {cap.detail}</span>
							)}
							<span className="sr-only">
								{cap.allowed ? t("adminDashboard.access.allowed", "Allowed") : t("adminDashboard.access.notAllowed", "Not included")}
							</span>
						</span>
					</li>
				))}
			</ul>
			{!isExpert && <p className="pt-3 text-xs text-muted-foreground">{t("adminDashboard.accessPermissions.upgradeMessage")}</p>}
		</div>
	);
}
