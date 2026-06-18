import { useMemo, useState } from "react";
import type { FormDataConvertible } from "@/hooks/useForm";
import Notification from "@/components/ui/Notification";
import { useConfirm } from "@/hooks/useConfirmDialog";
import { useNotification } from "@/features/notifications/hooks/useNotification";
import { useTranslation } from "@/i18n";
import {
  useFeedbackList,
  useUpdateFeedback,
  useDeleteFeedback,
} from "@/features/admin-dashboard/hooks/useFeedbackQuery";
import { FeedbackManagementHeader } from "./components/feedback-management/FeedbackManagementHeader";
import { FeedbackManagementFilters } from "./components/feedback-management/FeedbackManagementFilters";
import { FeedbackManagementTable } from "./components/feedback-management/FeedbackManagementTable";
import { FeedbackManagementModals } from "./components/feedback-management/FeedbackManagementModals";
import type { FeedbackEditForm, FeedbackItem } from "./components/feedback-management/types";

const initialEditForm: FeedbackEditForm = {
  status: "pending",
  priority: "medium",
  admin_response: "",
};

export const FeedbackManagement = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [imageLoadFailed, setImageLoadFailed] = useState<Record<number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [editForm, setEditForm] = useState<FeedbackEditForm>(initialEditForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const confirm = useConfirm();
  const { notification, show: showNotification, hide: hideNotification } = useNotification();
  const {
    data: feedbackData,
    isLoading: loading,
    refetch,
  } = useFeedbackList({
    page,
    per_page: rowsPerPage,
    status: statusFilter === "all" ? undefined : statusFilter,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
  });
  const updateFeedbackMutation = useUpdateFeedback();
  const deleteFeedbackMutation = useDeleteFeedback();

  const feedbacks = useMemo(() => feedbackData?.data || [], [feedbackData?.data]);
  const totalCount = feedbackData?.total || 0;
  const statusCounts = useMemo(
    () => ({
      pending: feedbacks.filter((feedback) => feedback.status === "pending").length,
      inProgress: feedbacks.filter((feedback) => feedback.status === "in_progress").length,
      resolved: feedbacks.filter((feedback) => feedback.status === "resolved").length,
    }),
    [feedbacks]
  );

  const resetForm = () => {
    setEditForm(initialEditForm);
    setFormErrors({});
  };

  const closeViewDialog = () => {
    setViewDialogOpen(false);
    setImageLightboxOpen(false);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedFeedback(null);
    resetForm();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    void refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleFormChange = (field: string, value: FormDataConvertible) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleViewFeedback = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
    setImageLoadFailed({});
    setLightboxImageIndex(0);
    setViewDialogOpen(true);
  };

  const handleEditFeedback = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
    setEditForm({
      status: feedback.status,
      priority: feedback.priority,
      admin_response: feedback.admin_response || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedFeedback) return;
    setFormLoading(true);
    setFormErrors({});

    try {
      await updateFeedbackMutation.mutateAsync({ id: selectedFeedback.id, updates: editForm });
      closeEditDialog();
      showNotification(
        t("feedbackManagement.notifications.updateSuccess", { subject: selectedFeedback.subject }),
        "success"
      );
    } catch (error: unknown) {
      const respErrors =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { errors?: Record<string, string> } } }).response?.data
              ?.errors
          : undefined;
      if (respErrors) setFormErrors(respErrors);
      showNotification(t("feedbackManagement.notifications.updateError"), "error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteFeedback = async (feedback: FeedbackItem) => {
    await confirm({
      type: "delete",
      itemType: "feedback",
      itemName: feedback.subject,
      isDangerous: false,
      onConfirm: async () => {
        try {
          await deleteFeedbackMutation.mutateAsync(feedback.id);
          setSelectedFeedback(null);
          showNotification(
            t("feedbackManagement.notifications.deleteSuccess", { subject: feedback.subject }),
            "success"
          );
        } catch (error) {
          if (import.meta.env.DEV) console.error("Delete failed:", error);
          showNotification(t("feedbackManagement.notifications.deleteError"), "error");
        }
      },
      confirmLabel: t("feedbackManagement.actions.delete"),
    });
  };

  if (loading && feedbacks.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FeedbackManagementHeader
        loading={loading}
        isRefreshing={isRefreshing}
        statusCounts={statusCounts}
        onRefresh={handleRefresh}
      />
      <FeedbackManagementFilters
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        priorityFilter={priorityFilter}
        setStatusFilter={setStatusFilter}
        setCategoryFilter={setCategoryFilter}
        setPriorityFilter={setPriorityFilter}
      />
      <FeedbackManagementTable
        feedbacks={feedbacks}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        loading={loading}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onView={handleViewFeedback}
        onEdit={handleEditFeedback}
        onDelete={handleDeleteFeedback}
      />
      <FeedbackManagementModals
        viewDialogOpen={viewDialogOpen}
        editDialogOpen={editDialogOpen}
        selectedFeedback={selectedFeedback}
        imageLightboxOpen={imageLightboxOpen}
        lightboxImageIndex={lightboxImageIndex}
        imageLoadFailed={imageLoadFailed}
        editForm={editForm}
        formLoading={formLoading}
        formErrors={formErrors}
        onCloseView={closeViewDialog}
        onCloseEdit={closeEditDialog}
        onCloseLightbox={() => setImageLightboxOpen(false)}
        onOpenLightbox={(index) => {
          setLightboxImageIndex(index);
          setImageLightboxOpen(true);
        }}
        onLightboxIndexChange={setLightboxImageIndex}
        onImageLoadFailed={(index) => setImageLoadFailed((prev) => ({ ...prev, [index]: true }))}
        onFormChange={handleFormChange}
        onSaveEdit={handleSaveEdit}
      />
      <Notification
        isOpen={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />
    </div>
  );
};
