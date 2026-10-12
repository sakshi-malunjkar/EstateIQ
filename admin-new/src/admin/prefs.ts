/** Admin preferences (mock, localStorage). Read by the Dashboard and the sign-in redirect. */
import { useSyncExternalStore } from "react";

export type DefaultRange = "today" | "7d" | "30d";
export interface AdminPrefs { defaultRange: DefaultRange; startPage: string }

const KEY = "eq-admin-prefs";
export const START_PAGES = [
  { to: "/", label: "Dashboard" },
  { to: "/leads", label: "Leads / Calls" },
  { to: "/analytics", label: "Analytics" },
] as const;
const DEFAULTS: AdminPrefs = { defaultRange: "7d", startPage: "/" };

const read = (): AdminPrefs => {
  try {
    const saved = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<AdminPrefs>) };
    return START_PAGES.some((p) => p.to === saved.startPage) ? saved : { ...saved, startPage: DEFAULTS.startPage };
  } catch { return DEFAULTS; }
};
let prefs = read();
const listeners = new Set<() => void>();

export function useAdminPrefs(): AdminPrefs {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => prefs);
}
export const getAdminPrefs = () => prefs;

export function saveAdminPrefs(next: AdminPrefs) {
  prefs = next;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* not persisted */ }
  listeners.forEach((fn) => fn());
}
