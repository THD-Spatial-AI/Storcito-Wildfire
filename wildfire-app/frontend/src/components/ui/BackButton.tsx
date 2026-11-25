import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface BackButtonProps {
	className?: string;
}

/** previous page home */
export function BackButton({ className }: BackButtonProps) {
	const { t } = useTranslation();
	const { user } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();

	// direct visit fallback
	const goBack = () => {
		if (location.key !== "default") navigate(-1);
		else navigate(user ? "/app/model-dashboard" : "/");
	};

	return (
		<button
			type="button"
			onClick={goBack}
			className={cn(
				"-ml-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className
			)}
		>
			<ArrowLeft className="h-4 w-4" />
			{t("common.back", "Back")}
		</button>
	);
}
