import { LayoutDashboard, Users, Building2, BarChart3, Settings, type LucideIcon } from "lucide-react";

/** One role (rev 3): admin sees everything. */
export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** §22.5 mock "fresh activity" count. */
  badge?: number;
}

export const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads / Calls", icon: Users }, // every lead comes from a call
  { to: "/projects", label: "Projects & properties", icon: Building2 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];
