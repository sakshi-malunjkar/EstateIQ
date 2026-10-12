import { CalendarCheck, HelpCircle, Home, KeyRound, LineChart, MessageCircle, type LucideIcon } from "lucide-react";
import type { IntentLabel } from "@/api/types";
import { cn } from "@/lib/utils";

/** 6-class intent (§27.2). Labels are provisional — CONFIRM WITH BACKEND before hardcoding. */
const icon: Record<IntentLabel, LucideIcon> = {
  Buy: Home,
  Rent: KeyRound,
  Invest: LineChart,
  "Schedule visit": CalendarCheck,
  Info: MessageCircle,
  Other: HelpCircle,
};

/** Intent chip — neutral styling: intent is a category, not a judgement (§27.2). INTERNAL. */
export function IntentChip({ intent, className }: { intent: IntentLabel; className?: string }) {
  const Icon = icon[intent];
  return (
    <span className={cn("inline-flex items-center gap-1.5 h-6 px-2.5 rounded-pill border border-border bg-surface text-small text-ink whitespace-nowrap", className)}>
      <Icon size={13} strokeWidth={1.5} className="text-ink-soft" aria-hidden="true" />
      <span className="sr-only">Intent: </span>
      {intent}
    </span>
  );
}
