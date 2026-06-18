import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { closeNotificationStream } from "@/features/notifications/hooks/useNotificationsQuery";

/**
 * Returns a callback that logs the user out, closes the notification stream, and navigates to the home page.
 */
export function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return useCallback(() => {
    closeNotificationStream();
    logout();
    navigate("/");
  }, [logout, navigate]);
}
