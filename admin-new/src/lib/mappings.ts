/**
 * Backend ↔ frontend mapping layer. The backend (api/main.py, api/models.py) is the source of truth
 * and is not changed; everything the UI needs in a different vocabulary or shape is translated here.
 *
 * Real backend vocabularies (verified in the repo, not assumed):
 *  - status:    new | contacted | qualified | won | lost                (app/lead_scoring/models.py)
 *  - sentiment: enthusiastic | hesitant | frustrated                    (app/lead_scoring/heuristic.py)
 *  - intent:    Buy | Inquiry | Investment | Rent | Request Callback | Schedule Visit
 *                                                                       (models_artifacts/intent/config.json)
 *  - tier:      hot | warm | cold, score 0–100                          (heuristic.score_to_tier)
 */
import type { City, EnquiryDetails, IntentLabel, LeadStatus, ScoreBand, SentimentLabel, TranscriptTurn } from "@/api/types";
import type { AdminCall, AdminLead, AdminLeadDetail, CallTranscript, ShapItem } from "@/admin/format";

/* ------------------------------------------------------------------ status */

const STATUS_FROM_BACKEND: Record<string, LeadStatus> = {
  new: "not_contacted",
  contacted: "contacted",
  qualified: "visit_scheduled",
  won: "converted",
  lost: "lost",
};

/**
 * `call_back` has no backend value, so it is saved as `contacted` and comes back as `contacted` after a
 * reload. Extending the DB enum would remove that loss; until then it is a known limitation.
 */
const STATUS_TO_BACKEND: Record<LeadStatus, string> = {
  not_contacted: "new",
  contacted: "contacted",
  call_back: "contacted",
  visit_scheduled: "qualified",
  converted: "won",
  lost: "lost",
};

export const statusBackendToFrontend = (s: string | null | undefined): LeadStatus =>
  STATUS_FROM_BACKEND[(s ?? "").trim().toLowerCase()] ?? "not_contacted";

export const statusFrontendToBackend = (s: LeadStatus): string => STATUS_TO_BACKEND[s];

/* --------------------------------------------------------------- sentiment */

const SENTIMENT_FROM_BACKEND: Record<string, SentimentLabel> = {
  enthusiastic: "Positive",
  hesitant: "Neutral",
  frustrated: "Negative",
  // tolerate a model/version that already speaks the UI vocabulary
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

const SENTIMENT_TO_BACKEND: Record<SentimentLabel, string> = {
  Positive: "enthusiastic",
  Neutral: "hesitant",
  Negative: "frustrated",
};

/** A missing sentiment is shown as Neutral (the UI has no "unknown" chip). */
export const sentimentBackendToFrontend = (s: string | null | undefined): SentimentLabel =>
  SENTIMENT_FROM_BACKEND[(s ?? "").trim().toLowerCase()] ?? "Neutral";

/** For the `GET /leads?sentiment=` filter. */
export const sentimentFrontendToBackend = (s: SentimentLabel): string => SENTIMENT_TO_BACKEND[s];

/* ------------------------------------------------------------------ intent */

const INTENT_FROM_BACKEND: Record<string, IntentLabel> = {
  buy: "Buy",
  rent: "Rent",
  investment: "Invest",
  invest: "Invest",
  "schedule visit": "Schedule visit",
  inquiry: "Info",
  info: "Info",
  // The UI has no callback intent, so it lands in "Other".
  "request callback": "Other",
};

/** `Other` is lossy in the other direction: it filters on "Request Callback", the only unmapped class. */
const INTENT_TO_BACKEND: Record<IntentLabel, string> = {
  Buy: "Buy",
  Rent: "Rent",
  Invest: "Investment",
  "Schedule visit": "Schedule Visit",
  Info: "Inquiry",
  Other: "Request Callback",
};

export const intentBackendToFrontend = (s: string | null | undefined): IntentLabel =>
  INTENT_FROM_BACKEND[(s ?? "").trim().toLowerCase()] ?? "Other";

/** For the `GET /leads?intent=` filter. */
export const intentFrontendToBackend = (s: IntentLabel): string => INTENT_TO_BACKEND[s];

/* -------------------------------------------------------------- score band */

const BAND_FROM_TIER: Record<string, ScoreBand> = { hot: "Hot", warm: "Warm", cold: "Cold" };

/** Prefer the backend's own tier (so the UI never disagrees with the model); fall back to the score. */
export const bandFromTier = (tier: string | null | undefined, score: number): ScoreBand =>
  BAND_FROM_TIER[(tier ?? "").trim().toLowerCase()] ?? (score >= 75 ? "Hot" : score >= 40 ? "Warm" : "Cold");

/* ------------------------------------------------------------------- SHAP */

/** Human labels for the 7 lead-scoring features (models_artifacts/lead_scoring/feature_columns.json). */
const SHAP_LABELS: Record<string, string> = {
  sentiment: "Tone of the call",
  sentiment_confidence: "How sure the tone reading is",
  entity_completeness: "How complete their requirements were",
  amenities_count: "Amenities they asked for",
  budget_amount: "Budget they shared",
  turn_count: "Length of the conversation",
  message_length: "How much they said",
};

const humanize = (f: string) => {
  const t = f.replace(/_/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** `{feature: value}` → `[{feature, label, value}]`, largest effect first. Zero-effect features are dropped. */
export function adaptShap(shapValues: Record<string, number> | null | undefined, limit = 5): ShapItem[] {
  return Object.entries(shapValues ?? {})
    .filter(([, v]) => Number.isFinite(v) && Math.abs(v) >= 0.005)
    .map(([feature, value]) => ({ feature, label: SHAP_LABELS[feature] ?? humanize(feature), value: Math.round(value * 100) / 100 }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}

/* ---------------------------------------------------- backend response types */

export interface BackendNer {
  location: string[];
  property_type: string[];
  amenities: string[];
  budget: string | null;
}
interface BackendLabelled { label: string | null; confidence: number | null; reliability: string }

/** `GET /leads` item (api/models.py LeadSummary). */
export interface BackendLeadSummary {
  id: number;
  name: string | null;
  contact_phone: string | null;
  current_status: string;
  score: number | null;
  tier: string | null;
  sentiment: string | null;
  intent: string | null;
  call_count: number;
  extracted_city?: string | null;
  form_city?: string | null;
  ner?: BackendNer | null;
  created_at: string;
  updated_at: string;
}

export interface BackendCallHistoryItem {
  transcript_id: number;
  created_at: string;
  source: string;
  city: string | null;
  transcript: string;
  score: number | null;
  tier: string | null;
  sentiment: string | null;
  intent: string | null;
}

/** `GET /leads/{id}` (api/models.py LeadDetail). */
export interface BackendLeadDetail {
  id: number;
  name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  current_status: string;
  created_at: string;
  updated_at: string;
  transcript: string | null;
  ner: BackendNer | null;
  sentiment: BackendLabelled | null;
  intent: BackendLabelled | null;
  lead_score: { score: number; tier: string; shap_values: Record<string, number>; sentiment_reliability: string } | null;
  call_count: number;
  call_history: BackendCallHistoryItem[];
  status_history: { status_from: string | null; status_to: string; lost_reason: string | null; notes: string | null; changed_at: string }[];
}

export type BackendLead = BackendLeadSummary | BackendLeadDetail;
const isDetail = (l: BackendLead): l is BackendLeadDetail => "call_history" in l;

/* ------------------------------------------------------------------ helpers */

/** ISO string → epoch ms. The API emits naive UTC timestamps, so a missing offset means UTC. */
export function toMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * "60 lakhs" → 60, "1.2 crore" → 120, "50-60 L" → 60 (upper bound), "₹ 85 L" → 85.
 * Anything else (including a bare number, which could be rupees or lakh) → null = "Not mentioned".
 */
export function parseBudgetLakh(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/,/g, "");
  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (!nums) return null;
  const n = Math.max(...nums.map(Number));
  if (/\b(cr|crore|crores)\b/.test(s)) return Math.round(n * 100 * 100) / 100;
  if (/\b(l|lac|lacs|lakh|lakhs|lakhs)\b/.test(s)) return n;
  return null;
}

const CITIES: City[] = ["Nashik", "Pune"];
/** The app only serves Nashik and Pune. When the backend has no city for a lead we assume the first. */
export const DEFAULT_CITY: City = "Nashik";
const asCity = (...cands: (string | null | undefined)[]): City => {
  for (const c of cands) {
    const hit = CITIES.find((x) => (c ?? "").toLowerCase().includes(x.toLowerCase()));
    if (hit) return hit;
  }
  return DEFAULT_CITY;
};

/* ------------------------------------------------------- enquiry + transcript */

const joinOrNull = (xs: string[] | undefined) => (xs && xs.length ? xs.join(", ") : null);

/** NER output → the "Enquiry details" card. Fields the NER model doesn't produce stay null ("Not mentioned"). */
export function adaptEnquiry(ner: BackendNer | null | undefined, cityHint?: string | null): EnquiryDetails {
  const locs = ner?.location ?? [];
  const city = locs.find((l) => CITIES.some((c) => l.toLowerCase() === c.toLowerCase())) ?? cityHint ?? null;
  const locality = locs.filter((l) => l !== city).join(", ") || null;
  const ptype = ner?.property_type ?? [];
  const bhk = ptype.find((p) => /bhk|\brk\b/i.test(p)) ?? null;
  const propertyType = ptype.filter((p) => p !== bhk).join(", ") || null;
  const budgetLakh = parseBudgetLakh(ner?.budget);
  return {
    bhk,
    budget: budgetLakh == null ? ner?.budget ?? null : budgetLakh >= 100 ? `₹ ${+(budgetLakh / 100).toFixed(2)} Cr` : `₹ ${budgetLakh} L`,
    city,
    locality,
    propertyType,
    amenities: joinOrNull(ner?.amenities),
    furnishing: null, // not extracted by the NER model
  };
}

/** Raw "Agent: … / Client: …" transcript → chat turns. Unprefixed lines continue the previous turn. */
export function parseTranscript(raw: string | null | undefined): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  for (const line of (raw ?? "").split(/\r?\n/)) {
    const m = /^\s*(agent|client|ai|assistant|bot|user|customer)\s*:\s*(.*)$/i.exec(line);
    if (m) turns.push({ who: /^(agent|ai|assistant|bot)$/i.test(m[1]) ? "agent" : "client", text: m[2].trim() });
    else if (line.trim() && turns.length) turns[turns.length - 1].text += ` ${line.trim()}`;
    else if (line.trim()) turns.push({ who: "client", text: line.trim() });
  }
  return turns;
}

/* ------------------------------------------------------------------- lead */

/**
 * Backend lead (list item or full detail) → the `AdminLead` the screens consume.
 *
 * Not in the backend, so defaulted: `projectId`/`project`/`locality` (no lead→project link yet; locality
 * comes from NER when the detail is loaded), call `durationSec` (0), and `prevSentiment` for list items.
 * A list item carries no call history, so it gets one synthetic call built from the lead's latest values.
 */
export function adaptLead(b: BackendLead): AdminLead {
  const detail = isDetail(b) ? b : null;
  const score = detail ? detail.lead_score?.score ?? 0 : (b as BackendLeadSummary).score ?? 0;
  const tier = detail ? detail.lead_score?.tier : (b as BackendLeadSummary).tier;
  const sentiment = sentimentBackendToFrontend(detail ? detail.sentiment?.label : (b as BackendLeadSummary).sentiment);
  const intent = intentBackendToFrontend(detail ? detail.intent?.label : (b as BackendLeadSummary).intent);
  const confidence = detail?.sentiment?.confidence ?? null;

  const createdAt = toMs(b.created_at);
  const lastActivityAt = toMs(b.updated_at) || createdAt;
  const lastStatusEvent = detail?.status_history.length ? detail.status_history[detail.status_history.length - 1] : null;

  // the API returns call_history newest-first (api/crud.py); the UI wants oldest→newest
  const history = [...(detail?.call_history ?? [])].sort((a, b) => toMs(a.created_at) - toMs(b.created_at));
  const calls: AdminCall[] = history.length
    ? history.map((c) => ({
        id: String(c.transcript_id),
        at: toMs(c.created_at),
        durationSec: 0, // the backend doesn't record call length
        sentiment: sentimentBackendToFrontend(c.sentiment),
        // only the latest call's confidence is returned; earlier calls reuse it rather than showing "low confidence"
        confidence: confidence ?? 1,
        intent: intentBackendToFrontend(c.intent),
      }))
    : [{ id: `${b.id}-latest`, at: createdAt || lastActivityAt, durationSec: 0, sentiment, confidence: confidence ?? 1, intent }];

  // sentiment of the call before the latest, for the "sentiment shift" events
  const prev = calls.length > 1 ? calls[calls.length - 2].sentiment : null;

  const ner = detail ? detail.ner : (b as BackendLeadSummary).ner;
  const budgetLakh = parseBudgetLakh(ner?.budget);
  const cityHint = history.map((c) => c.city).find(Boolean) ?? null;
  // List rows: NLP-extracted city first, the Vapi form city only when NLP found none.
  const listCity = detail ? null : (b as BackendLeadSummary).extracted_city?.trim() || (b as BackendLeadSummary).form_city?.trim() || null;

  return {
    id: String(b.id),
    name: b.name?.trim() || "Unknown caller",
    phone: b.contact_phone ?? "",
    projectId: "",
    project: "—",
    city: asCity(listCity ?? cityHint, ...(ner?.location ?? [])),
    locality: ner?.location?.find((l) => !CITIES.some((c) => c.toLowerCase() === l.toLowerCase())) ?? "—",
    score,
    band: bandFromTier(tier, score),
    status: statusBackendToFrontend(b.current_status),
    sentiment,
    intent,
    budgetLakh,
    createdAt,
    lastActivityAt,
    statusChangedAt: lastStatusEvent ? toMs(lastStatusEvent.changed_at) : lastActivityAt,
    prevSentiment: prev && prev !== sentiment ? prev : null,
    calls,
    ...(ner ? { details: adaptEnquiry(ner, cityHint) } : {}),
  };
}

/** True when the sentiment reading is unreliable (backend `reliability: "low"` or no confidence returned). */
export const sentimentIsLowConfidence = (s: BackendLabelled | null | undefined) =>
  !s || s.confidence == null || s.reliability === "low";

/* ------------------------------------------------------------ lead detail */

/** `GET /leads/{id}` → the lead plus enquiry details, SHAP bars and one transcript per call. */
export function adaptLeadDetail(b: BackendLeadDetail): AdminLeadDetail {
  const lead = adaptLead(b);
  const history = [...b.call_history].sort((x, y) => toMs(x.created_at) - toMs(y.created_at));
  // No per-call transcript on a lead with no history: fall back to the latest transcript on the lead itself.
  const raws = history.length ? history.map((h) => h.transcript) : [b.transcript];
  const transcripts: CallTranscript[] = raws.map((raw, i) => ({
    turns: parseTranscript(raw),
    highlights: i === raws.length - 1 ? nerHighlights(b.ner) : [], // NER ran on the latest call
    metadata: {
      transcript_id: history[i]?.transcript_id ?? null,
      source: history[i]?.source ?? null,
      city: history[i]?.city ?? null,
      score: history[i]?.score ?? null,
      tier: history[i]?.tier ?? null,
    },
  }));
  const scored = b.lead_score;
  return {
    ...lead,
    details: lead.details ?? adaptEnquiry(b.ner),
    shap: adaptShap(scored?.shap_values),
    // the API doesn't return a scored-at time; the latest call is the closest honest value
    scoredAt: lead.calls[lead.calls.length - 1]?.at ?? lead.lastActivityAt,
    transcripts,
    email: b.contact_email,
    sentimentLowConfidence: sentimentIsLowConfidence(b.sentiment) || scored?.sentiment_reliability === "low",
  };
}

/** The exact spans the NER step extracted, for highlighting inside the transcript. */
const nerHighlights = (ner: BackendNer | null | undefined): string[] =>
  ner ? [...ner.location, ...ner.property_type, ...ner.amenities, ...(ner.budget ? [ner.budget] : [])].filter(Boolean) : [];

/* --------------------------------------------------------------- analytics */

/** `GET /analytics` (api/models.py AnalyticsResponse). `conversion_rate` is a percentage, 0–100. */
export interface BackendAnalytics {
  total_leads: number;
  hot_count: number;
  warm_count: number;
  cold_count: number;
  sentiment_distribution: Record<string, number>;
  intent_distribution: Record<string, number>;
  avg_score: number | null;
  conversion_rate: number;
}

export interface Analytics {
  totalLeads: number;
  hot: number;
  warm: number;
  cold: number;
  sentiment: Record<SentimentLabel, number>;
  intent: Record<IntentLabel, number>;
  avgScore: number | null;
  /** 0–1, like the rest of the UI (the API sends 0–100). */
  conversionRate: number;
}

export function adaptAnalytics(b: BackendAnalytics): Analytics {
  const sentiment: Record<SentimentLabel, number> = { Positive: 0, Neutral: 0, Negative: 0 };
  for (const [k, v] of Object.entries(b.sentiment_distribution ?? {})) sentiment[sentimentBackendToFrontend(k)] += v;
  const intent: Record<IntentLabel, number> = { Buy: 0, Rent: 0, Invest: 0, "Schedule visit": 0, Info: 0, Other: 0 };
  for (const [k, v] of Object.entries(b.intent_distribution ?? {})) intent[intentBackendToFrontend(k)] += v;
  return {
    totalLeads: b.total_leads,
    hot: b.hot_count,
    warm: b.warm_count,
    cold: b.cold_count,
    sentiment,
    intent,
    avgScore: b.avg_score,
    conversionRate: (b.conversion_rate ?? 0) / 100,
  };
}
