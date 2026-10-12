import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { ScoreBand } from "@/api/types";
import { ScoreBadge } from "./ScoreBadge";
import { cn } from "@/lib/utils";

export interface ShapBar {
  /** raw model feature, e.g. "intent=schedule_visit" */
  feature: string;
  /** humanized label (§26.3) — the summary and bars use the same text */
  label: string;
  /** signed contribution in score points */
  value: number;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** §26.1 plain-language summary, templated from the top contributors. */
function summary(score: number, band: ScoreBand, bars: ShapBar[]) {
  const up = bars.filter((b) => b.value > 0).slice(0, 2).map((b) => lower(b.label));
  const down = bars.filter((b) => b.value < 0).slice(0, 1).map((b) => lower(b.label));
  const head = `Scored ${score} — ${band}`;
  // Same sentence as plain text, for the typewriter (styled version takes over once typed).
  const plain =
    head +
    (up.length ? `, mainly because of ${up.join(" and ")}` : "") +
    (down.length ? `. Held back by ${down[0]}` : "") +
    ".";
  return { up, down, head, plain };
}

const TYPE_MS = 28; // per character
const BAR_STAGGER = 0.08;
const BAR_DUR = 0.5;

/**
 * Two-step reveal, once per mount, when the panel first scrolls into view:
 * 1) the summary types out with a caret, 2) then the bars grow from the centre line.
 * Reduced motion → everything at its final state immediately.
 */
function useReveal(text: string) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<"idle" | "typing" | "bars">(reduced ? "bars" : "idle");

  useEffect(() => {
    if (reduced) { setPhase("bars"); setTyped(text.length); return; }
    if (!inView || phase !== "idle") return;
    setPhase("typing");
    let n = 0;
    const id = setInterval(() => {
      n++;
      setTyped(n);
      if (n >= text.length) { clearInterval(id); setPhase("bars"); }
    }, TYPE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when it first comes into view
  }, [inView, reduced]);

  return { ref, typed, phase, done: phase === "bars", instant: !!reduced };
}

/**
 * "Why this score?" (§26) — the signature panel. Diverging SHAP bars from a centre line:
 * green pushes the score up, red pulls it down, longest = biggest effect. INTERNAL — admin only.
 */
export function WhyThisScore({ score, band, bars, modelVersion, scoredAt, provisional = false, className }: {
  score: number; band: ScoreBand; bars: ShapBar[]; modelVersion: string; scoredAt: string; provisional?: boolean; className?: string;
}) {
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1);
  const s = summary(score, band, bars);
  const [feedback, setFeedback] = useState<null | "right" | "wrong">(null);
  const [direction, setDirection] = useState<null | "high" | "low">(null);
  const { ref, typed, phase, done, instant } = useReveal(s.plain);

  return (
    <section ref={ref} aria-label="Why this score?" className={cn("rounded-card border border-border bg-surface p-4 flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-h3">Why this score?</h3>
        <ScoreBadge score={score} band={band} provisional={provisional} />
      </div>

      {provisional && (
        <p className="text-small text-ink-soft border-l-2 border-accent pl-3">
          Provisional — based on call signals, not yet learned from closed deals.
        </p>
      )}

      {/* Step 1: typewriter. Screen readers get the full sentence straight away. */}
      <p className="sr-only">{s.plain}</p>
      {!done ? (
        <p className="text-body text-ink-soft min-h-[3lh]" aria-hidden="true">
          {s.plain.slice(0, typed)}
          {phase === "typing" && <span className="eq-caret">|</span>}
        </p>
      ) : (
      <p className="text-body text-ink-soft min-h-[3lh]" aria-hidden="true">
        <span className="font-semibold text-ink">{s.head}</span>
        {s.up.length > 0 && (
          <>
            , mainly because of{" "}
            {s.up.map((u, i) => (
              <span key={u}>{i > 0 && " and "}<span className="text-ink font-medium">{u}</span></span>
            ))}
          </>
        )}
        {s.down.length > 0 && <>. Held back by <span className="text-ink font-medium">{s.down[0]}</span></>}.
      </p>
      )}

      <ul className="space-y-2.5" aria-label="Top factors">
          {bars.map((b, i) => {
            const pct = (Math.abs(b.value) / max) * 50; // half the track each side of centre
            const pos = b.value >= 0;
            const delay = i * BAR_STAGGER;
            const land = instant ? { duration: 0 } : { duration: 0.25, delay: delay + BAR_DUR * 0.6 };
            return (
              <li key={b.feature} className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)_2.5rem] items-center gap-3">
                <motion.span
                  className="text-small text-ink truncate"
                  title={b.feature}
                  initial={instant ? false : { opacity: 0 }}
                  animate={{ opacity: done ? 1 : 0 }}
                  transition={land}
                >
                  {b.label}
                </motion.span>
                <span className="relative h-2.5 rounded-pill bg-surface-hover" aria-hidden="true">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <motion.span
                    className={cn("absolute inset-y-0 rounded-pill", pos ? "bg-positive left-1/2" : "bg-negative right-1/2")}
                    style={{ width: `${pct}%`, transformOrigin: pos ? "left" : "right" }}
                    initial={instant ? false : { scaleX: 0 }}
                    animate={{ scaleX: done ? 1 : 0 }}
                    transition={instant ? { duration: 0 } : { duration: BAR_DUR, delay, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <motion.span
                  className={cn("text-small tnum text-right font-medium", pos ? "text-positive" : "text-negative")}
                  initial={instant ? false : { opacity: 0 }}
                  animate={{ opacity: done ? 1 : 0 }}
                  transition={land}
                >
                  {pos ? "+" : "−"}{Math.abs(b.value).toFixed(Math.abs(b.value) % 1 ? 1 : 0)}
                  <span className="sr-only">{pos ? " raised the score" : " lowered the score"}</span>
                </motion.span>
              </li>
            );
          })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <p className="text-small text-ink-muted">{modelVersion} · scored {scoredAt}</p>
        {feedback ? (
          <p className="text-small text-ink-soft" aria-live="polite">
            Thanks — feedback saved{feedback === "wrong" && direction ? ` (too ${direction})` : ""}.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-small text-ink-soft">This score looks</span>
            <FeedbackBtn onClick={() => setFeedback("right")} icon={<ThumbsUp size={14} strokeWidth={1.5} />}>Right</FeedbackBtn>
            <FeedbackBtn onClick={() => setFeedback("wrong")} icon={<ThumbsDown size={14} strokeWidth={1.5} />}>Wrong</FeedbackBtn>
          </div>
        )}
      </div>
      {feedback === "wrong" && !direction && (
        <div className="flex items-center gap-2 -mt-2">
          <span className="text-small text-ink-soft">Is it</span>
          <FeedbackBtn onClick={() => setDirection("high")}>Too high</FeedbackBtn>
          <FeedbackBtn onClick={() => setDirection("low")}>Too low</FeedbackBtn>
        </div>
      )}
    </section>
  );
}

function FeedbackBtn({ children, onClick, icon }: { children: string; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-control border border-border text-small text-ink-soft hover:text-ink hover:bg-surface-hover transition-colors duration-fast"
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
