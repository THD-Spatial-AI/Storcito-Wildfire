import { Fragment, useState } from "react";
import { Check, ChevronDown, ChevronRight, Languages } from "lucide-react";
import { useTranslation, languages, changeLanguage, type LanguageCode } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@spatialhub/ui";

import ThemeToggle from "@/components/ui/ThemeToggle";
import { SessionTimer } from "@/components/ui/SessionTimer";
import { Authorized } from "@/middleware/authorized";
import type { UserMenuItem } from "./types";

interface ProfileMenuProps {
  userMenuItems: UserMenuItem[];
  getUserInitial: () => string;
  /** wide nav avatar */
  expanded?: boolean;
  userName?: string | null;
  userEmail?: string | null;
}

// profile avatar dropdown
export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  userMenuItems,
  getUserInitial,
  expanded = false,
  userName,
  userEmail,
}) => {
  const { t, i18n } = useTranslation();
  const [showLanguages, setShowLanguages] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const currentCode = (i18n.language?.split("-")[0] || "en") as LanguageCode;
  const current = languages.find((language) => language.code === currentCode);

  return (
    <Authorized>
      <div className={cn("relative", expanded && "w-full")} data-tour="profile">
        <DropdownMenu
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open) setShowLanguages(false);
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "group cursor-pointer",
                expanded && "flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-accent"
              )}
              title={t("common.tooltips.profile")}
            >
              <span className="rounded-full size-9 shrink-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm transition-all duration-200 hover:shadow-md group"
            >
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:scale-105 transition-transform">
                {getUserInitial()}
              </div>
              </span>
              {expanded && (
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-medium text-foreground">{userName || userEmail}</span>
                  {userName && userEmail && (
                    <span className="block truncate text-[11px] text-muted-foreground">{userEmail}</span>
                  )}
                </span>
              )}
              {/* menu opens right */}
              {expanded && (
                <ChevronRight
                  aria-hidden
                  className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-colors", menuOpen && "text-foreground")}
                />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 z-[60]" side="right" align="end" sideOffset={8}>
            <div className="px-2 py-2 border-b border-gray-100 dark:border-gray-700">
              <SessionTimer warningThreshold={5} compact />
            </div>
            <div className="px-2 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-foreground">{t("common.tooltips.theme")}</span>
              <ThemeToggle />
            </div>
            {/* inline language list */}
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(event) => {
                event.preventDefault();
                setShowLanguages((value) => !value);
              }}
            >
              <Languages className="w-4 h-4" />
              {t("settings.language.title", "Language")}
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                {current?.flag} {current?.nativeName}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showLanguages && "rotate-180")} />
              </span>
            </DropdownMenuItem>
            {showLanguages && (
              <div className="max-h-56 overflow-y-auto border-y border-gray-100 py-1 dark:border-gray-700">
                {languages.map((language) => {
                  const active = language.code === currentCode;
                  return (
                    <DropdownMenuItem
                      key={language.code}
                      className={cn("cursor-pointer gap-2 pl-7", active && "bg-muted font-medium")}
                      onSelect={() => void changeLanguage(language.code, "wildfire-app_language")}
                    >
                      <span aria-hidden className="text-sm leading-none">{language.flag}</span>
                      <span className="min-w-0 flex-1 truncate">{language.nativeName}</span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            )}
            {userMenuItems.map((item) => (
              <Fragment key={item.label}>
                {item.separatorBefore && <div role="separator" className="my-1 h-px bg-border" />}
                <DropdownMenuItem className="cursor-pointer" onClick={item.onClick}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </DropdownMenuItem>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Authorized>
  );
};
