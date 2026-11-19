import { createContext, useContext, useState, ReactNode, useRef, useLayoutEffect, useMemo, useCallback } from "react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Button,
} from "@spatialhub/ui";
import { LoadingDots } from "@/components/ui/loading";
import {
	IconAlertTriangle,
	IconCircleCheck,
	IconExclamationCircle,
	IconInfoCircle,
	IconTrash,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type ConfirmType = "success" | "info" | "warning" | "error" | "delete" | "default";
const DEFAULT_TITLE = "Confirm Action" as const;
const DEFAULT_DESC = "This action cannot be undone." as const;

interface ConfirmOptions {
	title?: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	type?: ConfirmType;
	onConfirm?: () => Promise<void>;
	itemName?: string;
	itemType?: string;
	isDangerous?: boolean;
	/** set internally */
	inlineName?: boolean;
}

interface ConfirmContextValue {
	confirm: (options: ConfirmOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [options, setOptions] = useState<ConfirmOptions>({ title: DEFAULT_TITLE, description: DEFAULT_DESC, type: "default" });
	const [resolveFn, setResolveFn] = useState<(() => void) | null>(null);
	const confirmButtonRef = useRef<HTMLButtonElement>(null);

	useLayoutEffect(() => {
		if (isOpen && confirmButtonRef.current) {
			confirmButtonRef.current.focus();
		}
	}, [isOpen]);



	const confirm = useCallback((opts: ConfirmOptions) => {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}

		const finalOptions = { ...opts };

		if (opts.type === 'delete') {
			const itemName = opts.itemName;
			const itemType = opts.itemType || 'item';
			
			if (!opts.title) {
				finalOptions.title = `Delete ${itemType}?`;
			}
			
			if (!opts.description) {
				// bold name leads
				finalOptions.inlineName = Boolean(itemName);
				finalOptions.description = itemName
					? `will be permanently deleted. This action cannot be undone.`
					: `Are you sure you want to delete this ${itemType}? This action cannot be undone.`;
			}
			
			if (!opts.confirmLabel) {
				finalOptions.confirmLabel = 'Delete';
			}
			
			if (!opts.cancelLabel) {
				finalOptions.cancelLabel = 'Cancel';
			}
		}
		
		setOptions(finalOptions);
		setIsOpen(true);

		return new Promise<void>((resolve) => {
			setResolveFn(() => resolve);
		});
	}, []);

	const handleConfirm = async () => {
		try {
			setLoading(true);
			await options.onConfirm?.();
		} finally {
			setLoading(false);
			setIsOpen(false);
			resolveFn?.();
		}
	};

	const handleCancel = () => {
		if (loading) return;
		setIsOpen(false);
	};

	const onOpenChange = (open: boolean) => {
		if (!loading) {
			setIsOpen(open);
		}
	};

	const confirmValue = useMemo(() => ({ confirm }), [confirm]);

	const isDestructive = options.type === 'delete' || options.type === 'error';

	return (
		<ConfirmContext.Provider value={confirmValue}>
			{children}
			<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
				<AlertDialogContent className="w-[calc(100vw-2rem)] !max-w-[420px] gap-0 overflow-hidden rounded-xl border border-border bg-card p-0 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.25)]">
					<div className="flex gap-3.5 px-5 pt-5 pb-5">
						{options.type && <AlertBadge type={options.type} />}
						<AlertDialogHeader className="min-w-0 flex-1 space-y-1 text-left">
							<AlertDialogTitle className="text-[15px] font-semibold leading-6 text-foreground">
								{options.title}
							</AlertDialogTitle>
							<AlertDialogDescription className={cn(
								"text-[13px] leading-5 text-muted-foreground",
								options.description ? "" : "sr-only"
							)}>
								{options.inlineName && options.itemName && (
									<span className="font-medium text-foreground">{options.itemName} </span>
								)}
								{options.description || options.title || "Confirmation dialog"}
							</AlertDialogDescription>
						</AlertDialogHeader>
					</div>

					<AlertDialogFooter className="flex-row justify-end gap-2 border-t border-border bg-muted px-5 py-3 sm:space-x-0">
						<Button
							variant="outline"
							disabled={loading}
							onClick={handleCancel}
							className="h-8 cursor-pointer rounded-lg border-border bg-background px-3.5 text-[13px] font-medium text-foreground shadow-none hover:bg-muted"
						>
							{options.cancelLabel || "Cancel"}
						</Button>
						<Button
							ref={confirmButtonRef}
							autoFocus
							variant={isDestructive ? 'destructive' : 'default'}
							disabled={loading}
							onClick={handleConfirm}
							className={cn(
								"h-8 min-w-[72px] cursor-pointer rounded-lg px-3.5 text-[13px] font-medium shadow-none transition-colors duration-150",
								"focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
								isDestructive
									? "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40"
									: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring"
							)}
						>
							{loading ? <LoadingDots className={isDestructive ? "bg-white" : "bg-primary-foreground"} /> : options.confirmLabel || "Confirm"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ConfirmContext.Provider>
	);
};

 
export const useConfirm = () => {
	const context = useContext(ConfirmContext);
	if (!context) throw new Error("useConfirm must be used within ConfirmProvider");
	return context.confirm;
};

// dashboard tones
const BADGE: Record<ConfirmType, { tone: string; Icon: typeof IconAlertTriangle }> = {
	success: { tone: "text-emerald-600 dark:text-emerald-400", Icon: IconCircleCheck },
	error: { tone: "text-destructive", Icon: IconExclamationCircle },
	info: { tone: "text-blue-600 dark:text-blue-400", Icon: IconInfoCircle },
	delete: { tone: "text-destructive", Icon: IconTrash },
	warning: { tone: "text-amber-600 dark:text-amber-400", Icon: IconAlertTriangle },
	default: { tone: "text-foreground/70", Icon: IconAlertTriangle },
};

const AlertBadge: React.FC<{ type: ConfirmType }> = ({ type }) => {
	const { tone, Icon } = BADGE[type] ?? BADGE.default;
	return (
		<div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-muted", tone)}>
			<Icon className="h-[18px] w-[18px]" stroke={1.75} />
		</div>
	);
};
