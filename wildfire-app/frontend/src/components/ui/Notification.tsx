import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useTranslation } from "@/i18n";

interface NotificationProps {
	isOpen: boolean;
	message: string;
	/** optional bold line */
	title?: string;
	severity: "success" | "error" | "warning" | "info";
	onClose: () => void;
	duration?: number;
}

const STYLES = {
	success: { icon: CheckCircle2, tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
	error: { icon: XCircle, tint: "bg-red-500/10 text-red-600 dark:text-red-400" },
	warning: { icon: AlertTriangle, tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
	info: { icon: Info, tint: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
} as const;

/** shared toast */
const Notification: React.FC<NotificationProps> = ({ isOpen, message, title, severity, onClose, duration = 5000 }) => {
	const { t } = useTranslation();

	// auto hide
	React.useEffect(() => {
		if (isOpen && duration > 0) {
			const timer = setTimeout(onClose, duration);
			return () => clearTimeout(timer);
		}
	}, [isOpen, duration, onClose]);

	if (!isOpen) return null;
	const { icon: Icon, tint } = STYLES[severity] ?? STYLES.info;

	return (
		<div
			role={severity === "error" ? "alert" : "status"}
			aria-live={severity === "error" ? "assertive" : "polite"}
			className="fixed right-4 top-16 z-[80] w-[min(24rem,calc(100vw-2rem))] animate-slide-in"
		>
			<div className="flex items-start gap-3 rounded-xl border border-border bg-popover p-3.5 text-popover-foreground shadow-lg">
				<span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tint}`}>
					<Icon className="h-4 w-4" />
				</span>
				<div className="min-w-0 flex-1 pt-0.5">
					{title && <p className="text-sm font-semibold text-foreground">{title}</p>}
					<p className={title ? "mt-0.5 text-sm text-muted-foreground" : "text-sm font-medium text-foreground"}>{message}</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label={t("common.close", "Close")}
					className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
};

export default Notification;
