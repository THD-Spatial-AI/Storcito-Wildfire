import { useEffect, useState, type ReactNode } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { useTranslation } from "@/i18n";
import { BoundaryLevelSelect } from "@/features/admin-boundaries/components/BoundaryLevelSelect";
import { BOUNDARY_LEVELS } from "@/features/admin-boundaries/config";
import { boundariesService } from "@/features/admin-boundaries/services/boundariesService";
import type { BoundaryItem } from "@/features/admin-boundaries/types";
import { areaKey, COUNTRY, type AreaLevel, type AreaRef } from "./service";
import { rememberAreaName, useAreaNames } from "./useAreaNames";

const LEVELS: AreaLevel[] = ["community", "province", "municipality"];
// labels from config
const levelLabel = (level: AreaLevel) => BOUNDARY_LEVELS.find((l) => l.id === level)?.label ?? level;

/** dashed none box */
export const EmptyNote = ({ children }: { children: ReactNode }) => (
	<p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">{children}</p>
);

/** removable grant chip */
export function GrantChip({ children, onRemove, removeLabel }: { children: ReactNode; onRemove?: () => void; removeLabel: string }) {
	return (
		<li className="inline-flex items-center gap-1.5 rounded-full bg-muted py-1 pl-2.5 pr-1.5 text-sm text-foreground ring-1 ring-border">
			{children}
			{onRemove && (
				<button
					type="button"
					data-compact
					onClick={onRemove}
					aria-label={removeLabel}
					className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</li>
	);
}

interface AreaPickerProps {
	value: AreaRef[];
	onChange: (areas: AreaRef[]) => void;
	disabled?: boolean;
	/** empty state text */
	emptyText?: string;
}

/** cascading area picker */
export function AreaPicker({ value, onChange, disabled = false, emptyText }: AreaPickerProps) {
	const { t } = useTranslation();
	const names = useAreaNames(value);
	const [items, setItems] = useState<BoundaryItem[][]>([[], [], []]);
	const [picked, setPicked] = useState<(BoundaryItem | null)[]>([null, null, null]);
	const [loading, setLoading] = useState<boolean[]>([false, false, false]);

	const load = async (index: number, parent: string) => {
		setLoading((l) => l.map((v, i) => (i === index ? true : v)));
		try {
			const list = await boundariesService.list(LEVELS[index], parent);
			setItems((prev) => prev.map((v, i) => (i === index ? list : i > index ? [] : v)));
			// auto pick single
			const covered = list.filter((x) => x.covered);
			if (covered.length === 1 && list.length === 1) choose(index, covered[0]);
		} catch {
			setItems((prev) => prev.map((v, i) => (i >= index ? [] : v)));
		} finally {
			setLoading((l) => l.map((v, i) => (i === index ? false : v)));
		}
	};

	const choose = (index: number, item: BoundaryItem | null) => {
		setPicked((prev) => prev.map((v, i) => (i === index ? item : i > index ? null : v)));
		setItems((prev) => prev.map((v, i) => (i > index ? [] : v)));
		if (item && index < LEVELS.length - 1) void load(index + 1, item.code);
	};

	useEffect(() => {
		void load(0, COUNTRY);
		// once on mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// deepest chosen level
	const deepest = [...picked.keys()].reverse().find((i) => picked[i]);
	const candidate = deepest === undefined ? null : { level: LEVELS[deepest], code: (picked[deepest] as BoundaryItem).code };
	const already = candidate ? value.some((v) => areaKey(v) === areaKey(candidate)) : false;

	const add = () => {
		if (!candidate || already || deepest === undefined) return;
		rememberAreaName(candidate, (picked[deepest] as BoundaryItem).name);
		onChange([...value, candidate]);
		// keep parents chosen
		choose(deepest, null);
	};

	return (
		<div className="space-y-3">
			{!disabled && (
				<div className="space-y-2">
					<div className="grid gap-2 sm:grid-cols-3">
						{LEVELS.map((level, i) => (
							<BoundaryLevelSelect
								key={level}
								label={t(`boundaries.levels.${level}`, levelLabel(level))}
								items={items[i]}
								value={picked[i]}
								loading={loading[i]}
								disabled={i > 0 && !picked[i - 1]}
								onChange={(item) => choose(i, item)}
							/>
						))}
					</div>
					<div className="flex items-center justify-between gap-3">
						<p className="text-xs text-muted-foreground">
							{t("areaAccess.pickerHint", "Pick a community, province or municipality. A larger area includes everything inside it.")}
						</p>
						<button
							type="button"
							onClick={add}
							disabled={!candidate || already}
							className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Plus className="h-4 w-4" />
							{already ? t("areaAccess.added", "Added") : t("areaAccess.add", "Add area")}
						</button>
					</div>
				</div>
			)}

			{value.length === 0 ? (
				<EmptyNote>{emptyText ?? t("areaAccess.none", "No areas set.")}</EmptyNote>
			) : (
				<ul className="flex flex-wrap gap-1.5">
					{value.map((ref) => (
						<GrantChip
							key={areaKey(ref)}
							removeLabel={t("areaAccess.remove", "Remove area")}
							onRemove={disabled ? undefined : () => onChange(value.filter((v) => areaKey(v) !== areaKey(ref)))}
						>
							<MapPin className="h-3.5 w-3.5 text-muted-foreground" />
							<span>{names[areaKey(ref)] ?? ref.code}</span>
							<span className="text-xs text-muted-foreground">{t(`boundaries.levels.${ref.level}`, levelLabel(ref.level))}</span>
						</GrantChip>
					))}
				</ul>
			)}
		</div>
	);
}
