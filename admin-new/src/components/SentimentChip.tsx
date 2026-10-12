import type { SentimentLabel } from "@/api/types";
import { cn } from "@/lib/utils";

/**
 * UI label ← model class (§27.1). The model is 3-class; these left-hand names are placeholders —
 * CONFIRM WITH BACKEND against the promoted sentiment model before relying on them.
 */
export const SENTIMENT_MODEL_CLASS: Record<SentimentLabel, string> = {
  Positive: "Enthusiastic / Positive", // confirm with backend
  Neutral: "Neutral", // confirm with backend
  Negative: "Frustrated / Hesitant / Negative", // confirm with backend
};

const dot: Record<SentimentLabel, string> = { Positive: "bg-positive", Neutral: "bg-neutral", Negative: "bg-negative" };
const tone: Record<SentimentLabel, string> = {
  Positive: "bg-positive/15 border-positive/40",
  Neutral: "bg-neutral/15 border-neutral/40",
  Negative: "bg-negative/15 border-negative/40",
};

/** Sentiment chip (§8, §27.1). INTERNAL — admin only. Below `threshold` it dims and says so. */
export function SentimentChip({ label, confidence, threshold = 0.6, className }: {
  label: SentimentLabel; confidence?: number; threshold?: number; className?: string;
}) {
  const low = confidence !== undefined && confidence < threshold;
  const pct = confidence !== undefined ? `${Math.round(confidence * 100)}%` : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-pill border text-small text-ink whitespace-nowrap",
        low ? "border-dashed border-border bg-surface text-ink-soft" : tone[label],
        className,
      )}
      title={`${label}${pct ? ` · confidence ${pct}` : ""} · model class: ${SENTIMENT_MODEL_CLASS[label]}`}
    >
      <span className={cn("w-2 h-2 rounded-pill", dot[label], low && "opacity-50")} aria-hidden="true" />
      {label}
      {low && <span className="text-ink-muted">· low confidence</span>}
      {pct && <span className="sr-only">, confidence {pct}</span>}
    </span>
  );
}
