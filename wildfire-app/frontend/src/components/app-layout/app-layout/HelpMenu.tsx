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

import { Authorized } from "@/middleware/authorized";

interface HelpMenuProps {
  documentationIcon: LucideIcon;
  restartTourIcon: LucideIcon;
  feedbackIcon: LucideIcon;
  onDocumentation: () => void;
  onRestartTour: () => void;
  onFeedback: () => void;
}

// Consolidates the low-frequency help actions (docs, guided tour, feedback) and
// the app version into one "?" popover, keeping the rail uncluttered.
export const HelpMenu: React.FC<HelpMenuProps> = ({
  documentationIcon: DocIcon,
  restartTourIcon: TourIcon,
  feedbackIcon: FeedbackIcon,
  onDocumentation,
  onRestartTour,
  onFeedback,
}) => {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("common.tooltips.help", "Help")}
              className="cursor-pointer w-11 h-11 rounded-button flex items-center justify-center transition-all duration-normal hover:bg-muted group"
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
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
      <TooltipContent side="right">{t("common.tooltips.help", "Help")}</TooltipContent>
    </Tooltip>
  );
};
