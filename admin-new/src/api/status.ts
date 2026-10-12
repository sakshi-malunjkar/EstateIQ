import type { LeadStatus } from "./types";

/**
 * The one lead-status vocabulary (rev 3). Labels, colours and order live here so every badge,
 * filter and dropdown agrees. `dot`/`tone` are token classes (light & dark safe).
 */
export const STATUSES: { id: LeadStatus; label: string; dot: string; tone: string }[] = [
  { id: "not_contacted", label: "Not contacted", dot: "bg-neutral", tone: "bg-neutral/15 border-neutral/40" },
  { id: "contacted", label: "Contacted", dot: "bg-cold", tone: "bg-cold/15 border-cold/40" },
  { id: "call_back", label: "Call back", dot: "bg-warm", tone: "bg-warm/15 border-warm/40" },
  { id: "visit_scheduled", label: "Visit scheduled", dot: "bg-accent", tone: "bg-accent/15 border-accent/50" },
  { id: "converted", label: "Converted", dot: "bg-positive", tone: "bg-positive/15 border-positive/40" },
  { id: "lost", label: "Lost", dot: "bg-negative", tone: "bg-negative/15 border-negative/40" },
];

export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label])) as Record<LeadStatus, string>;
export const statusMeta = (id: LeadStatus) => STATUSES.find((s) => s.id === id)!;
