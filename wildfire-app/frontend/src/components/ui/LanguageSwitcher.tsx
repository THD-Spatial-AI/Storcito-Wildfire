import type { FC } from "react";
import { Check, Languages } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@spatialhub/ui";
import { useTranslation, languages, changeLanguage, type LanguageCode } from "@/i18n";
import { cn } from "@/lib/utils";

/** Topbar language dropdown. */
export const LanguageSwitcher: FC = () => {
	const { t, i18n } = useTranslation();
	const currentCode = (i18n.language?.split("-")[0] || "en") as LanguageCode;

	const handleSelect = (code: LanguageCode) => {
		void changeLanguage(code, "wildfire-app_language");
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={t("settings.language.title", "Language")}
					title={t("settings.language.title", "Language")}
					className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
				>
					<Languages className="h-4 w-4" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44 rounded-lg">
				{languages.map((language) => {
					const isActive = language.code === currentCode;
					return (
						<DropdownMenuItem
							key={language.code}
							onSelect={() => handleSelect(language.code)}
							className={cn(
								"cursor-pointer gap-2",
								isActive && "bg-muted font-medium text-foreground",
							)}
						>
							<span aria-hidden="true" className="text-sm leading-none">{language.flag}</span>
							<span className="min-w-0 flex-1 truncate">{language.nativeName}</span>
							{isActive && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default LanguageSwitcher;
