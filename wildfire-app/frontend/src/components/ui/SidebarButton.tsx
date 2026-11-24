import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";

interface SidebarButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  onClick: () => void;
  isActive?: boolean;
  dataTour?: string;
  className?: string;
  disabled?: boolean;
  /** wide nav icon */
  expanded?: boolean;
  tooltipSide?: "left" | "right";
}

/** row style expanded */
export const NAV_ROW_CLASS =
  "group flex h-9 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 text-left text-sm text-foreground/80 transition-colors duration-150 hover:bg-accent";

const SidebarButton: React.FC<SidebarButtonProps> = ({
  icon: Icon,
  tooltip,
  onClick,
  isActive = false,
  dataTour,
  className = "",
  disabled = false,
  expanded = false,
  tooltipSide = "right",
}) => {
  const icon = (
    <Icon
      className={cn(
        "w-5 h-5 shrink-0 transition-colors duration-150",
        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
      )}
    />
  );

  if (expanded) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-tour={dataTour}
        disabled={disabled}
        className={cn(
          NAV_ROW_CLASS,
          "disabled:cursor-not-allowed disabled:opacity-50",
          isActive && "bg-accent font-medium text-foreground",
          className
        )}
      >
        {icon}
        <span className="truncate">{tooltip}</span>
      </button>
    );
  }

  return (
    <div className="relative group">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            data-tour={dataTour}
            disabled={disabled}
            aria-label={tooltip}
            className={cn(
              "cursor-pointer w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150 relative",
              "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed",
              isActive && "bg-accent",
              className
            )}
          >
            {icon}
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/5 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default SidebarButton;
