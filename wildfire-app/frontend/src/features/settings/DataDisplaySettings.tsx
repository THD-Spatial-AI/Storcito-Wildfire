import React from "react";
import { cn } from "@/lib/utils";
import { useDataDisplayStore } from "@/features/settings/store/data-display";
import { useTranslation } from "@/i18n";

const OptionButton: React.FC<{
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}> = ({ active, onClick, children }) => (
	<button
		type="button"
		aria-pressed={active}
		onClick={onClick}
		className={cn(
			"inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
			active
				? "bg-primary text-primary-foreground shadow-sm"
				: "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
		)}
	>
		{children}
	</button>
);

const DataDisplaySettings: React.FC = () => {
	const { t } = useTranslation();
	const { textSize, setPreference } = useDataDisplayStore();

	return (
		<div role="group" aria-label={t('settings.dataDisplay.textSize', 'Text size')} className="flex gap-1.5">
			{([
				{ value: "small" as const, label: t('settings.dataDisplay.textSizes.small', 'Small') },
				{ value: "normal" as const, label: t('settings.dataDisplay.textSizes.normal', 'Normal') },
				{ value: "large" as const, label: t('settings.dataDisplay.textSizes.large', 'Large') },
			]).map((option) => (
				<OptionButton
					key={option.value}
					active={textSize === option.value}
					onClick={() => setPreference("textSize", option.value)}
				>
					{option.label}
				</OptionButton>
			))}
		</div>
	);
};

export default DataDisplaySettings;
