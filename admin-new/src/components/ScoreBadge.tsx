import type { ScoreBand } from "@/api/types";
import { cn } from "@/lib/utils";

const tone: Record<ScoreBand, string> = {
  Hot: "bg-hot/15 text-ink border-hot/40",
  Warm: "bg-warm/15 text-ink border-warm/40",
  Cold: "bg-cold/15 text-ink border-cold/40",
};
const dot: Record<ScoreBand, string> = { Hot: "bg-hot", Warm: "bg-warm", Cold: "bg-cold" };

/**
 * Lead score 0–100 + band (§8, §13). INTERNAL — admin only.
 * `provisional` (§26.4) adds a hollow marker: score is from the cold-start heuristic.
 */
export function ScoreBadge({ score, band, provisional = false, showBand = true, showScore = true, className }: {
  score: number; band: ScoreBand; provisional?: boolean; showBand?: boolean; showScore?: boolean; className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 h-6 px-2 rounded-pill border text-small font-semibold tnum", tone[band], className)}
      title={provisional ? "Provisional — based on call signals, not yet learned from closed deals" : undefined}
    >
      <span className={cn("w-2 h-2 rounded-pill", dot[band])} aria-hidden="true" />
      {showScore && score}
      {showBand && <span className="font-medium">{band}</span>}
      {provisional && (
        <>
          <span className="w-1.5 h-1.5 rounded-pill border border-ink-soft" aria-hidden="true" />
          <span className="sr-only">(provisional)</span>
        </>
      )}
    </span>
  );
}
