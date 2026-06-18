import { Bold, Bug, Code, Eye, Heading, ImagePlus, Italic, Lightbulb, Link, List, ListChecks, ListOrdered, MessageCircle, Minus, Pencil, Quote, Send, SquareCode, Star, Strikethrough, Table, Trash2 } from "lucide-react";
import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FormSection, Rating } from "./FeedbackFormPresenters";
import type { CategoryKey, FeedbackFormData, Translate } from "./types";

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  bug: <Bug className="w-5 h-5" />,
  feature: <Lightbulb className="w-5 h-5" />,
  improvement: <Star className="w-5 h-5" />,
  general: <MessageCircle className="w-5 h-5" />,
};
const CATEGORY_KEYS = Object.keys(CATEGORY_ICONS) as CategoryKey[];
type ToolbarButton = { icon: React.ReactNode; action: () => void; title: string };
const ToolbarButtons: React.FC<{ buttons: ToolbarButton[] }> = ({ buttons }) => (
  <div className="flex items-center gap-0.5">
    {buttons.map((btn, i) => (
      <button key={i} type="button" onClick={btn.action} title={btn.title} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
        {btn.icon}
      </button>
    ))}
  </div>
);
const ToolbarSeparator = () => <div className="w-px h-4 bg-border mx-1" />;

export const CategorySection: React.FC<{ value: string; onChange: (value: CategoryKey) => void; t: Translate }> = ({ value, onChange, t }) => (
  <FormSection title={t("feedback.category")} required>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CATEGORY_KEYS.map((key) => {
        const isSelected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`
              p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md text-left
              ${isSelected ? "border-primary bg-accent" : "border-border hover:border-muted-foreground bg-card"}
            `}
          >
            <div className={`p-2 rounded-lg inline-flex mb-2 ${isSelected ? "bg-primary" : "bg-muted"}`}>
              <span className={isSelected ? "text-primary-foreground" : "text-muted-foreground"}>{CATEGORY_ICONS[key]}</span>
            </div>
            <p className="text-sm font-medium text-foreground">{t(`feedback.categories.${key}`)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t(`feedback.categories.${key}Description`)}</p>
          </button>
        );
      })}
    </div>
  </FormSection>
);

export const SubjectSection: React.FC<{ value: string; onChange: (value: string) => void; t: Translate }> = ({ value, onChange, t }) => (
  <FormSection title={t("feedback.subject")} required>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t("feedback.subjectPlaceholder")}
      required
      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-colors bg-background dark:bg-input text-foreground placeholder-muted-foreground"
    />
  </FormSection>
);

type MessageSectionProps = {
  value: string;
  tab: "write" | "preview";
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onTabChange: (tab: "write" | "preview") => void;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  insertMarkdown: (prefix: string, suffix?: string, placeholder?: string) => void;
  insertBlock: (block: string) => void;
  t: Translate;
};

export const MessageSection: React.FC<MessageSectionProps> = ({ value, tab, textareaRef, onTabChange, onChange, onKeyDown, insertMarkdown, insertBlock, t }) => {
  const formattingButtons: ToolbarButton[] = [
    { icon: <Heading className="w-3.5 h-3.5" />, action: () => insertMarkdown("### ", "", "heading"), title: "Heading (H3)" },
    { icon: <Bold className="w-3.5 h-3.5" />, action: () => insertMarkdown("**", "**", "bold"), title: "Bold (Ctrl+B)" },
    { icon: <Italic className="w-3.5 h-3.5" />, action: () => insertMarkdown("_", "_", "italic"), title: "Italic (Ctrl+I)" },
    { icon: <Strikethrough className="w-3.5 h-3.5" />, action: () => insertMarkdown("~~", "~~", "strikethrough"), title: "Strikethrough (Ctrl+D)" },
  ];
  const structureButtons: ToolbarButton[] = [
    { icon: <Quote className="w-3.5 h-3.5" />, action: () => insertBlock("> blockquote"), title: "Quote" },
    { icon: <Code className="w-3.5 h-3.5" />, action: () => insertMarkdown("`", "`", "code"), title: "Inline Code (Ctrl+E)" },
    { icon: <SquareCode className="w-3.5 h-3.5" />, action: () => insertBlock("```\ncode block\n```"), title: "Code Block" },
    { icon: <Minus className="w-3.5 h-3.5" />, action: () => insertBlock("---"), title: "Horizontal Rule" },
  ];
  const listButtons: ToolbarButton[] = [
    { icon: <List className="w-3.5 h-3.5" />, action: () => insertBlock("- item"), title: "Bullet List" },
    { icon: <ListOrdered className="w-3.5 h-3.5" />, action: () => insertBlock("1. item"), title: "Numbered List" },
    { icon: <ListChecks className="w-3.5 h-3.5" />, action: () => insertBlock("- [ ] task"), title: "Task List" },
    { icon: <Link className="w-3.5 h-3.5" />, action: () => insertMarkdown("[", "](url)", "link text"), title: "Link (Ctrl+K)" },
    { icon: <Table className="w-3.5 h-3.5" />, action: () => insertBlock("| Column 1 | Column 2 |\n| --- | --- |\n| cell | cell |"), title: "Table" },
  ];
  return (
    <FormSection title={t("feedback.message")} required>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => onTabChange("write")} className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${tab === "write" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Pencil className="w-3 h-3" />
              {t("feedback.write", "Write")}
            </button>
            <button type="button" onClick={() => onTabChange("preview")} className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${tab === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Eye className="w-3 h-3" />
              {t("feedback.preview", "Preview")}
            </button>
          </div>
          {tab === "write" && <div className="flex items-center"><ToolbarButtons buttons={formattingButtons} /><ToolbarSeparator /><ToolbarButtons buttons={structureButtons} /><ToolbarSeparator /><ToolbarButtons buttons={listButtons} /></div>}
        </div>
        {tab === "write" ? (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("feedback.messagePlaceholder")}
              required
              rows={10}
              className="w-full px-4 py-3 bg-background dark:bg-input text-foreground placeholder-muted-foreground resize-y min-h-[200px] focus:outline-none text-sm font-mono leading-relaxed"
            />
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
              <span>{t("feedback.markdownSupported", "Markdown supported")} · Ctrl+B Ctrl+I Ctrl+K</span>
              <span>{value.trim() ? value.trim().split(/\s+/).length : 0} {t("feedback.words", "words")} · {value.length} {t("feedback.chars", "chars")}</span>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 min-h-[200px] bg-background text-sm prose prose-sm dark:prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
            prose-p:text-foreground prose-p:leading-relaxed prose-p:my-2
            prose-strong:text-foreground
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3
            prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
            prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
            prose-hr:border-border
            prose-table:border-collapse prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-1.5 prose-th:bg-muted/50 prose-th:text-left prose-th:text-xs prose-th:font-semibold
            prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5 prose-td:text-xs
            prose-img:rounded-lg prose-img:max-w-full">
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                input: ({ type, checked, ...props }) => type === "checkbox" ? <input type="checkbox" checked={checked} readOnly className="mr-1.5 rounded" {...props} /> : <input type={type} {...props} />,
                a: ({ children, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props}>{children}</a>,
              }}>
                {value}
              </ReactMarkdown>
            ) : <p className="text-muted-foreground italic">{t("feedback.previewEmpty", "Nothing to preview")}</p>}
          </div>
        )}
      </div>
    </FormSection>
  );
};

type ImageUploadSectionProps = {
  feedbackData: FeedbackFormData;
  imagePreviews: string[];
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onRemoveImage: (index: number) => void;
  t: Translate;
};

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({ feedbackData, imagePreviews, isDragging, fileInputRef, onFileInputChange, onDrop, onDragOver, onDragLeave, onRemoveImage, t }) => (
  <FormSection title={t("feedback.image")}>
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFileInputChange} className="hidden" />
      {imagePreviews.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative group">
              <img src={preview} alt={`${t("feedback.imagePreview")} ${index + 1}`} className="h-32 rounded-lg border border-border object-cover" />
              <button type="button" onClick={() => onRemoveImage(index)} className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100" title={t("feedback.removeImage")}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <p className="mt-1 text-[10px] text-muted-foreground truncate max-w-[128px]">{feedbackData.images[index]?.name}</p>
            </div>
          ))}
        </div>
      )}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragging ? "border-primary bg-accent" : "border-border hover:border-muted-foreground hover:bg-muted/50"}
        `}
      >
        <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">{t("feedback.imageDropzone")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("feedback.imageFormats")}</p>
      </div>
    </div>
  </FormSection>
);

export const RatingSection: React.FC<{ value: number; onChange: (value: number) => void; t: Translate }> = ({ value, onChange, t }) => (
  <FormSection title={t("feedback.rating")}>
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{t("feedback.ratingDescription")}</span>
      <Rating value={value} onChange={onChange} />
    </div>
  </FormSection>
);

export const SubmitSection: React.FC<{ loading: boolean; disabled: boolean; t: Translate }> = ({ loading, disabled, t }) => (
  <FormSection title="">
    <div className="space-y-4">
      {loading && <div><p className="text-sm text-muted-foreground mb-2">{t("feedback.submittingMessage")}</p><div className="w-full bg-muted rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full animate-pulse w-2/3" /></div></div>}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button type="submit" disabled={disabled || loading} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-36">
          <Send className="w-4 h-4" />
          {loading ? t("feedback.submitting") : t("feedback.submit")}
        </button>
        <p className="text-xs text-muted-foreground text-center sm:text-left">{t("feedback.gdprNotice")}</p>
      </div>
    </div>
  </FormSection>
);
