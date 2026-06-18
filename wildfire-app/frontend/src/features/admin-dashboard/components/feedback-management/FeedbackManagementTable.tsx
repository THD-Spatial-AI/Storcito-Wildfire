import {
  AlertCircle,
  Bug,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Image,
  Lightbulb,
  MessageCircle,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ModelActionGroup from "@/components/shared/ModelActionGroup";
import { Tooltip, TooltipTrigger, TooltipContent } from "@spatialhub/ui";
import { formatDate } from "@/utils/dateHelpers";
import { useTranslation } from "@/i18n";
import type { FeedbackItem } from "./types";

const COLOR_GRAY_NEUTRAL = "text-gray-500 dark:text-gray-400";
const COLOR_GRAY_DEFAULT = "text-gray-700";

interface FeedbackManagementTableProps {
  feedbacks: FeedbackItem[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onView: (feedback: FeedbackItem) => void;
  onEdit: (feedback: FeedbackItem) => void;
  onDelete: (feedback: FeedbackItem) => void;
}

const truncateWords = (text: string, maxWords: number) => {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}…`;
};

const getAttachmentCount = (feedback: FeedbackItem) => {
  if (feedback.images) {
    try {
      return JSON.parse(feedback.images).length;
    } catch {
      return 1;
    }
  }
  return feedback.image_path ? 1 : 0;
};

export function getCategoryIcon(category: string) {
  switch (category) {
    case "bug":
      return <Bug className="w-4 h-4" />;
    case "feature":
      return <Lightbulb className="w-4 h-4" />;
    case "improvement":
      return <Star className="w-4 h-4" />;
    default:
      return <MessageCircle className="w-4 h-4" />;
  }
}

export function getCategoryColor(category: string) {
  switch (category) {
    case "bug":
      return "bg-gray-200 text-gray-800 border-gray-300";
    case "feature":
      return COLOR_GRAY_NEUTRAL;
    case "improvement":
      return "bg-gray-400 text-gray-900 border-gray-500";
    case "general":
      return "bg-gray-500 text-white border-gray-600";
    default:
      return COLOR_GRAY_DEFAULT;
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
    case "in_progress":
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
    case "resolved":
      return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
    case "closed":
      return "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600";
    default:
      return COLOR_GRAY_DEFAULT;
  }
}

export function getStatusIcon(status: string) {
  switch (status) {
    case "resolved":
      return <CheckCircle className="w-3 h-3" />;
    case "in_progress":
      return <Clock className="w-3 h-3" />;
    case "pending":
      return <AlertCircle className="w-3 h-3" />;
    case "closed":
      return <XCircle className="w-3 h-3" />;
    default:
      return <AlertCircle className="w-3 h-3" />;
  }
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case "critical":
      return "bg-black text-white border-gray-800";
    case "high":
      return "bg-gray-700 text-white border-gray-800";
    case "medium":
      return "bg-gray-500 text-white border-gray-600";
    case "low":
      return COLOR_GRAY_NEUTRAL;
    default:
      return COLOR_GRAY_DEFAULT;
  }
}

export function FeedbackStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? "text-gray-700 fill-gray-700" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

export function FeedbackManagementTable({
  feedbacks,
  totalCount,
  page,
  rowsPerPage,
  loading,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onEdit,
  onDelete,
}: FeedbackManagementTableProps) {
  const { t } = useTranslation();
  const getCategoryLabel = (category: string) => t(`feedbackManagement.categories.${category}`);
  const getPriorityLabel = (priority: string) => t(`feedbackManagement.priorities.${priority}`);
  const getStatusLabel = (status: string) =>
    t(`feedbackManagement.statuses.${status === "in_progress" ? "inProgress" : status}`);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("feedbackManagement.table.subject")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("feedbackManagement.table.category")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("feedbackManagement.table.priority")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("feedbackManagement.table.status")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("feedbackManagement.table.rating")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("feedbackManagement.table.user")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("feedbackManagement.table.created")}
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("feedbackManagement.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {feedbacks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        {t("feedbackManagement.noFeedbackFound")}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("feedbackManagement.noFeedbackDescription")}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              feedbacks.map((feedback) => {
                const displayUserName =
                  feedback.user?.name || feedback.user_name || t("common.unknown");
                const displayUserEmail = feedback.user?.email || feedback.user_email || "";
                const attachmentCount = getAttachmentCount(feedback);

                return (
                  <tr
                    key={feedback.id}
                    className="hover:bg-muted/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="text-sm font-medium text-foreground truncate"
                            title={feedback.subject}
                          >
                            {truncateWords(feedback.subject, 4)}
                          </div>
                          {attachmentCount > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex-shrink-0 inline-flex items-center gap-0.5">
                                  <Image className="w-3.5 h-3.5 text-blue-500" />
                                  {attachmentCount > 1 && (
                                    <span className="text-[10px] font-medium text-blue-500">
                                      {attachmentCount}
                                    </span>
                                  )}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {attachmentCount === 1
                                  ? t("feedbackManagement.hasAttachment")
                                  : `${attachmentCount} attachments`}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div
                          className="text-xs text-muted-foreground truncate"
                          title={feedback.message}
                        >
                          {truncateWords(feedback.message, 6)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getCategoryColor(feedback.category)}`}
                      >
                        {getCategoryIcon(feedback.category)}
                        {getCategoryLabel(feedback.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getPriorityColor(feedback.priority)}`}
                      >
                        {getPriorityLabel(feedback.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(feedback.status)}`}
                      >
                        {getStatusIcon(feedback.status)}
                        {getStatusLabel(feedback.status)}
                      </span>
                      {(feedback.status === "closed" || feedback.status === "resolved") &&
                        (() => {
                          const deleteAt = new Date(
                            new Date(feedback.updated_at).getTime() + 7 * 24 * 60 * 60 * 1000
                          );
                          const daysLeft = Math.max(
                            0,
                            Math.ceil((deleteAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                          );
                          return (
                            <div className="text-[10px] text-muted-foreground mt-0.5 italic">
                              {daysLeft > 0 ? `Auto-deletes in ${daysLeft}d` : "Auto-deletes soon"}
                            </div>
                          );
                        })()}
                    </td>
                    <td className="px-6 py-4">
                      <FeedbackStars rating={feedback.rating} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-white text-xs font-medium">
                          {displayUserName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {displayUserName}
                          </div>
                          {displayUserEmail && (
                            <div className="text-xs text-muted-foreground truncate">
                              {displayUserEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">
                        {formatDate(feedback.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ModelActionGroup
                        actions={[
                          {
                            key: "view",
                            icon: Eye,
                            tooltip: t("feedbackManagement.actions.viewDetails"),
                            variant: "info",
                            onClick: () => onView(feedback),
                          },
                          {
                            key: "edit",
                            icon: Edit,
                            tooltip: t("feedbackManagement.actions.editStatus"),
                            variant: "default",
                            onClick: () => onEdit(feedback),
                          },
                          {
                            key: "delete",
                            icon: Trash2,
                            tooltip: t("feedbackManagement.actions.deleteFeedback"),
                            variant: "danger",
                            onClick: () => onDelete(feedback),
                          },
                        ]}
                        layout="horizontal"
                        size="small"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={page}
        totalItems={totalCount}
        itemsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onItemsPerPageChange={(newSize) => {
          onRowsPerPageChange(newSize);
          onPageChange(0);
        }}
        isLoading={loading}
      />
    </div>
  );
}
