import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarRange, Loader2, MapPin, Users } from "lucide-react";
import { IconX } from "@tabler/icons-react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { AreaPicker } from "./AreaPicker";
import { PeriodPicker } from "./PeriodPicker";
import {
	areaAccessService,
	areaKey,
	formatPeriod,
	periodAccessService,
	periodKey,
	type AreaRef,
	type GroupAreas,
	type GroupPeriods,
	type Period,
} from "./service";
import { useAreaNames } from "./useAreaNames";

interface AreaAccessDialogProps {
	user: { id: string | number; name?: string; email: string } | null;
	/** user's own group */
	group?: { id: string; name: string } | null;
	isOpen: boolean;
	onClose: () => void;
	onSaved?: (message: string) => void;
}

type Subject = { kind: "user" } | { kind: "group"; id: string; name: string };
type Tab = "areas" | "periods";

// group row data
interface GroupRow {
	id: string;
	name: string;
	areas: AreaRef[];
	periods: Period[];
}

const errorText = (error: unknown, fallback: string) => {
	const msg = (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
	return msg?.error || msg?.message || fallback;
};

const sig = (keys: string[]) => [...keys].sort().join(",");
const areaSig = (list: AreaRef[]) => sig(list.map(areaKey));
const periodSig = (list: Period[]) => sig(list.map(periodKey));

// own group first
function buildGroupRows(group: { id: string; name: string } | null | undefined, areas: GroupAreas[], periods: GroupPeriods[]): GroupRow[] {
	const rows = new Map<string, GroupRow>();
	const row = (id: string, name: string) => {
		if (!rows.has(id)) rows.set(id, { id, name, areas: [], periods: [] });
		return rows.get(id) as GroupRow;
	};
	if (group) row(group.id, group.name);
	areas.forEach((g) => (row(g.group_id, g.group_name).areas = g.areas));
	periods.forEach((g) => (row(g.group_id, g.group_name).periods = g.periods));
	return [...rows.values()];
}

// empty text keys
const EMPTY_TEXT: Record<Tab, Record<"group" | "inherited" | "open", [string, string]>> = {
	areas: {
		group: ["areaAccess.groupEmpty", "No areas. Members are not limited by this group."],
		inherited: ["areaAccess.userEmptyGroup", "No extra areas. The user can model in their group's areas."],
		open: ["areaAccess.userEmpty", "No areas. The user can model everywhere the engine has data."],
	},
	periods: {
		group: ["periodAccess.groupEmpty", "No periods. Members are not limited by this group."],
		inherited: ["periodAccess.userEmptyGroup", "No extra periods. The user can model in their group's periods."],
		open: ["periodAccess.userEmpty", "No periods. The user can model any date the engine has data for."],
	},
};

function InheritedRow({ row, tab, onEdit }: { row: GroupRow; tab: Tab; onEdit: () => void }) {
	const { t, i18n } = useTranslation();
	const names = useAreaNames(row.areas);
	const summary =
		tab === "areas"
			? row.areas.map((a) => names[areaKey(a)] ?? a.code).join(", ")
			: row.periods.map((p) => formatPeriod(p, i18n?.language ?? "en")).join(", ");
	return (
		<li className="flex items-center justify-between gap-3 px-3 py-2.5">
			<div className="min-w-0">
				<p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
					<Users className="h-3.5 w-3.5 text-muted-foreground" />
					{row.name}
				</p>
				<p className="truncate text-xs text-muted-foreground">
					{summary ||
						(tab === "areas"
							? t("areaAccess.groupNoAreas", "No areas set for this group")
							: t("periodAccess.groupNone", "No periods set for this group"))}
				</p>
			</div>
			<button type="button" onClick={onEdit} className="shrink-0 text-sm font-medium text-foreground hover:underline">
				{t("areaAccess.editGroup", "Edit group")}
			</button>
		</li>
	);
}

/** user or group access */
export function AreaAccessDialog({ user, group, isOpen, onClose, onSaved }: AreaAccessDialogProps) {
	const { t } = useTranslation();
	const [subject, setSubject] = useState<Subject>({ kind: "user" });
	const [tab, setTab] = useState<Tab>("areas");
	const [areas, setAreas] = useState<AreaRef[]>([]);
	const [periods, setPeriods] = useState<Period[]>([]);
	const [initial, setInitial] = useState({ areas: "", periods: "" });
	const [inheritedAreas, setInheritedAreas] = useState<GroupAreas[]>([]);
	const [inheritedPeriods, setInheritedPeriods] = useState<GroupPeriods[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isOpen || !user) return;
		let alive = true;
		setLoading(true);
		setError(null);
		const request: Promise<readonly [AreaRef[], Period[]]> =
			subject.kind === "user"
				? Promise.all([areaAccessService.user(user.id), periodAccessService.user(user.id)]).then(([ua, up]) => {
						if (alive) {
							setInheritedAreas(ua.groups);
							setInheritedPeriods(up.groups);
						}
						return [ua.direct, up.direct] as const;
					})
				: Promise.all([areaAccessService.group(subject.id), periodAccessService.group(subject.id)]);
		request
			.then(([a, p]) => {
				if (!alive) return;
				setAreas([...a]);
				setPeriods([...p]);
				setInitial({ areas: areaSig([...a]), periods: periodSig([...p]) });
			})
			.catch((e) => alive && setError(errorText(e, t("areaAccess.loadFailed", "Could not load area access."))))
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [isOpen, user, subject, t]);

	// reset on close
	useEffect(() => {
		if (!isOpen) {
			setSubject({ kind: "user" });
			setTab("areas");
		}
	}, [isOpen]);

	if (!user) return null;
	const areasDirty = areaSig(areas) !== initial.areas;
	const periodsDirty = periodSig(periods) !== initial.periods;
	const isGroup = subject.kind === "group";

	const groupRows = buildGroupRows(group, inheritedAreas, inheritedPeriods);
	const limitedByGroup = tab === "areas" ? inheritedAreas.length > 0 : inheritedPeriods.length > 0;
	const [emptyKey, emptyFallback] = EMPTY_TEXT[tab][isGroup ? "group" : limitedByGroup ? "inherited" : "open"];
	const emptyText = t(emptyKey, emptyFallback);

	const save = async () => {
		setSaving(true);
		setError(null);
		try {
			// user or group
			const forUser = subject.kind === "user";
			const id = forUser ? String(user.id) : subject.id;
			if (areasDirty) await (forUser ? areaAccessService.setUser(id, areas) : areaAccessService.setGroup(id, areas));
			if (periodsDirty) await (forUser ? periodAccessService.setUser(id, periods) : periodAccessService.setGroup(id, periods));
			setInitial({ areas: areaSig(areas), periods: periodSig(periods) });
			onSaved?.(
				subject.kind === "user"
					? t("areaAccess.savedUserAccess", { name: user.name || user.email, defaultValue: "Access saved for {{name}}." })
					: t("areaAccess.savedGroupAccess", { name: subject.name, defaultValue: "Access saved for group {{name}}." })
			);
			if (subject.kind === "group") setSubject({ kind: "user" });
			else onClose();
		} catch (e) {
			setError(errorText(e, t("areaAccess.saveFailed", "Could not save area access.")));
		} finally {
			setSaving(false);
		}
	};

	const tabs: { id: Tab; label: string; icon: typeof MapPin; dirty: boolean }[] = [
		{ id: "areas", label: t("areaAccess.tabAreas", "Areas"), icon: MapPin, dirty: areasDirty },
		{ id: "periods", label: t("periodAccess.tab", "Periods"), icon: CalendarRange, dirty: periodsDirty },
	];

	return (
		<AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent className="!max-w-[46rem] max-h-[90vh] flex flex-col gap-0 p-0">
				<AlertDialogHeader className="relative border-b border-border px-6 pt-6 pb-0">
					{isGroup && (
						<button
							type="button"
							onClick={() => setSubject({ kind: "user" })}
							className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
						>
							<ArrowLeft className="h-4 w-4" />
							{user.name || user.email}
						</button>
					)}
					<AlertDialogTitle className="text-lg font-semibold text-foreground">
						{isGroup
							? t("areaAccess.groupAccessTitle", { name: subject.name, defaultValue: "Access for group {{name}}" })
							: t("areaAccess.accessTitle", "Access")}
					</AlertDialogTitle>
					<AlertDialogDescription className="mt-1 text-sm text-muted-foreground">
						{isGroup
							? t("areaAccess.groupAccessSubtitle", "Every member of this group can create and run models in these areas and periods.")
							: t("areaAccess.accessSubtitle", { email: user.email, defaultValue: "Where and when {{email}} can create and run models." })}
					</AlertDialogDescription>
					<button
						type="button"
						onClick={onClose}
						aria-label={t("common.close", "Close")}
						className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						<IconX className="h-4 w-4" />
					</button>
					<div role="tablist" className="-mb-px mt-4 flex gap-1">
						{tabs.map(({ id, label, icon: Icon, dirty }) => (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={tab === id}
								onClick={() => setTab(id)}
								className={cn(
									"inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
									tab === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
								)}
							>
								<Icon className="h-4 w-4" />
								{label}
								{dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label={t("areaAccess.unsaved", "Unsaved")} />}
							</button>
						))}
					</div>
				</AlertDialogHeader>

				{/* room for dropdowns */}
				<div className="min-h-[26rem] space-y-5 overflow-y-auto p-6">
					{error && (
						<div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							<AlertTriangle className="h-4 w-4 shrink-0" />
							{error}
						</div>
					)}

					{loading ? (
						<div className="flex justify-center py-10">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : (
						<>
							{!isGroup && groupRows.length > 0 && (
								<section className="space-y-2">
									<h3 className="text-sm font-semibold text-foreground">{t("areaAccess.fromGroups", "From groups")}</h3>
									<ul className="divide-y divide-border rounded-lg border border-border">
										{groupRows.map((g) => (
											<InheritedRow key={g.id} row={g} tab={tab} onEdit={() => setSubject({ kind: "group", id: g.id, name: g.name })} />
										))}
									</ul>
								</section>
							)}
							<section className="space-y-2">
								{!isGroup && (
									<h3 className="text-sm font-semibold text-foreground">
										{tab === "areas" ? t("areaAccess.ownAreas", "Extra areas for this user") : t("periodAccess.own", "Extra periods for this user")}
									</h3>
								)}
								{tab === "areas" ? (
									<AreaPicker value={areas} onChange={setAreas} emptyText={emptyText} />
								) : (
									<PeriodPicker value={periods} onChange={setPeriods} emptyText={emptyText} />
								)}
							</section>
						</>
					)}
				</div>

				<div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
					<button
						type="button"
						onClick={isGroup ? () => setSubject({ kind: "user" }) : onClose}
						className="h-9 rounded-lg px-4 text-sm font-medium text-foreground hover:bg-muted"
					>
						{t("common.cancel", "Cancel")}
					</button>
					<button
						type="button"
						onClick={() => void save()}
						disabled={(!areasDirty && !periodsDirty) || saving || loading}
						className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{saving && <Loader2 className="h-4 w-4 animate-spin" />}
						{t("common.save", "Save")}
					</button>
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
}
