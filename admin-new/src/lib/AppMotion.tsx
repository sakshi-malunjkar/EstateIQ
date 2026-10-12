import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { useForcedReducedMotion } from "./motion";

/** MotionConfig that honours the OS setting AND the in-app "Reduce motion" switch. */
export function AppMotion({ children }: { children: ReactNode }) {
  const forced = useForcedReducedMotion();
  return <MotionConfig reducedMotion={forced ? "always" : "user"}>{children}</MotionConfig>;
}
