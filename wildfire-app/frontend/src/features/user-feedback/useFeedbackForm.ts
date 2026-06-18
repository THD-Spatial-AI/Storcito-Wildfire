import React, { useCallback, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { userFeedbackService } from "./feedbackService";
import type { FeedbackFormData, SnackbarState, Translate } from "./types";

const initialFeedbackData: FeedbackFormData = {
  category: "",
  subject: "",
  message: "",
  rating: 0,
  images: [],
};

const compressImage = (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }));
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = url;
  });

const createPreview = (file: File, onPreview: (preview: string) => void) => {
  const reader = new FileReader();
  reader.onloadend = () => onPreview(reader.result as string);
  reader.readAsDataURL(file);
};

const getNextListPrefix = (prefix: string) => {
  const numMatch = prefix.match(/^(\d+)\.\s$/);
  if (numMatch) return `${parseInt(numMatch[1]) + 1}. `;
  if (prefix.match(/[-*]\s\[x\]\s/)) return prefix.replace("[x]", "[ ]");
  return prefix;
};

const continueList = (
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  text: string,
  updateMessage: (message: string) => void,
) => {
  const textarea = e.currentTarget;
  const { selectionStart } = textarea;
  const beforeCursor = text.substring(0, selectionStart);
  const currentLineStart = beforeCursor.lastIndexOf("\n") + 1;
  const currentLine = beforeCursor.substring(currentLineStart);
  const listMatch = currentLine.match(/^(\s*)([-*]\s\[[ x]\]\s|[-*]\s|\d+\.\s|>\s)/);

  if (!listMatch) return false;

  const [, indent, prefix] = listMatch;
  const contentAfterPrefix = currentLine.substring(indent.length + prefix.length);
  e.preventDefault();

  if (!contentAfterPrefix.trim()) {
    const newText = text.substring(0, currentLineStart) + "\n" + text.substring(selectionStart);
    updateMessage(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = currentLineStart + 1;
      textarea.setSelectionRange(pos, pos);
    });
    return true;
  }

  const insertion = "\n" + indent + getNextListPrefix(prefix);
  const newText = text.substring(0, selectionStart) + insertion + text.substring(selectionStart);
  updateMessage(newText);
  requestAnimationFrame(() => {
    textarea.focus();
    const pos = selectionStart + insertion.length;
    textarea.setSelectionRange(pos, pos);
  });
  return true;
};

const getSubmitErrorMessage = (error: unknown, t: Translate) => {
  if (error && typeof error === "object" && "response" in error && (error as { response?: { status?: number } }).response?.status === 413) {
    return t("feedback.errors.payloadTooLarge", "The attachment is too large. Please use smaller images.");
  }
  if (error instanceof Error) return error.message;
  return t("feedback.errors.submitFailed");
};

export const useFeedbackForm = (t: Translate) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [feedbackData, setFeedbackData] = useState<FeedbackFormData>(initialFeedbackData);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [messageTab, setMessageTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  const updateField = useCallback(<K extends keyof FeedbackFormData>(field: K, value: FeedbackFormData[K]) => {
    setFeedbackData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateMessage = useCallback((message: string) => updateField("message", message), [updateField]);

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const insertMarkdown = useCallback((prefix: string, suffix = "", placeholder = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = feedbackData.message;
    const selected = text.substring(start, end);
    const insert = selected || placeholder;
    const newText = text.substring(0, start) + prefix + insert + suffix + text.substring(end);
    updateMessage(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + prefix.length + insert.length;
      textarea.setSelectionRange(
        selected ? cursorPos + suffix.length : start + prefix.length,
        selected ? cursorPos + suffix.length : start + prefix.length + insert.length,
      );
    });
  }, [feedbackData.message, updateMessage]);

  const insertBlock = useCallback((block: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = feedbackData.message;
    const before = text.substring(0, start);
    const after = text.substring(start);
    const needsNewlineBefore = before.length > 0 && !before.endsWith("\n\n");
    const needsNewlineAfter = after.length > 0 && !after.startsWith("\n");
    const prefix = needsNewlineBefore ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const suffix = needsNewlineAfter ? "\n" : "";
    const newText = before + prefix + block + suffix + after;
    updateMessage(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = before.length + prefix.length + block.length;
      textarea.setSelectionRange(pos, pos);
    });
  }, [feedbackData.message, updateMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && continueList(e, feedbackData.message, updateMessage)) {
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    const shortcuts: Record<string, () => void> = {
      b: () => insertMarkdown("**", "**", "bold"),
      i: () => insertMarkdown("_", "_", "italic"),
      k: () => insertMarkdown("[", "](url)", "link text"),
      e: () => insertMarkdown("`", "`", "code"),
      d: () => insertMarkdown("~~", "~~", "strikethrough"),
    };

    if (e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      setMessageTab("preview");
      return;
    }

    const handler = shortcuts[e.key.toLowerCase()];
    if (handler) {
      e.preventDefault();
      handler();
    }
  }, [feedbackData.message, insertMarkdown, updateMessage]);

  const handleImageSelect = useCallback(async (files: File[]) => {
    const validFiles = files.filter((file) => {
      const valid = file.type.startsWith("image/");
      if (!valid) {
        setSnackbar({ open: true, message: t("feedback.errors.invalidImageType"), severity: "error" });
      }
      return valid;
    });
    if (validFiles.length === 0) return;

    const compressed = await Promise.all(validFiles.map(async (file) => {
      try {
        return await compressImage(file);
      } catch {
        return file;
      }
    }));

    setFeedbackData((prev) => ({ ...prev, images: [...prev.images, ...compressed] }));
    compressed.forEach((file) => createPreview(file, (preview) => setImagePreviews((prev) => [...prev, preview])));
  }, [t]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) void handleImageSelect(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [handleImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) void handleImageSelect(Array.from(files));
  }, [handleImageSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeImage = useCallback((index: number) => {
    setFeedbackData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setSnackbar({ open: true, message: t("feedback.errors.loginRequired"), severity: "error" });
      return;
    }

    setLoading(true);
    try {
      const data = await userFeedbackService.submit(feedbackData);
      if (!data.success) throw new Error(data.message || t("feedback.errors.submitFailed"));

      setSubmitted(true);
      setHistoryRefresh((prev) => prev + 1);
      setSnackbar({ open: true, message: data.message || t("feedback.success.message"), severity: "success" });

      setTimeout(() => {
        setFeedbackData(initialFeedbackData);
        setImagePreviews([]);
        setSubmitted(false);
      }, 3000);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Error submitting feedback:", error);
      setSnackbar({ open: true, message: getSubmitErrorMessage(error, t), severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [feedbackData, t, user]);

  return {
    user,
    loading,
    submitted,
    historyRefresh,
    feedbackData,
    imagePreviews,
    isDragging,
    messageTab,
    textareaRef,
    fileInputRef,
    snackbar,
    isFormValid: Boolean(feedbackData.category && feedbackData.subject && feedbackData.message),
    updateField,
    setMessageTab,
    insertMarkdown,
    insertBlock,
    handleKeyDown,
    handleFileInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    removeImage,
    handleSubmit,
    closeSnackbar,
  };
};
