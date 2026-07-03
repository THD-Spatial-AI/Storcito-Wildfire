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
              "cursor-pointer w-9 h-9 rounded-button flex items-center justify-center transition-all duration-normal relative",
              "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
              className
            )}
          >
            <Icon
              className={cn(
                "cursor-pointer w-5 h-5",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/5 h-0.5 rounded-full bg-foreground" />
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
