import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";

/**
 * Hero brush underline. Inline SVG so the stroke can DRAW via pathLength
 * (the one allowed non-transform/opacity animation). Decorative: aria-hidden.
 *
 * Under prefers-reduced-motion every stroke renders fully drawn (initial={false}).
 */

const EASE = [0.22, 1, 0.36, 1] as const;

function useDraw() {
  const reduce = useReducedMotion();
  return (delay: number, duration = 0.5) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { delay, duration, ease: EASE },
        };
}

/** Accent (amber) brush stroke under the italic accent word; absolutely positioned, so no layout shift. */
export function BrushUnderline({ at = 0.8, className = "" }: { at?: number; className?: string }) {
  const draw = useDraw();
  return (
    <svg viewBox="0 0 120 16" preserveAspectRatio="none" fill="none" aria-hidden="true"
      className={`pointer-events-none absolute left-0 w-full h-[0.22em] top-[92%] text-accent-ink ${className}`}>
      <motion.path
        d="M3 10C25 5 52 4 78 6c14 1 27 2 39 1"
        stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity=".85"
        {...draw(at, 0.5)}
      />
    </svg>
  );
}
