import type { ReactNode } from "react";
import type { TranscriptTurn } from "@/api/types";

/** Wrap every occurrence of the given entity spans (NER output, §27.3) in a soft highlight. */
function highlight(text: string, spans: string[]): ReactNode {
  const list = spans.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!list.length) return text;
  const esc = list.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // Unicode-aware, no \b — word boundaries aren't reliable across Latin + Devanagari (§27.4).
  const parts = text.split(new RegExp(`(${esc.join("|")})`, "gu"));
  return parts.map((p, i) =>
    list.includes(p) ? (
      // Tint + accent underline: readable on both the neutral and the orange-tinted bubble.
      <mark key={i} className="bg-accent/15 text-ink font-medium rounded-control px-0.5 underline decoration-accent decoration-2 underline-offset-2" title="Extracted entity">{p}</mark>
    ) : (
      p
    ),
  );
}

/**
 * Call rendered as a clean chat — no audio player (audio is never stored, §Principle 2).
 * Client opens the call, so client turns sit left, agent right. The `text` font family
 * carries Devanagari for code-mixed Hindi/Marathi/English; `lang` aids screen readers.
 * `highlights` (optional) marks the NER entity spans that fed the Enquiry details card.
 */
export function Transcript({ turns, youLabel = "You", highlights = [] }: { turns: TranscriptTurn[]; youLabel?: string; highlights?: string[] }) {
  return (
    <div className="eq-transcript flex flex-col gap-2.5 font-text">
      {turns.map((t, i) => {
        const client = t.who === "client";
        return (
          <div key={i} className={`flex ${client ? "justify-start" : "justify-end"}`}>
            <div
              lang={t.lang}
              className={`max-w-[80%] text-body text-ink px-3 py-2 ${
                client
                  ? "bg-surface border border-border rounded-card rounded-bl-sm"
                  : "bg-accent-soft rounded-card rounded-br-sm"
              }`}
            >
              <div className={`text-small mb-0.5 font-sans ${client ? "text-ink-soft" : "text-accent-ink font-medium"}`}>
                {client ? youLabel : "Property assistant"}
              </div>
              {highlight(t.text, highlights)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
