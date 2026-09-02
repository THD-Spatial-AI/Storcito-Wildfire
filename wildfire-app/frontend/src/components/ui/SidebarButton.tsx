import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";

interface SidebarButtonProps {
  icon: LucideIcon;
  tooltip: string;
  onClick: () => void;
  isActive?: boolean;
  dataTour?: string;
  className?: string;
  disabled?: boolean;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({
  icon: Icon,
  tooltip,
  onClick,
  isActive = false,
  dataTour,
  className = "",
  disabled = false,
}) => {
  return (
    <div className="relative group">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            data-tour={dataTour}
            disabled={disabled}
            className={cn(
              "cursor-pointer w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 relative",
              "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed",
              isActive && "bg-accent",
              className
            )}
          >
            <Icon
              className={cn(
                "cursor-pointer w-4 h-4 transition-colors duration-150",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/5 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default SidebarButton;
