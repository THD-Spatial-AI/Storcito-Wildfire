import { useTranslation } from "@/i18n";
import { ArrowUp } from "lucide-react";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@spatialhub/ui";

import ThemeToggle from "@/components/ui/ThemeToggle";
import { NotificationDropdown } from "@/components/ui/NotificationDropdown";
import { Authorized } from "@/middleware/authorized";
import WeatherDropdown from "@/features/weather/weather";
import type { NavigationHandlers } from "./types";

interface AppLayoutTopbarProps {
  user?: { name?: string | null; email?: string | null } | null;
  navigationHandlers: NavigationHandlers;
  navigateHome: () => void;
}

export const AppLayoutTopbar: React.FC<AppLayoutTopbarProps> = ({
  user,
  navigationHandlers,
  navigateHome,
}) => {
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 left-0 right-0 z-[51] border-b border-border bg-card text-foreground h-[var(--topbar-height)]">
      <div className="flex items-center h-full px-4">
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                e.preventDefault();
                navigateHome();
              }
            }}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src="/images/logo/Logo_Storcito_Web_Imagotipo_Oscuro-1024x230.png"
              alt="Wildfire Risk Assessment"
              className="h-8 w-auto object-contain dark:invert"
            />
          </a>
          <h1 className="text-sm font-semibold text-foreground hidden sm:block">
            {t("common.appName", "Wildfire Risk Assessment")}
          </h1>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 mr-4" data-tour="navigation">
          {/* Dashboard moved to the left sidebar bottom; weather stays here as a global tool. */}
          <Authorized>
            <NotificationDropdown />
          </Authorized>
          <Authorized>
            <WeatherDropdown showSettingsIcon={false} />
          </Authorized>
        </div>

        <div className="flex items-center gap-2">
          {/* Profile moved to the bottom of the left sidebar (see ProfileMenu). */}

          {!user && (
            <>
              <ThemeToggle />
              <div className="relative">
                <span
                  className="pointer-events-none absolute -inset-0.5 rounded-full bg-foreground/30 animate-ping"
                  aria-hidden="true"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      onClick={navigationHandlers.login}
                      className="relative cursor-pointer rounded-full size-9 flex items-center justify-center bg-foreground text-background hover:bg-foreground/90 border border-border shadow-md transition-all duration-200 hover:shadow-lg group"
                    >
                      <svg
                        className="w-4 h-4 text-background group-hover:scale-110 transition-transform"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("auth.signIn", "Sign in")}</TooltipContent>
                </Tooltip>
                <div className="pointer-events-none absolute top-full right-0 mt-2 flex flex-col items-center animate-bounce">
                  <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                  <span className="mt-0.5 rounded-full bg-foreground text-background text-[11px] font-semibold px-2.5 py-1 shadow-lg whitespace-nowrap">
                    {t("auth.signInHere", "Sign in here")}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
