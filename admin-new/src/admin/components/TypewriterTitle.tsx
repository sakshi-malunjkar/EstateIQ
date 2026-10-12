import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Phase = "typing" | "holding" | "deleting" | "gap";

/**
 * Looping typewriter for headings: types `text`, holds, deletes, retypes — forever.
 * - Layout never shifts: an invisible copy of the full text (+ caret) reserves the exact box,
 *   and the animated text is laid over it.
 * - Screen readers get the full title once (the animated layer is aria-hidden).
 * - prefers-reduced-motion → plain static text, no timers at all.
 * - Pauses while off-screen (IntersectionObserver) so many titles don't burn CPU.
 * Put it INSIDE the existing heading element so the font/size/weight stay the same.
 */
export function TypewriterTitle({
  text,
  typingSpeed = 40,
  deleteSpeed = 22,
  holdDuration = 3500,
  className,
}: {
  text: string;
  typingSpeed?: number;
  deleteSpeed?: number;
  holdDuration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  // Restart cleanly if the text changes (e.g. navigating to another page).
  useEffect(() => { setCount(0); setPhase("typing"); }, [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (reduced || !visible) return; // paused off-screen
    let delay: number;
    let next: () => void;
    if (phase === "typing") {
      if (count >= text.length) { delay = 0; next = () => setPhase("holding"); }
      else { delay = typingSpeed; next = () => setCount((n) => n + 1); }
    } else if (phase === "holding") {
      delay = holdDuration; next = () => setPhase("deleting");
    } else if (phase === "deleting") {
      if (count <= 0) { delay = 0; next = () => setPhase("gap"); }
      else { delay = deleteSpeed; next = () => setCount((n) => n - 1); }
    } else {
      delay = 400; next = () => setPhase("typing");
    }
    const t = setTimeout(next, delay);
    return () => clearTimeout(t);
  }, [reduced, visible, phase, count, text, typingSpeed, deleteSpeed, holdDuration]);

  if (reduced) return <span className={className}>{text}</span>;

  return (
    <span ref={ref} className={cn("relative inline-grid align-baseline", className)}>
      <span className="sr-only">{text}</span>
      {/* sizing ghost: reserves the full width + height (incl. caret) so nothing reflows */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-pre">
        {text}<span className="eq-caret">|</span>
      </span>
      <span aria-hidden="true" className="col-start-1 row-start-1 whitespace-pre">
        {text.slice(0, count)}
        <span className="eq-caret">|</span>
      </span>
    </span>
  );
}
