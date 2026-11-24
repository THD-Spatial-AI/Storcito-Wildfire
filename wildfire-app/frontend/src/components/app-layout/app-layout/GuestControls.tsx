import { LogIn } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

interface GuestControlsProps {
  expanded: boolean;
  onSignIn: () => void;
}

/** signed-out sidebar footer */
export function GuestControls({ expanded, onSignIn }: GuestControlsProps) {
  const { t } = useTranslation();
  const label = t("auth.signIn", "Sign in");

  return (
    <div className={cn("flex flex-col gap-2", expanded ? "w-full" : "items-center gap-3")}>
      {/* language and theme */}
      <div className={cn("flex items-center", expanded ? "justify-between px-1" : "flex-col gap-3")}>
        <div data-tour="language">
          <LanguageSwitcher />
        </div>
        <ThemeToggle />
      </div>

      {expanded ? (
        <button
          type="button"
          onClick={onSignIn}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90"
        >
          <LogIn className="h-4 w-4" />
          {label}
        </button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSignIn}
              aria-label={label}
              className="relative flex size-9 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-colors hover:bg-foreground/90"
            >
              {/* gentle attention ring */}
              <span aria-hidden className="pointer-events-none absolute -inset-0.5 rounded-full bg-foreground/25 animate-ping motion-reduce:hidden" />
              <LogIn className="relative h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
