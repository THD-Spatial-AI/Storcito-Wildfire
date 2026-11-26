import React from "react";
import { useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/use-document-title";
import MapSettings from "@/features/settings/MapLocationSettings";
import NotificationSettings from "@/features/settings/NotificationSettings";
import AccessibilitySettings from "@/features/settings/AccessibilitySettings";
import LanguageSettings from "@/features/settings/LanguageSettings";
import NotificationManagement from "@/features/settings/NotificationManagement";
import { ProfileSettings } from "@/features/profile";
import { SettingsSection } from "@/features/settings/SettingsSection";

import { useAuthStore } from "@/store/auth-store";
import { useTranslation } from "@/i18n";
import { Accessibility, Bell, User, KeyRound, SlidersHorizontal } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { SectionNav, type SectionNavGroup } from "@/components/ui/SectionNav";

const TAB_KEYS = ["profile", "security", "preferences", "accessibility", "notifications"] as const;
type TabKey = (typeof TAB_KEYS)[number];

// profile and settings
const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  useDocumentTitle(t("settings.title"));
  const user = useAuthStore((state) => state.user);
  const isExpert = user?.access_level === "expert";

  // tab in url
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab: TabKey = TAB_KEYS.includes(requested as TabKey) ? (requested as TabKey) : "profile";
  const setActiveTab = (tab: TabKey) => setSearchParams({ tab }, { replace: true });

  // left menu groups
  const groups: SectionNavGroup<TabKey>[] = [
    {
      items: [
        { key: "profile", label: t("common.menu.profile"), icon: User },
        { key: "preferences", label: t("settings.tabs.preferences", "Preferences"), icon: SlidersHorizontal },
        { key: "accessibility", label: t("settings.tabs.accessibility", "Accessibility"), icon: Accessibility },
        { key: "notifications", label: t("settings.tabs.notifications"), icon: Bell },
      ],
    },
    {
      label: t("settings.groups.access", "Access"),
      items: [{ key: "security", label: t("settings.tabs.security", "Security"), icon: KeyRound }],
    },
  ];

  const levelLabel = (level: string | undefined) => {
    const labels: Record<string, string> = {
      very_low: t("settings.accessLevels.basic", "Basic"),
      intermediate: t("settings.accessLevels.intermediate", "Intermediate"),
      manager: t("settings.accessLevels.manager", "Manager"),
      expert: t("settings.accessLevels.expert", "Expert"),
    };
    return (level && labels[level]) || t("settings.stats.user");
  };
  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="md-scope min-h-full bg-background">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 [@media(pointer:coarse)]:py-3">

        {/* account header */}
        <div className="md-rise mb-8 flex items-center gap-3 [@media(pointer:coarse)]:mb-4">
          <BackButton iconOnly />
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-lg font-semibold text-foreground"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {user?.name || user?.email}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("settings.personalAccount", "Your personal account")} · {levelLabel(user?.access_level)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[232px_minmax(0,1fr)] [@media(pointer:coarse)]:gap-5">
          {/* section menu */}
          <SectionNav groups={groups} active={activeTab} onSelect={setActiveTab} ariaLabel={t("settings.title")} />

          {/* readable form width */}
          <div key={activeTab} className="md-fade-in min-w-0 max-w-4xl space-y-10">
            {activeTab === "profile" && <ProfileSettings section="profile" />}
            {activeTab === "security" && <ProfileSettings section="security" />}

            {activeTab === "preferences" && (
              <>
                <SettingsSection title={t("settings.language.title")} description={t("settings.language.subtitle")}>
                  <div className="max-w-xl">
                    <LanguageSettings />
                  </div>
                </SettingsSection>
                <SettingsSection title={t("settings.mapLocation.title")} description={t("settings.mapLocation.subtitle")}>
                  <div className="max-w-xl">
                    <MapSettings />
                  </div>
                </SettingsSection>
              </>
            )}

            {activeTab === "accessibility" && <AccessibilitySettings />}

            {activeTab === "notifications" && (
              <>
                <SettingsSection title={t("settings.notifications.title")} description={t("settings.notifications.subtitle")}>
                  <div className="max-w-xl">
                    <NotificationSettings />
                  </div>
                </SettingsSection>
                {/* expert only */}
                {isExpert && (
                  <SettingsSection title={t("settings.sendNotification.title")} description={t("settings.sendNotification.subtitle")}>
                    <div className="max-w-xl">
                      <NotificationManagement />
                    </div>
                  </SettingsSection>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
