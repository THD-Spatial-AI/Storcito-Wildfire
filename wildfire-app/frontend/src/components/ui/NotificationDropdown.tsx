import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@spatialhub/ui";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { NAV_ROW_CLASS } from "@/components/ui/SidebarButton";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/ui/TimeAgo";
import {
  useNotificationsQuery,
  useClearAllNotificationsMutation,
  useNotificationTabs,
  type Notification,
  type NotificationTab,
} from "@/features/notifications/hooks/useNotificationsQuery";
import { getNotificationResultPath } from "@/features/notifications/notification-navigation";
import {
  NotificationDetailDialog,
  getNotificationTypeStyles,
  getNotificationTypeIcon,
} from "./NotificationDetailDialog";

/** all models system */
export function NotificationKindTabs({
  tab,
  onChange,
  unread,
  className,
}: {
  tab: NotificationTab;
  onChange: (tab: NotificationTab) => void;
  unread: Record<NotificationTab, number>;
  className?: string;
}) {
  const { t } = useTranslation();
  const tabs: [NotificationTab, string][] = [
    ["all", t("notifications.tabs.all", "All")],
    ["model", t("notifications.tabs.models", "Models")],
    ["system", t("notifications.tabs.system", "System")],
  ];
  return (
    <div role="tablist" aria-label={t("notifications.tabs.label", "Notification type")} className={cn("flex gap-1", className)}>
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
            tab === id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {label}
          {unread[id] > 0 && (
            <span
              className={cn(
                "min-w-4 rounded-full px-1 text-[10px] leading-4 tabular-nums",
                tab === id ? "bg-background/20" : "bg-muted text-foreground"
              )}
            >
              {unread[id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** rail sidebar icon */
export const NotificationDropdown: React.FC<{ rail?: boolean; expanded?: boolean }> = ({ rail = false, expanded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const lastUnreadCountRef = useRef(0);

  // load notifications
  const { data } = useNotificationsQuery();
  const notifications = data?.notifications || [];

  // read actions
  const clearAllMutation = useClearAllNotificationsMutation();
  const { tab, setTab, visible, unread, markRead, markVisibleRead, canClear } = useNotificationTabs(notifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // show pulse animation
  useEffect(() => {
    if (unreadCount > lastUnreadCountRef.current) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 15000);
      return () => clearTimeout(timer);
    }
    lastUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // show 3 recent
  const recentNotifications = visible.slice(0, 3);

  const clearAllNotifications = async () => {
    try {
      await clearAllMutation.mutateAsync();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to clear notifications:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // mark as read
    await markRead(notification.id);

    // finished run link
    const resultPath = getNotificationResultPath(notification);
    if (resultPath) {
      navigate(resultPath);
      return;
    }

    // show notification details
    setSelectedNotification(notification);
    setDetailDialogOpen(true);
  };

  // wide nav row
  const inline = rail && expanded;
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);
  const title = t('notifications.title');

  return (
    <>
    <Tooltip>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative rounded-md transition-colors group cursor-pointer",
                inline
                  ? NAV_ROW_CLASS
                  : rail
                  ? "flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                  : "p-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              <Bell className={cn(
                rail ? "w-5 h-5" : "w-4 h-4",
                "transition-transform duration-200",
                unreadCount > 0 && "group-hover:rotate-12"
              )} />
              {unreadCount > 0 && !inline && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                  {showPulse && (
                    <span className="absolute inline-flex h-4 w-4 rounded-full bg-foreground/40 animate-ping"></span>
                  )}
                  <span className="relative inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-foreground text-[9px] font-semibold text-background shadow-sm">
                    {badgeText}
                  </span>
                </span>
              )}
              {inline && (
                <>
                  <span className="truncate">{title}</span>
                  {/* count line label */}
                  {unreadCount > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold tabular-nums text-background">
                      {badgeText}
                    </span>
                  )}
                </>
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side={rail ? "right" : "bottom"}>
          <p>{title}</p>
        </TooltipContent>
      <DropdownMenuContent align={rail ? "start" : "end"} side={rail ? "right" : undefined} sideOffset={rail ? 8 : 4} className="w-80 p-0 rounded-xl border border-border shadow-xl overflow-hidden bg-card z-[52]">
        {/* dropdown header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">
            {title}
          </h3>
          {visible.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => void markVisibleRead()}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('notifications.markAllRead')}
              </button>
              {canClear && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    {t('notifications.clearAll')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <NotificationKindTabs tab={tab} onChange={setTab} unread={unread} className="border-b border-border px-3 py-2" />
        )}

        {/* notifications list */}
        {visible.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('notifications.noNotifications')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('notifications.allCaughtUp')}</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.map((notification) => {
              const typeStyles = getNotificationTypeStyles(notification.type);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 cursor-pointer rounded-none border-b border-border last:border-b-0 focus:bg-accent",
                    !notification.read && "bg-muted/50"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    {/* type icon */}
                    <div className={cn("flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center", typeStyles.bg, typeStyles.text)}>
                      {getNotificationTypeIcon(notification.type)}
                    </div>

                    {/* message text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm text-foreground line-clamp-1",
                          notification.read ? "font-medium" : "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-foreground mt-1.5"></span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1.5">
                        <TimeAgo date={notification.created_at} />
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
            
            {/* show count remaining */}
            {notifications.length > 3 && (
              <div className="px-4 py-2 text-center text-xs text-muted-foreground bg-muted">
                {t(notifications.length - 3 === 1 ? 'notifications.moreNotification' : 'notifications.moreNotifications', { count: notifications.length - 3 })}
              </div>
            )}
          </div>
        )}

        {/* dropdown footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2.5 bg-muted">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate("/app/notifications");
              }}
              className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('notifications.viewAll')}
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </Tooltip>

    {/* notification detail dialog */}
    <NotificationDetailDialog
      notification={selectedNotification}
      open={detailDialogOpen}
      onOpenChange={setDetailDialogOpen}
      messageLabel={t('notifications.details')}
    />
  </>
  );
};
