import { useEffect, useRef, useState, type FC } from "react";
import { Check, Languages } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation, languages, changeLanguage, type LanguageCode } from "@/i18n";
import { cn } from "@/lib/utils";

/** Topbar language dropdown. */
export const LanguageSwitcher: FC = () => {
	const { t, i18n } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const currentCode = (i18n.language?.split("-")[0] || "en") as LanguageCode;

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		if (isOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	const handleSelect = (code: LanguageCode) => {
		setIsOpen(false);
		void changeLanguage(code, "wildfire-app_language");
	};

	return (
		<div className="relative" ref={dropdownRef}>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={() => setIsOpen((open) => !open)}
						aria-label={t("settings.language.title", "Language")}
						aria-expanded={isOpen}
						className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
					>
						<Languages className="h-4 w-4" />
					</button>
				</TooltipTrigger>
				<TooltipContent>{t("settings.language.title", "Language")}</TooltipContent>
			</Tooltip>

			{isOpen && (
				<div className="md-fade-in absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
					{languages.map((language) => {
						const isActive = language.code === currentCode;
						return (
							<button
								key={language.code}
								type="button"
								onClick={() => handleSelect(language.code)}
								className={cn(
									"flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors duration-150",
									isActive
										? "bg-muted font-medium text-foreground"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								<span aria-hidden="true" className="text-sm leading-none">{language.flag}</span>
								<span className="min-w-0 flex-1 truncate">{language.nativeName}</span>
								{isActive && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default LanguageSwitcher;
