import { useId, type ReactNode } from "react";
import { Switch } from "@spatialhub/ui";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { RISK_PALETTES } from "@/lib/riskPalette";
import { useAccessibilityStore, type MotionPreference, type RiskPalette } from "@/features/settings/store/accessibility";
import DataDisplaySettings from "@/features/settings/DataDisplaySettings";
import { SettingsSection } from "@/features/settings/SettingsSection";

interface ToggleRowProps {
	label: string;
	description: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}

// labelled switch row
function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
	const id = useId();
	return (
		<div className="flex max-w-xl items-start justify-between gap-6">
			<label htmlFor={id} className="cursor-pointer">
				<span className="block text-sm font-medium text-foreground">{label}</span>
				<span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
			</label>
			<Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
		</div>
	);
}

interface ChoiceProps<T extends string> {
	name: string;
	value: T;
	options: { value: T; label: string; description: string; extra?: ReactNode }[];
	onChange: (value: T) => void;
}

// radio cards
function Choice<T extends string>({ name, value, options, onChange }: ChoiceProps<T>) {
	return (
		<div role="radiogroup" aria-label={name} className="grid max-w-xl gap-2 sm:grid-cols-2">
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						data-card
						aria-checked={active}
						onClick={() => onChange(option.value)}
						className={cn(
							"rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							active ? "border-foreground bg-muted/60" : "border-border hover:bg-muted/40"
						)}
					>
						<span className="block text-sm font-medium text-foreground">{option.label}</span>
						<span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
						{option.extra}
					</button>
				);
			})}
		</div>
	);
}

// palette preview strip
const Swatches = ({ palette }: { palette: RiskPalette }) => (
	<span aria-hidden className="mt-2 flex h-2.5 overflow-hidden rounded-full">
		{RISK_PALETTES[palette].map((color) => (
			<span key={color} className="flex-1" style={{ backgroundColor: color }} />
		))}
	</span>
);

/** accessibility options */
export default function AccessibilitySettings() {
	const { t } = useTranslation();
	const { highContrast, palette, motion, largeTargets, setPreference } = useAccessibilityStore();

	return (
		<>
			<SettingsSection
				title={t("settings.dataDisplay.textSize", "Text size")}
				description={t("settings.accessibility.textSizeHint", "Makes all text in the app larger or smaller.")}
			>
				<DataDisplaySettings />
			</SettingsSection>

			<SettingsSection title={t("settings.accessibility.visionTitle", "Vision")}>
				<div className="space-y-6">
					<ToggleRow
						label={t("settings.accessibility.contrast", "High contrast")}
						description={t("settings.accessibility.contrastHint", "Darker text, borders and focus outlines.")}
						checked={highContrast}
						onChange={(v) => setPreference("highContrast", v)}
					/>
					<div>
						<p className="mb-2 text-sm font-medium text-foreground">
							{t("settings.accessibility.palette", "Risk map colours")}
						</p>
						<Choice<RiskPalette>
							name={t("settings.accessibility.palette", "Risk map colours")}
							value={palette}
							onChange={(v) => setPreference("palette", v)}
							options={[
								{
									value: "default",
									label: t("settings.accessibility.paletteDefault", "Standard"),
									description: t("settings.accessibility.paletteDefaultHint", "Green to red."),
									extra: <Swatches palette="default" />,
								},
								{
									value: "colorblind",
									label: t("settings.accessibility.paletteCb", "Colour-blind friendly"),
									description: t("settings.accessibility.paletteCbHint", "Yellow to dark brown, readable with any colour vision."),
									extra: <Swatches palette="colorblind" />,
								},
							]}
						/>
					</div>
				</div>
			</SettingsSection>

			<SettingsSection title={t("settings.accessibility.motionTitle", "Motion")}>
				<Choice<MotionPreference>
					name={t("settings.accessibility.motionTitle", "Motion")}
					value={motion}
					onChange={(v) => setPreference("motion", v)}
					options={[
						{
							value: "system",
							label: t("settings.accessibility.motionSystem", "Follow system"),
							description: t("settings.accessibility.motionSystemHint", "Uses your device setting."),
						},
						{
							value: "reduce",
							label: t("settings.accessibility.motionReduce", "Reduce motion"),
							description: t("settings.accessibility.motionReduceHint", "No animations or map fly-to effects."),
						},
					]}
				/>
			</SettingsSection>

			<SettingsSection title={t("settings.accessibility.inputTitle", "Pointer and touch")}>
				<ToggleRow
					label={t("settings.accessibility.largeTargets", "Larger buttons")}
					description={t("settings.accessibility.largeTargetsHint", "Buttons, menus and checkboxes at least 44 px.")}
					checked={largeTargets}
					onChange={(v) => setPreference("largeTargets", v)}
				/>
			</SettingsSection>
		</>
	);
}
