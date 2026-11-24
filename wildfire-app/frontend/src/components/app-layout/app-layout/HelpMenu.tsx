import { useTranslation } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@spatialhub/ui";
import { HelpCircle, type LucideIcon } from "lucide-react";
import { NAV_ROW_CLASS } from "@/components/ui/SidebarButton";

import { Authorized } from "@/middleware/authorized";

interface HelpMenuProps {
  documentationIcon: LucideIcon;
  restartTourIcon: LucideIcon;
  feedbackIcon: LucideIcon;
  onDocumentation: () => void;
  onRestartTour: () => void;
  onFeedback: () => void;
  /** wide nav row */
  expanded?: boolean;
}

// rarely used help
export const HelpMenu: React.FC<HelpMenuProps> = ({
  documentationIcon: DocIcon,
  restartTourIcon: TourIcon,
  feedbackIcon: FeedbackIcon,
  onDocumentation,
  onRestartTour,
  onFeedback,
  expanded = false,
}) => {
  const { t } = useTranslation();
  const helpLabel = t("common.tooltips.help", "Help");

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-tour="help"
              aria-label={helpLabel}
              className={
                expanded
                  ? NAV_ROW_CLASS
                  : "cursor-pointer w-9 h-9 rounded-button flex items-center justify-center transition-all duration-normal hover:bg-muted group"
              }
            >
              <HelpCircle className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
              {expanded && <span className="truncate">{helpLabel}</span>}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-52 z-[60]">
          <DropdownMenuItem className="cursor-pointer" onClick={onDocumentation}>
            <DocIcon className="w-4 h-4" />
            {t("common.tooltips.documentation")}
          </DropdownMenuItem>
          <Authorized>
            <DropdownMenuItem className="cursor-pointer" onClick={onRestartTour}>
              <TourIcon className="w-4 h-4" />
              {t("common.tooltips.restartTour")}
            </DropdownMenuItem>
          </Authorized>
          <DropdownMenuItem className="cursor-pointer" onClick={onFeedback}>
            <FeedbackIcon className="w-4 h-4" />
            {t("common.tooltips.feedback")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent side="right">{helpLabel}</TooltipContent>
    </Tooltip>
  );
};
