import { AlertTriangle, CheckCircle, MessageCircle, Star, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { SnackbarState, Translate } from "./types";

const ALERT_STYLES = {
  success: "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200",
  error: "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200",
  warning: "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200",
  info: "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
};

const ALERT_ICONS = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <AlertTriangle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <MessageCircle className="w-5 h-5" />,
};

export const Alert: React.FC<{
  severity: keyof typeof ALERT_STYLES;
  children: React.ReactNode;
  onClose?: () => void;
}> = ({ severity, children, onClose }) => (
  <div className={`p-4 rounded-lg border flex items-center gap-3 ${ALERT_STYLES[severity]}`}>
    {ALERT_ICONS[severity]}
    <div className="flex-1">{children}</div>
    {onClose && (
      <button onClick={onClose} className="text-current hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

export const Snackbar: React.FC<SnackbarState & { onClose: () => void }> = ({
  open,
  message,
  severity,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <Alert severity={severity} onClose={onClose}>
        {message}
      </Alert>
    </div>
  );
};

export const FormSection: React.FC<{
  title: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ title, required, children }) => (
  <div className="bg-card text-card-foreground rounded-xl p-5 shadow-sm border border-border">
    {title && (
      <h3 className="text-sm font-semibold text-foreground mb-4">
        {title} {required && <span className="text-red-500">*</span>}
      </h3>
    )}
    {children}
  </div>
);

export const Rating: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-colors w-6 h-6"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              star <= (hover || value)
                ? "text-gray-700 dark:text-yellow-400 fill-gray-700 dark:fill-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export const SuccessScreen: React.FC<{ t: Translate }> = ({ t }) => (
  <div className="max-w-2xl mx-auto p-6 animate-fade-in">
    <div className="bg-card text-card-foreground rounded-xl p-8 shadow-sm border border-border text-center">
      <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle className="w-7 h-7 text-primary-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-3">{t("feedback.success.title")}</h2>
      <p className="text-muted-foreground mb-4 text-sm">{t("feedback.success.message")}</p>
      <p className="text-xs text-muted-foreground bg-muted rounded-lg py-2 px-4 inline-block">
        {t("feedback.success.reference")}: FB-{Date.now().toString().slice(-6)}
      </p>
    </div>
  </div>
);
