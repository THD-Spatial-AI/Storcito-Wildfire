import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  GitCompareArrows,
  Globe2,
  GraduationCap,
  Info,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "@/i18n";
import { RiskMapIcon } from "@/components/ui/RiskMapIcon";

import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/hooks/useLogout";
import { useProductTour } from "@/features/guided-tour/hooks/useProductTour";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import { useMapStore } from "@/features/interactive-map/store/map-store";
import { hasMinimumAccessLevel } from "@/utils/access-level";
import {
  ADMIN_PATH,
  DOCUMENTATION_URL,
  NAV_EXPANDED_WIDTH,
  SIDEBAR_WIDTH,
} from "../constants";

import type { AccessLevel, NavigationHandlers, SidebarItem, UserMenuItem } from "../types";

const NAV_EXPANDED_KEY = "storcito_nav_expanded";

// mouse or trackpad
const isDesktopPointer = () => {
  try {
    return globalThis.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? true;
  } catch {
    return true;
  }
};

// default by device
const defaultNavExpanded = () => isDesktopPointer() && (globalThis.innerWidth ?? 1440) >= 1280;

// touch starts collapsed
const readNavExpanded = () => {
  if (!isDesktopPointer()) return false;
  try {
    const saved = globalThis.localStorage?.getItem(NAV_EXPANDED_KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
  } catch {
    // storage may fail
  }
  return defaultNavExpanded();
};

export const useAppLayoutState = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const performLogout = useLogout();
  const { startTour, startDashboardTour, restartAreaSelectTour } = useProductTour();
  const baseLayers = useMapStore((s) => s.layers);
  const selectedBaseLayerId = useMapStore((s) => s.selectedBaseLayerId);
  const setSelectedBaseLayerId = useMapStore((s) => s.setSelectedBaseLayerId);
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { t } = useTranslation();

  const isActive = useCallback(
    (path: string) =>
      location.pathname === path || (path === ADMIN_PATH && location.pathname === "/"),
    [location.pathname]
  );

  const hasAccessLevel = useCallback(
    (required: AccessLevel): boolean => {
      return hasMinimumAccessLevel(user?.access_level, required);
    },
    [user]
  );

  const hasAccessToLayer = useCallback(
    (layer: { accessLevel: AccessLevel }): boolean => {
      if (!user) return false;

      return hasMinimumAccessLevel(user.access_level, layer.accessLevel);
    },
    [user]
  );

  const changeBaseLayer = useCallback(
    (layerId: string) => {
      const layer = baseLayers.find((candidate) => candidate.id === layerId);
      if (!layer || !hasAccessToLayer(layer)) return;
      setSelectedBaseLayerId(layer.id);
    },
    [baseLayers, hasAccessToLayer, setSelectedBaseLayerId]
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
      profile: () => navigate("/app/settings?tab=profile"),
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
    } else if (location.pathname.replace(/\/$/, "") === "/app/model-dashboard") {
      startDashboardTour();
    } else {
      startTour();
    }
  }, [location.pathname, restartAreaSelectTour, startDashboardTour, startTour]);

  const sidebarItems: SidebarItem[] = useMemo(
    () =>
      (
        [
          {
            path: "/app/model-dashboard",
            icon: RiskMapIcon,
            title: t("model.dashboard", "Model Dashboard"),
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
            // comparing two runs
            path: "/app/comparison",
            icon: GitCompareArrows,
            title: t("common.sidebar.simulationReports"),
            color: "#10b981",
            bgColor: "#d1fae5",
            dataTour: "reports",
            minAccessLevel: "manager",
          },
        ] as SidebarItem[]
      ).filter((item) => !item.minAccessLevel || hasAccessLevel(item.minAccessLevel)),
    [hasAccessLevel, t]
  );

  const userMenuItems: UserMenuItem[] = useMemo(
    () => [
      { icon: Settings, label: t("common.menu.settings"), onClick: navigationHandlers.settings },
      { icon: ShieldCheck, label: t("common.menu.privacy"), onClick: () => navigate("/privacy") },
      { icon: LogOut, label: t("common.menu.logout"), onClick: navigationHandlers.logout, separatorBefore: true },
    ],
    [navigationHandlers, navigate, t]
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

  // sidebar for everyone
  const topbarHeight = "0px";

  // expandable left nav
  const [navExpandedPref, setNavExpandedPref] = useState(readNavExpanded);
  const navExpanded = navExpandedPref;
  const toggleNav = useCallback(() => {
    setNavExpandedPref((value) => {
      const next = !value;
      try {
        // remember desktop only
        if (isDesktopPointer()) globalThis.localStorage?.setItem(NAV_EXPANDED_KEY, next ? "1" : "0");
      } catch {
        // storage blocked
      }
      return next;
    });
  }, []);
  const navWidth = navExpanded ? NAV_EXPANDED_WIDTH : SIDEBAR_WIDTH;
  const cssVariables = {
    "--nav-width": navWidth,
    "--sidebar-width": SIDEBAR_WIDTH,
    "--topbar-height": topbarHeight,
  } as React.CSSProperties;

  return {
    accessibleBaseLayers,
    changeBaseLayer,
    completeOnboarding,
    cssVariables,
    topbarHeight,
    navExpanded,
    navWidth,
    toggleNav,
    getUserInitial,
    handleSmartRestartTour,
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
