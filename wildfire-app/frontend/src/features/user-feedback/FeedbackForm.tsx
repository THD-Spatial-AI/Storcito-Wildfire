import { MessageSquare } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useTranslation } from "@/i18n";
import {
  CategorySection,
  ImageUploadSection,
  MessageSection,
  RatingSection,
  SubjectSection,
  SubmitSection,
} from "./FeedbackFormSections";
import { Snackbar, SuccessScreen } from "./FeedbackFormPresenters";
import { MyFeedbackHistory } from "./MyFeedbackHistory";
import { useFeedbackForm } from "./useFeedbackForm";

export const FeedbackComponent: React.FC = () => {
  const { t } = useTranslation();
  useDocumentTitle(t("feedback.title"));

  const form = useFeedbackForm(t);

  if (form.submitted) {
    return <SuccessScreen t={t} />;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-background text-foreground">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-900 dark:to-black rounded-xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("feedback.title")}</h1>
            <p className="text-gray-300 text-sm">{t("feedback.subtitle")}</p>
          </div>
        </div>
      </div>

      {form.user?.id && <MyFeedbackHistory userId={String(form.user.id)} refreshTrigger={form.historyRefresh} />}

      <form onSubmit={form.handleSubmit} className="space-y-4">
        <CategorySection
          value={form.feedbackData.category}
          onChange={(value) => form.updateField("category", value)}
          t={t}
        />

        <SubjectSection
          value={form.feedbackData.subject}
          onChange={(value) => form.updateField("subject", value)}
          t={t}
        />

        <MessageSection
          value={form.feedbackData.message}
          tab={form.messageTab}
          textareaRef={form.textareaRef}
          onTabChange={form.setMessageTab}
          onChange={(value) => form.updateField("message", value)}
          onKeyDown={form.handleKeyDown}
          insertMarkdown={form.insertMarkdown}
          insertBlock={form.insertBlock}
          t={t}
        />

        <ImageUploadSection
          feedbackData={form.feedbackData}
          imagePreviews={form.imagePreviews}
          isDragging={form.isDragging}
          fileInputRef={form.fileInputRef}
          onFileInputChange={form.handleFileInputChange}
          onDrop={form.handleDrop}
          onDragOver={form.handleDragOver}
          onDragLeave={form.handleDragLeave}
          onRemoveImage={form.removeImage}
          t={t}
        />

        <RatingSection
          value={form.feedbackData.rating}
          onChange={(value) => form.updateField("rating", value)}
          t={t}
        />

        <SubmitSection loading={form.loading} disabled={!form.isFormValid} t={t} />
      </form>

      <Snackbar {...form.snackbar} onClose={form.closeSnackbar} />
    </div>
  );
};

export default FeedbackComponent;
