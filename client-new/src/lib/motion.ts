/**
 * Reduced motion = the OS setting OR the in-app "Reduce motion" preference (Settings).
 * Components import `useReducedMotion` from here instead of motion/react, so the app switch
 * forces every animation off. CSS follows `html[data-reduced-motion="true"]` (index.css), and
 * index.html sets that attribute before first paint.
 */
import { useSyncExternalStore } from "react";
import { useReducedMotion as useOsReducedMotion } from "motion/react";

const KEY = "eq-reduced-motion";

const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
let forced = read();
const listeners = new Set<() => void>();
const apply = () => document.documentElement.setAttribute("data-reduced-motion", forced ? "true" : "false");
if (typeof document !== "undefined") apply();

/** The in-app preference alone (for the Settings switch). */
export function useForcedReducedMotion(): boolean {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => forced);
}

export function setForcedReducedMotion(on: boolean) {
  forced = on;
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* not persisted */ }
  apply();
  listeners.forEach((fn) => fn());
}

/** Drop-in for motion/react's hook: true if the OS asks for it OR the app setting is on. */
export function useReducedMotion(): boolean {
  const os = useOsReducedMotion();
  const app = useForcedReducedMotion();
  return !!os || app;
}
