import { CheckCircle, ChevronDown, ChevronUp, Clock, Loader2, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n";
import { userFeedbackService } from "./feedbackService";
import type { MyFeedbackItem, StatusConfig } from "./types";

const STATUS_CONFIG: StatusConfig = {
  pending: { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  resolved: { color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  closed: { color: "text-gray-500 dark:text-gray-400", bgColor: "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-700", icon: <X className="w-3.5 h-3.5" /> },
};

const getDaysUntilDeletion = (updatedAt: string, status: string): number | null => {
  if (status !== "closed" && status !== "resolved") return null;
  const updated = new Date(updatedAt);
  const deleteAt = new Date(updated.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((deleteAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
};

const FeedbackHistoryItem: React.FC<{ item: MyFeedbackItem }> = ({ item }) => {
  const { t } = useTranslation();
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const statusKey = item.status === "in_progress" ? "in_progress" : item.status;
  const daysLeft = getDaysUntilDeletion(item.updated_at, item.status);

  return (
    <div className={`rounded-lg border p-3 ${statusCfg.bgColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.color} ${statusCfg.bgColor}`}>
              {statusCfg.icon}
              {t(`feedback.myFeedback.status.${statusKey}`)}
            </span>
            <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
          </div>
          <p className="text-sm font-medium text-foreground truncate">{item.subject}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("feedback.myFeedback.submittedOn")} {new Date(item.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      {item.admin_response && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">{t("feedback.myFeedback.adminResponse")}</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{item.admin_response}</p>
        </div>
      )}

      {daysLeft !== null && (
        <p className="text-[10px] text-muted-foreground mt-1.5 italic">
          {daysLeft > 0
            ? t("feedback.myFeedback.autoDeleteNotice").replace("{days}", String(daysLeft))
            : t("feedback.myFeedback.autoDeleteSoon")}
        </p>
      )}
    </div>
  );
};

export const MyFeedbackHistory: React.FC<{ userId: string; refreshTrigger: number }> = ({ userId, refreshTrigger }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<MyFeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    userFeedbackService.listMine()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, refreshTrigger]);

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? t("feedback.myFeedback.hideHistory") : t("feedback.myFeedback.showHistory")} ({items.length})
      </button>

      {expanded && (
        <div className="space-y-2">
          {items.map((item) => <FeedbackHistoryItem key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
};
