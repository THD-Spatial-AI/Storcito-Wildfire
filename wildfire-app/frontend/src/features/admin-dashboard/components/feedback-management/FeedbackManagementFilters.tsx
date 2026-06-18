import {
  AlertCircle,
  Bug,
  CheckCircle,
  Clock,
  Filter,
  Flag,
  Lightbulb,
  MessageCircle,
  RefreshCw,
  Star,
  Tag,
  XCircle,
} from "lucide-react";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { useTranslation } from "@/i18n";

interface FeedbackManagementFiltersProps {
  statusFilter: string;
  categoryFilter: string;
  priorityFilter: string;
  setStatusFilter: (value: string) => void;
  setCategoryFilter: (value: string) => void;
  setPriorityFilter: (value: string) => void;
}

export function FeedbackManagementFilters({
  statusFilter,
  categoryFilter,
  priorityFilter,
  setStatusFilter,
  setCategoryFilter,
  setPriorityFilter,
}: FeedbackManagementFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {t("feedbackManagement.filters.label")}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterDropdown
            options={[
              { value: "all", label: t("feedbackManagement.filters.allStatus") },
              {
                value: "pending",
                label: t("feedbackManagement.statuses.pending"),
                icon: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
              },
              {
                value: "in_progress",
                label: t("feedbackManagement.statuses.inProgress"),
                icon: <RefreshCw className="w-3.5 h-3.5 text-blue-500" />,
              },
              {
                value: "resolved",
                label: t("feedbackManagement.statuses.resolved"),
                icon: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
              },
              {
                value: "closed",
                label: t("feedbackManagement.statuses.closed"),
                icon: <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-300" />,
              },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder={t("feedbackManagement.filters.allStatus")}
            icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />}
          />
          <FilterDropdown
            options={[
              { value: "all", label: t("feedbackManagement.filters.allCategories") },
              {
                value: "bug",
                label: t("feedbackManagement.categories.bug"),
                icon: <Bug className="w-3.5 h-3.5 text-red-500" />,
              },
              {
                value: "feature",
                label: t("feedbackManagement.categories.feature"),
                icon: <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />,
              },
              {
                value: "improvement",
                label: t("feedbackManagement.categories.improvement"),
                icon: <Star className="w-3.5 h-3.5 text-blue-500" />,
              },
              {
                value: "general",
                label: t("feedbackManagement.categories.general"),
                icon: <MessageCircle className="w-3.5 h-3.5 text-gray-500" />,
              },
            ]}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder={t("feedbackManagement.filters.allCategories")}
            icon={<Tag className="w-3.5 h-3.5 text-muted-foreground" />}
          />
          <FilterDropdown
            options={[
              { value: "all", label: t("feedbackManagement.filters.allPriorities") },
              {
                value: "critical",
                label: t("feedbackManagement.priorities.critical"),
                icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />,
              },
              {
                value: "high",
                label: t("feedbackManagement.priorities.high"),
                icon: <Flag className="w-3.5 h-3.5 text-orange-500" />,
              },
              {
                value: "medium",
                label: t("feedbackManagement.priorities.medium"),
                icon: <Flag className="w-3.5 h-3.5 text-yellow-500" />,
              },
              {
                value: "low",
                label: t("feedbackManagement.priorities.low"),
                icon: <Flag className="w-3.5 h-3.5 text-green-500" />,
              },
            ]}
            value={priorityFilter}
            onChange={setPriorityFilter}
            placeholder={t("feedbackManagement.filters.allPriorities")}
            icon={<Flag className="w-3.5 h-3.5 text-muted-foreground" />}
          />
        </div>
      </div>
    </div>
  );
}
