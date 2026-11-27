import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { config } from "@/configuration/app";
import { useAuthStore } from "@/store/auth-store";
import { notificationsService } from "@/features/notifications/services/notifications";

export interface Notification {
  id: number | string;
  notification_id?: number;
  title: string;
  message: string;
  type: "warning" | "error" | "success" | "info" | "maintenance";
  read: boolean;
  created_at: string;
  service?: string;
  scheduled_at?: string;
  model_id?: number;
}

interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
}

// react query keys
const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params?: { last30Days?: boolean }) => [...notificationKeys.lists(), params] as const,
};

let eventSource: EventSource | null = null;

// close event source
export function closeNotificationStream() {
  if (eventSource) {
    try {
      eventSource.close();
    } catch {
      // ignore close errors
    }
    eventSource = null;
  }
}

export const useNotificationsQuery = (params?: { last30Days?: boolean }) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      return notificationsService.list(params);
    },
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // sse subscription
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (!eventSource) {
      initializeEventSource(queryClient);
    }

    return () => {
      // stream stays shared
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return query;
};

// stream endpoint url
function buildStreamUrl(): string {
  const base = config.api.baseUrl || "/api";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalizedBase}/notifications/stream`;
}

// open shared stream
function initializeEventSource(queryClient: QueryClient) {
  if (eventSource) {
    return;
  }

  // guests skip stream
  const user = useAuthStore.getState().user;
  if (!user) {
    return;
  }

  try {
    const streamUrl = buildStreamUrl();
    const options: EventSourceInit = { withCredentials: true };
    eventSource = new EventSource(streamUrl, options);

    eventSource.onopen = () => {};

    eventSource.addEventListener("notification", (ev: MessageEvent) => {
      handleIncomingNotification(ev, queryClient);
    });

    eventSource.onerror = () => {
      handleEventSourceError(queryClient);
    };
  } catch {
    // ignore connection errors
  }
}

// handle incoming notification
function handleIncomingNotification(ev: MessageEvent, queryClient: QueryClient) {
  try {
    const incoming = JSON.parse(ev.data) as Notification;
    updateNotificationsList(incoming, queryClient);
    // notification about model
    if (incoming.type === "success" || incoming.type === "error") {
      queryClient.invalidateQueries({ queryKey: ["models"] });
    }
  } catch {
    // ignore parse errors
  }
}

// update notifications list
function updateNotificationsList(incoming: Notification, queryClient: QueryClient) {
  queryClient.setQueriesData<NotificationsResponse>(
    { queryKey: notificationKeys.lists() },
    (old: NotificationsResponse | undefined) => {
      if (!old) return old;

      const exists = old.notifications?.some((n) => n.id === incoming.id);
      if (exists) return old;

      const next = [incoming, ...(old.notifications || [])];
      return { ...old, notifications: next.slice(0, 50) };
    }
  );
}

// handle sse error
function handleEventSourceError(queryClient: QueryClient) {
  try {
    eventSource?.close();
  } catch {
    // ignore close errors
  }
  eventSource = null;

  // reconnect if signed
  const user = useAuthStore.getState().user;
  if (!user) {
    return;
  }

  // retry after delay
  setTimeout(() => {
    // double-check user authenticated
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      initializeEventSource(queryClient);
    }
  }, 5000);
}

// optimistic list update
const useOptimisticListMutation = <V,>(
  call: (vars: V) => Promise<unknown>,
  update: (list: Notification[], vars: V) => Notification[],
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: call,
    onMutate: async (vars: V) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
      const previousData = queryClient.getQueriesData({ queryKey: notificationKeys.lists() });
      queryClient.setQueriesData<NotificationsResponse>({ queryKey: notificationKeys.lists() }, (old) =>
        old?.notifications ? { ...old, notifications: update(old.notifications, vars) } : old,
      );
      return { previousData };
    },
    onError: (_error, _vars, context) => {
      // roll back
      for (const [queryKey, data] of context?.previousData ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
};

// mark one read
export const useMarkNotificationReadMutation = () =>
  useOptimisticListMutation(
    (id: number | string) => notificationsService.markRead(id),
    (list, id) => list.map((n) => (n.id === id ? { ...n, read: true } : n)),
  );

// mark all read
export const useMarkAllNotificationsReadMutation = () =>
  useOptimisticListMutation<void>(
    () => notificationsService.markAllRead(),
    (list) => list.map((n) => ({ ...n, read: true })),
  );

// clear all
export const useClearAllNotificationsMutation = () =>
  useOptimisticListMutation<void>(
    () => notificationsService.clearAll(),
    () => [],
  );

export type NotificationTab = "all" | "model" | "system";

// maintenance is system
export const isSystemNotification = (n: Notification) => n.type === "maintenance" || Boolean(n.service);

/** tab filter actions */
export function useNotificationTabs(notifications: Notification[]) {
  const [tab, setTab] = useState<NotificationTab>("all");
  const markOne = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();

  const visible = useMemo(
    () => (tab === "all" ? notifications : notifications.filter((n) => (tab === "system") === isSystemNotification(n))),
    [notifications, tab],
  );
  const unread = useMemo(() => {
    const open = notifications.filter((n) => !n.read);
    const system = open.filter(isSystemNotification).length;
    return { all: open.length, model: open.length - system, system };
  }, [notifications]);

  // only this tab
  const markVisibleRead = async () => {
    try {
      if (tab === "all") await markAll.mutateAsync();
      else await Promise.all(visible.filter((n) => !n.read).map((n) => markOne.mutateAsync(n.id)));
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to mark as read:", error);
    }
  };

  const markRead = async (id: number | string) => {
    try {
      await markOne.mutateAsync(id);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to mark as read:", error);
    }
  };

  // server clears everything
  return { tab, setTab, visible, unread, markRead, markVisibleRead, canClear: tab === "all" };
}
