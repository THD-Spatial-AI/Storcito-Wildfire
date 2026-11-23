interface TableSkeletonProps {
	rows?: number;
	/** checkbox column */
	withCheckbox?: boolean;
}

/** table loading rows */
export function TableSkeleton({ rows = 5, withCheckbox = false }: TableSkeletonProps) {
	return (
		<div className="overflow-hidden rounded-xl border border-border">
			<div className="border-b border-border bg-muted/40 px-4 py-3">
				<div className="md-skeleton h-3 w-36 rounded-md bg-muted" />
			</div>
			<div className="divide-y divide-border">
				{Array.from({ length: rows }, (_, i) => (
					<div key={i} className="flex items-center gap-4 px-4 py-3.5">
						{withCheckbox && <div className="md-skeleton h-4 w-4 shrink-0 rounded bg-muted" />}
						<div
							className="md-skeleton h-3.5 w-full max-w-[220px] rounded-md bg-muted"
							style={{ animationDelay: `${i * 90}ms` }}
						/>
						<div className="md-skeleton hidden h-5 w-20 shrink-0 rounded-full bg-muted sm:block" />
						<div className="md-skeleton hidden h-3.5 w-24 shrink-0 rounded-md bg-muted md:block" />
						<div className="md-skeleton ml-auto h-6 w-24 shrink-0 rounded-md bg-muted" />
					</div>
				))}
			</div>
		</div>
	);
}
