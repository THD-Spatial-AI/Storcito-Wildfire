import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface AdminSectionHeaderProps {
	icon: LucideIcon;
	title: string;
	subtitle?: string;
	/** right side controls */
	children?: ReactNode;
}

/** admin section heading */
export function AdminSectionHeader({ icon: Icon, title, subtitle, children }: AdminSectionHeaderProps) {
	return (
		<div className="md-rise flex flex-wrap items-center justify-between gap-3">
			<div className="flex min-w-0 items-center gap-3.5">
				<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
					<Icon className="h-5 w-5 text-muted-foreground" />
				</div>
				<div className="min-w-0">
					<h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
					{subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
				</div>
			</div>
			{children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
		</div>
	);
}
