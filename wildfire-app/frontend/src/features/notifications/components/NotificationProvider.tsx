import React, { useState, useEffect } from 'react';
import { useBrowserNotifications } from '@/features/notifications/hooks/useBrowserNotifications';
import NotificationPanel from './NotificationPanel';
import { settingsService } from '@/features/settings';
import { useAuthStore } from '@/store/auth-store';

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  // Authenticated only.
  useEffect(() => {
    const loadPreferences = async () => {
      // Skip for guests.
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const prefs = await settingsService.getNotificationPreferences();
        setBrowserNotificationsEnabled(prefs.browser);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to load notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Authenticated only.
  const { currentNotification, clearNotification } = useBrowserNotifications(
    browserNotificationsEnabled && !!user,
    true // Use in-app panel
  );

  if (loading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <NotificationPanel
        notification={currentNotification}
        onClose={clearNotification}
      />
    </>
  );
};

export default NotificationProvider;
