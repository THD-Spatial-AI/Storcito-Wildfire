/** Chip styling. */

export type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
export type ChipVariant = "filled" | "outlined" | "gradient";
export type ChipSize = "small" | "medium";

// Soft-tint semantic styles.
const CHIP_COLOR_CLASSES: Record<ChipColor, Record<ChipVariant, string>> = {
	default: {
		filled: "bg-muted text-foreground ring-1 ring-border hover:bg-muted/70",
		outlined: "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
		gradient: "bg-muted text-foreground ring-1 ring-border hover:bg-muted/70"
	},
	primary: {
		filled: "bg-primary text-primary-foreground hover:bg-primary/90",
		outlined: "border border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10",
		gradient: "bg-primary text-primary-foreground hover:bg-primary/90"
	},
	secondary: {
		filled: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300",
		outlined: "border border-amber-500/40 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300",
		gradient: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
	},
	error: {
		filled: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20 dark:text-red-300",
		outlined: "border border-red-500/40 bg-red-500/5 text-red-700 hover:bg-red-500/10 dark:text-red-300",
		gradient: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20 dark:text-red-300"
	},
	info: {
		filled: "bg-cyan-500/10 text-cyan-700 ring-1 ring-cyan-500/20 dark:text-cyan-300",
		outlined: "border border-cyan-500/40 bg-cyan-500/5 text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-300",
		gradient: "bg-cyan-500/10 text-cyan-700 ring-1 ring-cyan-500/20 dark:text-cyan-300"
	},
	success: {
		filled: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300",
		outlined: "border border-emerald-500/40 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300",
		gradient: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
	},
	warning: {
		filled: "bg-yellow-500/10 text-yellow-700 ring-1 ring-yellow-500/25 dark:text-yellow-300",
		outlined: "border border-yellow-500/40 bg-yellow-500/5 text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-300",
		gradient: "bg-yellow-500/10 text-yellow-700 ring-1 ring-yellow-500/25 dark:text-yellow-300"
	},
};

export const getChipClasses = (
	color: ChipColor,
	variant: ChipVariant,
	size: ChipSize,
	hasClick: boolean,
	customClass?: string
): string => {
	const baseClasses = "inline-flex items-center font-medium rounded-full transition-colors duration-150";
	const sizeClasses = size === "small"
		? "px-2.5 py-0.5 text-xs"
		: "px-3 py-1 text-sm";
	const interactiveClasses = hasClick ? "cursor-pointer" : "";

	return `${baseClasses} ${sizeClasses} ${CHIP_COLOR_CLASSES[color][variant]} ${interactiveClasses} ${customClass || ''}`;
};
