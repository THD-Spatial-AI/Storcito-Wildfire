import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Map as MapIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
  modelId?: number;
}

interface NotificationPanelProps {
  notification: Notification | null;
  onClose: () => void;
}

// translation key mappings
const NOTIFICATION_TITLE_KEYS: Record<string, string> = {
  'Model Calculation Complete': 'notifications.messages.modelCalculationComplete',
  'Model Calculation Failed': 'notifications.messages.modelCalculationFailed',
  'Model Calculation Started': 'notifications.messages.modelCalculationStarted',
};

const NOTIFICATION_MESSAGE_PATTERNS: Array<{
  pattern: RegExp;
  key: string;
  extractParams: (match: RegExpMatchArray) => Record<string, string>;
}> = [
  {
    pattern: /Your model '(.+)' has been successfully calculated and is ready to view/,
    key: 'notifications.messages.modelCalculationCompleteMessage',
    extractParams: (match) => ({ modelName: match[1] }),
  },
  {
    pattern: /Your model '(.+)' calculation has failed/,
    key: 'notifications.messages.modelCalculationFailedMessage',
    extractParams: (match) => ({ modelName: match[1] }),
  },
  {
    pattern: /Your model '(.+)' calculation has started/,
    key: 'notifications.messages.modelCalculationStartedMessage',
    extractParams: (match) => ({ modelName: match[1] }),
  },
];

// status colour type
const NOTIFICATION_CONFIG = {
  success: { icon: CheckCircle2, tone: 'bg-foreground text-background', bar: 'bg-foreground/60' },
  error: { icon: AlertCircle, tone: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400', bar: 'bg-red-500/70' },
  warning: { icon: AlertTriangle, tone: 'bg-muted text-foreground', bar: 'bg-foreground/40' },
  info: { icon: Info, tone: 'bg-muted text-foreground', bar: 'bg-foreground/40' },
} as const;

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notification, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [displayedNotification, setDisplayedNotification] = useState<Notification | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  
  const isClosingRef = useRef(false);
  const lastShownIdRef = useRef<number | null>(null);
  
  // translate notification title
  const getTranslatedTitle = useCallback((title: string): string => {
    const translationKey = NOTIFICATION_TITLE_KEYS[title];
    if (translationKey) {
      return t(translationKey, { defaultValue: title });
    }
    return title;
  }, [t]);
  
  // translate notification message
  const getTranslatedMessage = useCallback((message: string): string => {
    for (const { pattern, key, extractParams } of NOTIFICATION_MESSAGE_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        const params = extractParams(match);
        return t(key, { ...params, defaultValue: message });
      }
    }
    return message;
  }, [t]);
  const timersRef = useRef<{ progress?: NodeJS.Timeout; close?: NodeJS.Timeout }>({});

  const clearTimers = useCallback(() => {
    if (timersRef.current.progress) {
      clearInterval(timersRef.current.progress);
      timersRef.current.progress = undefined;
    }
    if (timersRef.current.close) {
      clearTimeout(timersRef.current.close);
      timersRef.current.close = undefined;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    
    clearTimers();
    setIsLeaving(true);
    
    setTimeout(() => {
      setDisplayedNotification(null);
      setIsLeaving(false);
      setProgress(100);
      isClosingRef.current = false;
      onClose();
    }, 400);
  }, [onClose, clearTimers]);

  useEffect(() => {
    if (notification && notification.id !== lastShownIdRef.current) {
      lastShownIdRef.current = notification.id;
      
      clearTimers();
      setDisplayedNotification(notification);
      setIsLeaving(false);
      setProgress(100);
      isClosingRef.current = false;

      const duration = 10000;
      const interval = 50;
      const decrement = (interval / duration) * 100;

      timersRef.current.progress = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            if (timersRef.current.progress) {
              clearInterval(timersRef.current.progress);
            }
            return 0;
          }
          return prev - decrement;
        });
      }, interval);

      timersRef.current.close = setTimeout(() => {
        handleClose();
      }, duration);
    }
  }, [notification, handleClose, clearTimers]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  if (!displayedNotification) return null;

  const config = NOTIFICATION_CONFIG[displayedNotification.type] || NOTIFICATION_CONFIG.info;
  const IconComponent = config.icon;
  const translatedTitle = getTranslatedTitle(displayedNotification.title);
  const translatedMessage = getTranslatedMessage(displayedNotification.message);
  const resultsPath =
    displayedNotification.type === 'success' && displayedNotification.modelId
      ? `/app/model-results/${displayedNotification.modelId}`
      : null;
  // hide on page
  const showViewButton = Boolean(resultsPath && pathname !== resultsPath);

  return (
    // bottom right corner
    <div className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[9999]">
      <div
        role="status"
        className={cn(
          'pointer-events-auto relative w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground',
          'shadow-[0_18px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]',
          'transform transition-all duration-300 ease-out',
          isLeaving ? 'translate-x-3 opacity-0' : 'translate-x-0 opacity-100'
        )}
      >
        <div className="flex gap-3 p-4 pr-10">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', config.tone)}>
            <IconComponent className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold leading-snug text-foreground">{translatedTitle}</h4>
            <p className="mt-0.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{translatedMessage}</p>
            <div className="mt-3 flex items-center gap-2">
              {showViewButton && (
                <button
                  type="button"
                  onClick={() => {
                    if (resultsPath) navigate(resultsPath);
                    handleClose();
                  }}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <MapIcon className="size-3.5" />
                  {t('notifications.viewMap', 'View map')}
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t('notifications.dismiss')}
              </button>
              <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground/80">
                {displayedNotification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label={t('notifications.dismiss')}
          className="absolute right-2.5 top-2.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        {/* time left */}
        <div className="h-0.5 bg-muted">
          <div className={cn('h-full transition-all duration-100 ease-linear', config.bar)} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
