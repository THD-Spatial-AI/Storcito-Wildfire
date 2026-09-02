import type { FC } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

import { LAYERS } from "../layers";

interface WizardStepBarProps {
    step: number;
    completed: Set<number>;
    editMode: boolean;
    onJump: (id: number) => void;
}

/** Step breadcrumb. */
export const WizardStepBar: FC<WizardStepBarProps> = ({ step, completed, editMode, onJump }) => {
    const { t } = useTranslation();

    return (
        <nav aria-label={t("configurator.wizard.steps", "Model steps")} data-tour="configurator-steps">
            <ol className="flex items-center gap-0.5">
                {LAYERS.map((layer, index) => {
                    const isCurrent = layer.id === step;
                    const isDone = completed.has(layer.id) && !isCurrent;
                    const reachable = editMode || layer.id <= step || completed.has(layer.id);
                    const title = t(layer.titleKey, layer.title);

                    return (
                        <li key={layer.id} className="flex items-center">
                            <button
                                type="button"
                                onClick={() => reachable && onJump(layer.id)}
                                disabled={!reachable}
                                aria-current={isCurrent ? "step" : undefined}
                                title={title}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors duration-150",
                                    isCurrent && "bg-primary/10 font-semibold text-primary",
                                    !isCurrent && reachable && "text-muted-foreground hover:bg-muted hover:text-foreground",
                                    !reachable && "cursor-not-allowed text-muted-foreground/40",
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                                        isCurrent && "bg-primary text-primary-foreground",
                                        isDone && "bg-primary/20 text-primary",
                                        !isCurrent && !isDone && "border border-border text-muted-foreground",
                                    )}
                                >
                                    {isDone ? <Check className="h-2.5 w-2.5" /> : layer.id}
                                </span>
                                <span className="hidden whitespace-nowrap md:inline">{title}</span>
                            </button>
                            {index < LAYERS.length - 1 && (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" aria-hidden="true" />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};
