import { MessageSquare, RefreshCw } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";
import type { FeedbackStatusCounts } from "./types";

interface FeedbackManagementHeaderProps {
  loading: boolean;
  isRefreshing: boolean;
  statusCounts: FeedbackStatusCounts;
  onRefresh: () => void;
}

export function FeedbackManagementHeader({
  loading,
  isRefreshing,
  statusCounts,
  onRefresh,
}: FeedbackManagementHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("feedbackManagement.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("feedbackManagement.subtitle")}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 transition-transform duration-500 ${loading || isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("feedbackManagement.refresh")}</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-400">
              {statusCounts.pending}
            </span>
            <span className="text-xs text-yellow-600 dark:text-yellow-500">
              {t("feedbackManagement.statuses.pending")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-400">
              {statusCounts.inProgress}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-500">
              {t("feedbackManagement.statuses.inProgress")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-semibold text-green-800 dark:text-green-400">
              {statusCounts.resolved}
            </span>
            <span className="text-xs text-green-600 dark:text-green-500">
              {t("feedbackManagement.statuses.resolved")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
