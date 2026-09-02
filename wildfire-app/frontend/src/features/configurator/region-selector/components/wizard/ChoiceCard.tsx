import type { FC, ReactNode } from "react";
import { Check, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

interface ChoiceCardProps {
  icon: ReactNode;
  label: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  /** Multi-select badge. */
  multiple?: boolean;
  dataTour?: string;
  info?: string;
}

/** Option card. */
export const ChoiceCard: FC<ChoiceCardProps> = ({
  icon,
  label,
  description,
  selected,
  disabled = false,
  onSelect,
  multiple = false,
  dataTour,
  info,
}) => {
  const { t } = useTranslation();

  const card = (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      data-tour={dataTour}
      className={cn(
        "group relative flex h-full min-h-[104px] w-full flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "cursor-not-allowed opacity-50",
        !disabled &&
          !selected &&
          "border-border bg-card hover:border-foreground/30 hover:bg-muted/50",
        selected && "border-primary bg-primary/5 ring-1 ring-primary/30"
      )}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      )}
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150",
          selected
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground group-hover:text-foreground"
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium leading-tight text-foreground">{label}</span>
      {description && (
        <span className="text-[11px] leading-snug text-muted-foreground">{description}</span>
      )}
      <span className="sr-only">{multiple ? "toggle" : "select"}</span>
    </button>
  );

  if (!info) return card;

  return (
    <div className="relative h-full">
      {card}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={t("common.aboutItem", { label, defaultValue: `About ${label}` })}
            className="absolute left-2 top-2 z-10 cursor-pointer rounded-full p-0.5 text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] text-xs">{info}</TooltipContent>
      </Tooltip>
    </div>
  );
};

/** Card grid. */
export const ChoiceCardGroup: FC<{ children: ReactNode; columns?: 2 | 3 | 4 }> = ({
  children,
  columns = 3,
}) => (
  <div
    role="group"
    className={cn(
      "grid gap-3",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 3 && "grid-cols-2 sm:grid-cols-3",
      columns === 4 && "grid-cols-2 sm:grid-cols-4"
    )}
  >
    {children}
  </div>
);
