import { RefreshCw, Search, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { cn } from "@/lib/utils";

export const TOOLBAR_BUTTON_CLASS =
	"inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors duration-150 hover:border-foreground/20 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";
export const TOOLBAR_ICON_BUTTON_CLASS =
	"inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground/70 transition-colors duration-150 hover:border-foreground/20 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	className?: string;
}

/** toolbar search field */
export function SearchInput({ value, onChange, placeholder, className }: SearchInputProps) {
	return (
		<div className={cn("relative min-w-0 flex-1", className)}>
			<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<input
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				aria-label={placeholder}
				className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground transition-[color,border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-foreground/20 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
			/>
		</div>
	);
}

interface RefreshButtonProps {
	onClick: () => void;
	spinning: boolean;
	label: string;
	dataTour?: string;
}

/** toolbar refresh button */
export function RefreshButton({ onClick, spinning, label, dataTour }: RefreshButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					data-tour={dataTour}
					onClick={onClick}
					disabled={spinning}
					className={TOOLBAR_ICON_BUTTON_CLASS}
					aria-label={label}
				>
					<RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin motion-reduce:animate-none" : ""}`} />
				</button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

interface FilterChipProps {
	label: string;
	onRemove: () => void;
	removeLabel: string;
}

/** active filter removable */
export function FilterChip({ label, onRemove, removeLabel }: FilterChipProps) {
	return (
		<span className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-muted/60 pl-2.5 pr-1 text-xs font-medium text-foreground">
			{label}
			<button
				type="button"
				onClick={onRemove}
				aria-label={`${removeLabel}: ${label}`}
				className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<X className="h-3 w-3" />
			</button>
		</span>
	);
}
