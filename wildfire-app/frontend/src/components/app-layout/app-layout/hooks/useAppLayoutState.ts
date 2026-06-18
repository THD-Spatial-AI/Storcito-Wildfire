import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Flame, GitCompareArrows, Globe2, GraduationCap, Info, LogOut, Settings, User } from "lucide-react";
import { useTranslation } from "@/i18n";

import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/hooks/useLogout";
import { useProductTour } from "@/features/guided-tour/hooks/useProductTour";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import { useMapStore } from "@/features/interactive-map/store/map-store";
import { ADMIN_PATH, DOCUMENTATION_URL, SIDEBAR_WIDTH, TOPBAR_HEIGHT } from "../constants";
import type { AccessLevel, NavigationHandlers, SidebarItem, UserMenuItem } from "../types";

const accessLevels: AccessLevel[] = ["very_low", "intermediate", "manager", "expert"];

export const useAppLayoutState = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const performLogout = useLogout();
  const { startTour, restartAreaSelectTour } = useProductTour();
  const baseLayers = useMapStore((s) => s.layers);
  const selectedBaseLayerId = useMapStore((s) => s.selectedBaseLayerId);
  const setSelectedBaseLayerId = useMapStore((s) => s.setSelectedBaseLayerId);
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { t } = useTranslation();

  const isActive = useCallback(
    (path: string) => location.pathname === path || (path === ADMIN_PATH && location.pathname === "/"),
    [location.pathname]
  );

  const hasAccessToLayer = useCallback(
    (layer: { accessLevel: AccessLevel }): boolean => {
      if (!user) return false;

      const userLevel = accessLevels.indexOf(user.access_level);
      const requiredLevel = accessLevels.indexOf(layer.accessLevel);

      return (
        userLevel >= requiredLevel ||
        user.access_level === "expert" ||
        user.access_level === "manager"
      );
    },
    [user]
  );

  const changeBaseLayer = useCallback(
    (index: number) => {
      const layer = baseLayers.at(index);
      if (!layer) return;
      setSelectedBaseLayerId(layer.id);
    },
    [baseLayers, setSelectedBaseLayerId]
  );

  const accessibleBaseLayers = useMemo(
    () => baseLayers.filter((layer) => hasAccessToLayer(layer)),
    [baseLayers, hasAccessToLayer]
  );

  useEffect(() => {
    if (
      selectedBaseLayerId &&
      accessibleBaseLayers.length > 0 &&
      !accessibleBaseLayers.some((layer) => layer.id === selectedBaseLayerId)
    ) {
      setSelectedBaseLayerId(accessibleBaseLayers[0].id);
    }
  }, [selectedBaseLayerId, accessibleBaseLayers, setSelectedBaseLayerId]);

  const navigationHandlers: NavigationHandlers = useMemo(
    () => ({
      profile: () => navigate("/app/profile"),
      settings: () => navigate("/app/settings"),
      dashboard: () => navigate(ADMIN_PATH),
      login: () => navigate("/login"),
      feedback: () => navigate("/app/feedback"),
      documentation: () => window.open(DOCUMENTATION_URL, "_blank", "noopener,noreferrer"),
      logout: async () => {
        performLogout();
      },
    }),
    [navigate, performLogout]
  );

  const handleSmartRestartTour = useCallback(() => {
    const isAreaSelectPage =
      location.pathname.includes("/app/model-dashboard/new-model") ||
      location.pathname.includes("/app/model-dashboard/edit/");

    if (isAreaSelectPage) {
      restartAreaSelectTour();
    } else {
      startTour();
    }
  }, [location.pathname, restartAreaSelectTour, startTour]);

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      {
        path: "/app/model-dashboard",
        icon: Flame,
        title: t("common.sidebar.simulations"),
        color: "#8b5cf6",
        bgColor: "#ede9fe",
        dataTour: "simulations",
      },
      {
        path: "/app/map",
        icon: Globe2,
        title: t("common.sidebar.map"),
        color: "#3b82f6",
        bgColor: "#dbeafe",
        dataTour: "map",
      },
      {
        path: "/app/comparison",
        icon: GitCompareArrows,
        title: t("common.sidebar.simulationReports"),
        color: "#10b981",
        bgColor: "#d1fae5",
        dataTour: "reports",
      },
    ],
    [t]
  );

  const userMenuItems: UserMenuItem[] = useMemo(
    () => [
      { icon: User, label: t("common.menu.profile"), onClick: navigationHandlers.profile },
      { icon: Settings, label: t("common.menu.settings"), onClick: navigationHandlers.settings },
      { icon: LogOut, label: t("common.menu.logout"), onClick: navigationHandlers.logout },
    ],
    [navigationHandlers, t]
  );

  const utilityItems = useMemo(
    () => ({
      documentation: BookOpen,
      restartTour: GraduationCap,
      feedback: Info,
    }),
    []
  );

  const getUserInitial = useCallback(
    () => (user?.name || user?.email || "U").charAt(0).toUpperCase(),
    [user]
  );

  const cssVariables = {
    "--sidebar-width": SIDEBAR_WIDTH,
    "--topbar-height": TOPBAR_HEIGHT,
  } as React.CSSProperties;

  return {
    accessibleBaseLayers,
    changeBaseLayer,
    completeOnboarding,
    cssVariables,
    getUserInitial,
    handleSmartRestartTour,
    hasAccessToLayer,
    isActive,
    navigationHandlers,
    selectedBaseLayerId,
    showOnboarding,
    sidebarItems,
    user,
    userMenuItems,
    utilityItems,
  };
};
