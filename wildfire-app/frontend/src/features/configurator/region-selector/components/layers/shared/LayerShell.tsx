import type { FC, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

interface LayerShellProps {
    purpose?: string;
    nextStepHint?: string;
    children: ReactNode;
}

/**
 * Minimal wrapper for every layer body. The orchestrator already shows the
 * layer title and subtitle, so we only render a tiny "next step" hint below
 * the content when provided.
 */
export const LayerShell: FC<LayerShellProps> = ({ purpose, nextStepHint, children }) => (
    <div className="space-y-3">
        {purpose && (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {purpose}
            </p>
        )}
        {children}
        {nextStepHint && (
            <div className="flex items-start gap-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{nextStepHint}</span>
            </div>
        )}
    </div>
);
