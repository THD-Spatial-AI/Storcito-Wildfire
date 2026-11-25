import type { LucideIcon } from "lucide-react";

export interface SectionNavItem<K extends string> {
	key: K;
	label: string;
	icon: LucideIcon;
}

export interface SectionNavGroup<K extends string> {
	label?: string;
	items: SectionNavItem<K>[];
}

interface SectionNavProps<K extends string> {
	groups: SectionNavGroup<K>[];
	active: K;
	onSelect: (key: K) => void;
	ariaLabel: string;
	/** side menu from 2xl */
	wideOnly?: boolean;
}

/** left section menu */
export function SectionNav<K extends string>({ groups, active, onSelect, ariaLabel, wideOnly = false }: SectionNavProps<K>) {
	// full class names
	const v = wideOnly
		? { nav: "2xl:sticky 2xl:top-6 2xl:self-start", list: "2xl:flex-col 2xl:overflow-visible", group: "2xl:flex-col", sep: "2xl:mt-3 2xl:border-t 2xl:border-border 2xl:pt-3", label: "2xl:block", bar: "2xl:block" }
		: { nav: "lg:sticky lg:top-6 lg:self-start", list: "lg:flex-col lg:overflow-visible", group: "lg:flex-col", sep: "lg:mt-3 lg:border-t lg:border-border lg:pt-3", label: "lg:block", bar: "lg:block" };
	return (
		<nav aria-label={ariaLabel} className={`md-rise ${v.nav}`}>
			<div className={`flex gap-1 overflow-x-auto scrollbar-hide ${v.list}`}>
				{groups.map((group, gi) => (
					<div key={gi} className={`flex gap-1 ${v.group} ${gi > 0 ? v.sep : ""}`}>
						{group.label && (
							<span className={`hidden px-3 pb-1 text-xs font-semibold text-muted-foreground ${v.label}`}>{group.label}</span>
						)}
						{group.items.map((item) => {
							const Icon = item.icon;
							const isActive = active === item.key;
							return (
								<button
									key={item.key}
									type="button"
									onClick={() => onSelect(item.key)}
									aria-current={isActive ? "page" : undefined}
									className={`relative inline-flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
										isActive ? "bg-accent font-semibold text-foreground" : "text-foreground/75 hover:bg-muted hover:text-foreground"
									}`}
								>
									{/* active bar */}
									{isActive && <span aria-hidden className={`absolute -left-2 top-1.5 bottom-1.5 hidden w-[3px] rounded-full bg-foreground ${v.bar}`} />}
									<Icon className="h-4 w-4 text-muted-foreground" />
									{item.label}
								</button>
							);
						})}
					</div>
				))}
			</div>
		</nav>
	);
}
