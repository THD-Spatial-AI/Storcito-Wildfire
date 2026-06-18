import { useTranslation } from "@/i18n";
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
}

// Profile avatar + dropdown (session timer, theme, menu). Lives at the bottom
// of the left rail; the menu opens to the right of it.
export const ProfileMenu: React.FC<ProfileMenuProps> = ({ userMenuItems, getUserInitial }) => {
  const { t } = useTranslation();

  return (
    <Authorized>
      <div className="relative" data-tour="profile">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="cursor-pointer rounded-full size-9 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm transition-all duration-200 hover:shadow-md group"
              title={t("common.tooltips.profile")}
            >
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:scale-105 transition-transform">
                {getUserInitial()}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52 z-[60]" side="right" align="end" sideOffset={8}>
            <div className="px-2 py-2 border-b border-gray-100 dark:border-gray-700">
              <SessionTimer warningThreshold={5} compact />
            </div>
            <div className="px-2 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-foreground">{t("common.tooltips.theme")}</span>
              <ThemeToggle />
            </div>
            {userMenuItems.map((item) => (
              <DropdownMenuItem key={item.label} className="cursor-pointer" onClick={item.onClick}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Authorized>
  );
};
