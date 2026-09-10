import type { FC, ReactNode } from "react";
import { useTranslation } from "@/i18n";

interface QuestionSectionProps {
    /** 1-based index. */
    index: number;
    title: string;
    description?: string;
    children: ReactNode;
}

/** Numbered question block. */
export const QuestionSection: FC<QuestionSectionProps> = ({ index, title, description, children }) => {
    const { t } = useTranslation();

    return (
        // Own stacking context.
        <section className="md-rise relative z-10 focus-within:z-20">
            <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                    {t("configurator.wizard.question", { index, defaultValue: "Question {{index}}" })}
                </span>
                <span className="h-px flex-1 bg-border" />
            </div>

            <div className="mt-5">
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                <div className="mt-4">{children}</div>
            </div>
        </section>
    );
};
