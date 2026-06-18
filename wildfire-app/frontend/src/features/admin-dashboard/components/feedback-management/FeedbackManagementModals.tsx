import { createPortal } from "react-dom";
import { AlertCircle, Calendar, CheckCircle, Clock, Eye, Image, MessageCircle, User, X, ZoomIn } from "lucide-react";
import { IconX } from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "@/i18n";
import { UniversalForm, type FormSection } from "@spatialhub/forms";
import type { FormDataConvertible } from "@/hooks/useForm";
import { formatDateTime24h } from "@/utils/dateHelpers";
import type { FeedbackEditForm, FeedbackImage, FeedbackItem } from "./types";
import {
  FeedbackStars,
  getCategoryColor,
  getCategoryIcon,
  getPriorityColor,
  getStatusColor,
  getStatusIcon,
} from "./FeedbackManagementTable";

// ---------- Shared helpers ----------

type FormIcon = NonNullable<FormSection["fields"][number]["icon"]>;
const formIcon = (icon: unknown): FormIcon => icon as FormIcon;

const OVERLAY_BUTTON_CLASS = "absolute inset-0 cursor-default bg-transparent border-0 p-0";

const getFeedbackFormSections = (t: (key: string) => string): FormSection[] => [
  {
    title: t("feedbackManagement.editDialog.statusAndPriority"),
    description: t("feedbackManagement.editDialog.statusAndPriorityDescription"),
    columns: 2,
    fields: [
      {
        key: "status",
        label: t("feedbackManagement.editDialog.status"),
        type: "select",
        value: "",
        required: true,
        icon: formIcon(CheckCircle),
        options: [
          { value: "pending", label: t("feedbackManagement.statuses.pending") },
          { value: "in_progress", label: t("feedbackManagement.statuses.inProgress") },
          { value: "resolved", label: t("feedbackManagement.statuses.resolved") },
          { value: "closed", label: t("feedbackManagement.statuses.closed") },
        ],
      },
      {
        key: "priority",
        label: t("feedbackManagement.editDialog.priority"),
        type: "select",
        value: "",
        required: true,
        icon: formIcon(AlertCircle),
        options: [
          { value: "low", label: t("feedbackManagement.priorities.low") },
          { value: "medium", label: t("feedbackManagement.priorities.medium") },
          { value: "high", label: t("feedbackManagement.priorities.high") },
          { value: "critical", label: t("feedbackManagement.priorities.critical") },
        ],
      },
    ],
  },
  {
    title: t("feedbackManagement.editDialog.adminResponse"),
    description: t("feedbackManagement.editDialog.adminResponseDescription"),
    columns: 1,
    fields: [
      {
        key: "admin_response",
        label: t("feedbackManagement.editDialog.response"),
        type: "textarea",
        value: "",
        placeholder: t("feedbackManagement.editDialog.responsePlaceholder"),
        rows: 4,
        icon: formIcon(MessageCircle),
      },
    ],
  },
];

const formatFileSize = (bytes: number | null | undefined) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getImageUrl = (feedbackId: number, index?: number) => {
  if (index !== undefined) return `/api/feedback/${feedbackId}/images/${index}`;
  return `/api/feedback/${feedbackId}/image`;
};

const parseFeedbackImages = (
  feedback: FeedbackItem
): { items: FeedbackImage[]; fromJson: boolean } => {
  if (feedback.images) {
    try {
      return { items: JSON.parse(feedback.images), fromJson: true };
    } catch {
      // Fall back to legacy single image fields.
    }
  }
  if (feedback.image_path) {
    return {
      items: [
        {
          path: feedback.image_path,
          mime_type: feedback.image_mime_type || "",
          size: feedback.image_size || 0,
        },
      ],
      fromJson: false,
    };
  }
  return { items: [], fromJson: false };
};

// ---------- Edit modal ----------

interface EditFeedbackModalProps {
  open: boolean;
  editForm: FeedbackEditForm;
  formLoading: boolean;
  formErrors: Record<string, string>;
  onClose: () => void;
  onFormChange: (field: string, value: FormDataConvertible) => void;
  onSaveEdit: () => void;
}

function EditFeedbackModal({
  open,
  editForm,
  formLoading,
  formErrors,
  onClose,
  onFormChange,
  onSaveEdit,
}: EditFeedbackModalProps) {
  const { t } = useTranslation();

  return (
    <UniversalForm
      isOpen={open}
      onClose={onClose}
      title={t("feedbackManagement.editDialog.title")}
      description={t("feedbackManagement.editDialog.description")}
      variant="default"
      sections={getFeedbackFormSections(t)}
      values={editForm}
      onChange={onFormChange}
      onSubmit={onSaveEdit}
      submitText={t("feedbackManagement.editDialog.saveChanges")}
      loading={formLoading}
      errors={formErrors}
      maxWidth="lg"
    />
  );
}

// ---------- Lightbox modal ----------

interface ImageLightboxModalProps {
  open: boolean;
  feedback: FeedbackItem | null;
  lightboxImageIndex: number;
  onClose: () => void;
  onLightboxIndexChange: (updater: (previous: number) => number) => void;
}

function ImageLightboxModal({
  open,
  feedback,
  lightboxImageIndex,
  onClose,
  onLightboxIndexChange,
}: ImageLightboxModalProps) {
  const { t } = useTranslation();
  const closeLabel = t("common.close");

  if (!open || !feedback) return null;

  const { items: images, fromJson } = parseFeedbackImages(feedback);
  const hasMultiple = images.length > 1;
  const currentImage = images[lightboxImageIndex];

  return createPortal(
    <div className="fixed inset-0 bg-black/90 z-[60] animate-in fade-in-0 duration-200">
      <button type="button" className={OVERLAY_BUTTON_CLASS} onClick={onClose} aria-label={closeLabel} />
      <div className="flex items-center justify-center h-full p-4">
        <div className="relative max-w-[90vw] max-h-[90vh]">
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors z-10"
            aria-label={closeLabel}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={fromJson ? getImageUrl(feedback.id, lightboxImageIndex) : getImageUrl(feedback.id)}
            alt={`${t("feedbackManagement.viewDialog.feedbackScreenshot")} ${lightboxImageIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 rounded-full px-3 py-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLightboxIndexChange((prev) => Math.max(0, prev - 1));
                }}
                disabled={lightboxImageIndex === 0}
                className="text-white/80 hover:text-white disabled:text-white/30 transition-colors text-sm px-1"
              >
                ‹
              </button>
              <span className="text-white/80 text-xs">
                {lightboxImageIndex + 1} / {images.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLightboxIndexChange((prev) => Math.min(images.length - 1, prev + 1));
                }}
                disabled={lightboxImageIndex >= images.length - 1}
                className="text-white/80 hover:text-white disabled:text-white/30 transition-colors text-sm px-1"
              >
                ›
              </button>
            </div>
          )}
          {currentImage && (
            <p className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-white/70">
              {formatFileSize(currentImage.size)}
              {currentImage.mime_type && ` • ${currentImage.mime_type.split("/")[1]?.toUpperCase()}`}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------- View modal ----------

interface ViewFeedbackModalProps {
  open: boolean;
  feedback: FeedbackItem | null;
  imageLoadFailed: Record<number, boolean>;
  onClose: () => void;
  onOpenLightbox: (index: number) => void;
  onImageLoadFailed: (index: number) => void;
}

function ViewFeedbackModal({
  open,
  feedback,
  imageLoadFailed,
  onClose,
  onOpenLightbox,
  onImageLoadFailed,
}: ViewFeedbackModalProps) {
  const { t } = useTranslation();
  const closeLabel = t("common.close");
  const getCategoryLabel = (category: string) => t(`feedbackManagement.categories.${category}`);
  const getPriorityLabel = (priority: string) => t(`feedbackManagement.priorities.${priority}`);
  const getStatusLabel = (status: string) =>
    t(`feedbackManagement.statuses.${status === "in_progress" ? "inProgress" : status}`);

  if (!open || !feedback) return null;

  const { items: images, fromJson } = parseFeedbackImages(feedback);
  const isClosedOrResolved = feedback.status === "closed" || feedback.status === "resolved";
  const deleteAt = new Date(new Date(feedback.updated_at).getTime() + 7 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((deleteAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in-0 duration-300">
      <button type="button" className={OVERLAY_BUTTON_CLASS} onClick={onClose} aria-label={closeLabel} />
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="relative w-full max-w-2xl h-[85vh] animate-in zoom-in-95 duration-300">
          <div className="bg-card dark:bg-card rounded-2xl shadow-2xl border border-border flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 p-4 pb-3 border-b border-border">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">
                      {t("feedbackManagement.viewDialog.title")}
                    </h1>
                    <p className="text-muted-foreground text-xs">
                      #{feedback.id} • {formatDateTime24h(feedback.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <div className="p-5 space-y-5">
                <div>
                  <h4 className="text-base font-semibold text-foreground mb-2">{feedback.subject}</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(feedback.status)}`}
                    >
                      {getStatusIcon(feedback.status)}
                      {getStatusLabel(feedback.status)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(feedback.category)}`}
                    >
                      {getCategoryIcon(feedback.category)}
                      {getCategoryLabel(feedback.category)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getPriorityColor(feedback.priority)}`}
                    >
                      {getPriorityLabel(feedback.priority)}
                    </span>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-foreground mb-2">
                    {t("feedbackManagement.viewDialog.message")}
                  </h5>
                  <div className="text-sm p-4 bg-muted/20 rounded-lg border border-border prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5 prose-p:text-foreground prose-p:leading-relaxed prose-p:my-1.5 prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-hr:border-border prose-table:border-collapse prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-1.5 prose-th:bg-muted/50 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5 prose-td:text-xs">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        input: ({ type, checked, ...props }) =>
                          type === "checkbox" ? (
                            <input type="checkbox" checked={checked} readOnly className="mr-1.5 rounded" {...props} />
                          ) : (
                            <input type={type} {...props} />
                          ),
                        a: ({ children, ...props }) => (
                          <a target="_blank" rel="noopener noreferrer" {...props}>
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {feedback.message}
                    </ReactMarkdown>
                  </div>
                </div>

                {images.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                      <Image className="w-4 h-4" />
                      {t("feedbackManagement.viewDialog.attachedImage")}
                      {images.length > 1 && (
                        <span className="text-xs text-muted-foreground">({images.length})</span>
                      )}
                    </h5>
                    <div className={`grid gap-3 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {images.map((img, idx) => (
                        <div key={`${img.path}-${idx}`} className="relative group">
                          <div
                            className="relative rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer aspect-video flex items-center justify-center"
                            onClick={() => onOpenLightbox(idx)}
                          >
                            {imageLoadFailed[idx] ? (
                              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <span className="text-xs">
                                  {t("feedbackManagement.viewDialog.imageLoadError")}
                                </span>
                              </div>
                            ) : (
                              <img
                                src={fromJson ? getImageUrl(feedback.id, idx) : getImageUrl(feedback.id)}
                                alt={`${t("feedbackManagement.viewDialog.feedbackScreenshot")} ${idx + 1}`}
                                className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                                onError={() => onImageLoadFailed(idx)}
                              />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="bg-black/60 text-white px-2 py-1 rounded-lg flex items-center gap-1 text-xs">
                                <ZoomIn className="w-3 h-3" />
                                {t("feedbackManagement.viewDialog.clickToEnlarge")}
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatFileSize(img.size)}
                            {img.mime_type && ` • ${img.mime_type.split("/")[1]?.toUpperCase()}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h5 className="text-sm font-medium text-foreground mb-2">
                    {t("feedbackManagement.viewDialog.rating")}
                  </h5>
                  <FeedbackStars rating={feedback.rating} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {t("feedbackManagement.viewDialog.submittedBy") || "Submitted by"}
                    </h5>
                    <p className="text-sm font-medium text-foreground">
                      {feedback.user?.name || feedback.user_name || t("common.unknown")}
                    </p>
                    {(feedback.user?.email || feedback.user_email) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {feedback.user?.email || feedback.user_email}
                      </p>
                    )}
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {t("feedbackManagement.viewDialog.submitted")}
                    </h5>
                    <p className="text-sm font-medium text-foreground">
                      {formatDateTime24h(feedback.created_at)}
                    </p>
                    {feedback.updated_at !== feedback.created_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Updated: {formatDateTime24h(feedback.updated_at)}
                      </p>
                    )}
                  </div>
                </div>

                {feedback.admin_response && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" />
                      {t("feedbackManagement.viewDialog.adminResponse")}
                    </h5>
                    <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap">
                      {feedback.admin_response}
                    </p>
                    {feedback.responded_at && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        {t("feedbackManagement.viewDialog.respondedOn")} {formatDateTime24h(feedback.responded_at)}
                        {feedback.responded_by_user?.name && ` • ${feedback.responded_by_user.name}`}
                      </p>
                    )}
                  </div>
                )}

                {isClosedOrResolved && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {daysLeft > 0
                        ? `This feedback will be automatically removed in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                        : "This feedback will be automatically removed soon"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------- Composer ----------

interface FeedbackManagementModalsProps {
  viewDialogOpen: boolean;
  editDialogOpen: boolean;
  selectedFeedback: FeedbackItem | null;
  imageLightboxOpen: boolean;
  lightboxImageIndex: number;
  imageLoadFailed: Record<number, boolean>;
  editForm: FeedbackEditForm;
  formLoading: boolean;
  formErrors: Record<string, string>;
  onCloseView: () => void;
  onCloseEdit: () => void;
  onCloseLightbox: () => void;
  onOpenLightbox: (index: number) => void;
  onLightboxIndexChange: (updater: (previous: number) => number) => void;
  onImageLoadFailed: (index: number) => void;
  onFormChange: (field: string, value: FormDataConvertible) => void;
  onSaveEdit: () => void;
}

export function FeedbackManagementModals(props: FeedbackManagementModalsProps) {
  return (
    <>
      <ViewFeedbackModal
        open={props.viewDialogOpen}
        feedback={props.selectedFeedback}
        imageLoadFailed={props.imageLoadFailed}
        onClose={props.onCloseView}
        onOpenLightbox={props.onOpenLightbox}
        onImageLoadFailed={props.onImageLoadFailed}
      />
      <ImageLightboxModal
        open={props.imageLightboxOpen}
        feedback={props.selectedFeedback}
        lightboxImageIndex={props.lightboxImageIndex}
        onClose={props.onCloseLightbox}
        onLightboxIndexChange={props.onLightboxIndexChange}
      />
      <EditFeedbackModal
        open={props.editDialogOpen}
        editForm={props.editForm}
        formLoading={props.formLoading}
        formErrors={props.formErrors}
        onClose={props.onCloseEdit}
        onFormChange={props.onFormChange}
        onSaveEdit={props.onSaveEdit}
      />
    </>
  );
}
