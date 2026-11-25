import type { ReactNode } from "react";

interface SettingsSectionProps {
	title: string;
	description?: ReactNode;
	children: ReactNode;
}

/** heading line content */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
	return (
		<section className="md-rise">
			<h2 className="border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
			{description && <p className="mt-3 text-sm text-muted-foreground">{description}</p>}
			<div className="mt-4">{children}</div>
		</section>
	);
}
