import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export interface SidebarItem {
  path: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  color: string;
  bgColor: string;
  dataTour: string;
  minAccessLevel?: AccessLevel;
}

export interface UserMenuItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** divider above item */
  separatorBefore?: boolean;
}

export interface NavigationHandlers {
  profile: () => void;
  settings: () => void;
  dashboard: () => void;
  login: () => void;
  feedback: () => void;
  documentation: () => void;
  logout: () => Promise<void>;
}

export type AccessLevel = "very_low" | "intermediate" | "manager" | "expert";
