import { useCallback, useState, type FC, type ReactNode } from "react";
import { ArrowRight, Info } from "lucide-react";
import { useTranslation } from "@/i18n";

interface LayerShellProps {
  purpose?: string;
  nextStepHint?: string;
  children: ReactNode;
}

const PURPOSE_STORAGE_KEY = "wildfire-app_step-purpose-open";

const readStoredPreference = () => {
  try {
    const stored = localStorage.getItem(PURPOSE_STORAGE_KEY);
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
};

/** Layer body wrapper. */
export const LayerShell: FC<LayerShellProps> = ({ purpose, nextStepHint, children }) => {
  const { t } = useTranslation();
  // Collapsed by default.
  const [showPurpose, setShowPurpose] = useState(readStoredPreference);

  const togglePurpose = useCallback(() => {
    setShowPurpose((current) => {
      const next = !current;
      try {
        localStorage.setItem(PURPOSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-3">
      {purpose && (
        <div className="md-row-in">
          <button
            type="button"
            onClick={togglePurpose}
            aria-expanded={showPurpose}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus:outline-none"
          >
            <Info className="h-3 w-3 shrink-0" />
            {showPurpose
              ? t("configurator.stepPurposeHide", "Hide step info")
              : t("configurator.stepPurposeShow", "What is this step?")}
          </button>
          {showPurpose && (
            <p className="md-fade-in mt-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {purpose}
            </p>
          )}
        </div>
      )}
      {children}
      {nextStepHint && (
        <div
          className="md-fade-in relative z-0 flex items-start gap-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground"
          style={{ animationDelay: "120ms" }}
        >
          <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{nextStepHint}</span>
        </div>
      )}
    </div>
  );
};
