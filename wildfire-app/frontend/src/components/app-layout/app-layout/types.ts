import type { LucideIcon } from "lucide-react";

export interface SidebarItem {
  path: string;
  icon: LucideIcon;
  title: string;
  color: string;
  bgColor: string;
  dataTour: string;
}

export interface UserMenuItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
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
