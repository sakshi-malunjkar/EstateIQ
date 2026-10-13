/**
 * Shared admin types, label sets and formatters. Nothing here is mock data — this is what the screens
 * kept from the old mock.ts once leads started coming from the API (src/api/leads.ts).
 */
import type { City, EnquiryDetails, IntentLabel, LeadStatus, ScoreBand, SentimentLabel, TranscriptTurn } from "@/api/types";

/* ---- label sets (the UI vocabulary; backend values are translated in src/lib/mappings.ts) ---- */
export const SENTIMENT_LABELS: SentimentLabel[] = ["Positive", "Neutral", "Negative"];
export const INTENT_LABELS: IntentLabel[] = ["Buy", "Rent", "Invest", "Schedule visit", "Info", "Other"];

/** Score bands (0–100, Hot ≥ 75, Warm 40–74, Cold < 40). The backend's own `tier` wins when present. */
export const band = (score: number): ScoreBand => (score >= 75 ? "Hot" : score >= 40 ? "Warm" : "Cold");
/** Below this, a sentiment chip shows "low confidence". */
export const SENTIMENT_CONFIDENCE_THRESHOLD = 0.6;

export const MODELS = {
  sentiment: "sentiment classifier",
  scoring: "XGBoost lead-score model",
  /** Scores are trained on bootstrap-heuristic labels until real outcomes exist (see LIMITATIONS.md). */
  provisional: true,
};

export const DAY_MS = 86_400_000;

/* ---- IST (Asia/Kolkata, UTC+5:30, no DST): day boundaries and labels never depend on the browser's zone ---- */
const IST_OFFSET_MS = 19_800_000;
export const startOfDayIST = (t: number) => Math.floor((t + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
export const fmtDayIST = (t: number) =>
  new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
export const hourIST = (t: number) => Math.floor((((t + IST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS / 3_600_000);

/* ---- lead types ---- */
export interface AdminCall {
  id: string;
  at: number;
  /** The backend doesn't record call length yet, so this is 0 and the UI shows "—". */
  durationSec: number;
  sentiment: SentimentLabel;
  confidence: number;
  intent: IntentLabel;
}

export interface AdminLead {
  id: string;
  name: string;
  phone: string;
  projectId: string;
  project: string;
  city: City;
  locality: string;
  score: number;
  band: ScoreBand;
  status: LeadStatus;
  sentiment: SentimentLabel; // latest call
  intent: IntentLabel; // latest call
  budgetLakh: number | null; // null = "Not mentioned" (never guessed)
  createdAt: number;
  lastActivityAt: number;
  statusChangedAt: number;
  /** Earlier-call sentiment, when it differs from the latest (feeds "sentiment shift" events). */
  prevSentiment: SentimentLabel | null;
  calls: AdminCall[];
  /** NER output; only present on a lead loaded with getLead() (the list endpoint doesn't return it). */
  details?: EnquiryDetails;
}

export interface ShapItem { feature: string; label: string; value: number }
export interface LeadInsights {
  details: EnquiryDetails;
  shap: ShapItem[]; // top contributors, signed (points on the 0–100 scale)
  scoredAt: number;
}
export interface CallTranscript {
  turns: TranscriptTurn[];
  highlights: string[];
  metadata: Record<string, unknown>;
}

/** A lead loaded with GET /leads/{id}: the lead plus everything only the detail endpoint returns. */
export interface AdminLeadDetail extends AdminLead {
  details: EnquiryDetails;
  shap: ShapItem[];
  scoredAt: number;
  /** One per entry in `calls`, same order (oldest first). */
  transcripts: CallTranscript[];
  email: string | null;
  /** Whether the sentiment reading came back flagged unreliable by the model. */
  sentimentLowConfidence: boolean;
}

export const EMPTY_DETAILS: EnquiryDetails = {
  bhk: null, budget: null, city: null, locality: null, propertyType: null, amenities: null, furnishing: null,
};

/** Requirements for a lead. Only a lead loaded via getLead() has them; list rows show "Not mentioned". */
export const leadInsights = (l: AdminLead): { details: EnquiryDetails } => ({ details: l.details ?? EMPTY_DETAILS });

/* ---- formatting (Indian) ---- */
export const fmtNum = (n: number) => n.toLocaleString("en-IN");
/** Short ₹ format for budgets in lakh: 65 → "₹65L", 120 → "₹1.2Cr". */
export const fmtLakh = (l: number) => (l >= 100 ? `₹${(l / 100).toFixed(l % 100 === 0 ? 0 : 1)}Cr` : `₹${l}L`);
export const fmtDuration = (s: number) => (s > 0 ? `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s` : "—");
export const fmtAgo = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
};
