/**
 * Admin mock data (no backend yet). Deterministic: a seeded generator builds ~180 leads over the
 * last 60 days so every range (and its previous period) has data, and every KPI/chart on the
 * Overview is DERIVED from this one array — numbers always agree (hot + warm + cold = leads).
 */
import { useSyncExternalStore } from "react";
import type { City, EnquiryDetails, IntentLabel, LeadStatus, ScoreBand, SentimentLabel, TranscriptTurn } from "@/api/types";
import { PROJECTS } from "@/api/mock";

/* ---- Label sets — CONFIRM WITH BACKEND before hardcoding (§27.1, §27.2) ---- */
/** 3-class sentiment. Left = model class (placeholder), right = UI label. */
export const SENTIMENT_LABELS: SentimentLabel[] = ["Positive", "Neutral", "Negative"]; // confirm with backend
/** 6-class intent. */
export const INTENT_LABELS: IntentLabel[] = ["Buy", "Rent", "Invest", "Schedule visit", "Info", "Other"]; // confirm with backend

/** Score bands (§13: 0–100, Hot ≥ 75, Warm 40–74, Cold < 40 — editable in Settings later). */
export const band = (score: number): ScoreBand => (score >= 75 ? "Hot" : score >= 40 ? "Warm" : "Cold");
/** Below this, a sentiment chip shows "low confidence" (§11.9, §27.1). */
export const SENTIMENT_CONFIDENCE_THRESHOLD = 0.6;

export const MODELS = {
  sentiment: "sentiment-v0.3 (mock)",
  scoring: "lead-score-heuristic-v0 (mock)",
  /** §26.4: cold start — scores come from the bootstrap heuristic until the readiness gate is met. */
  provisional: true,
};

/** Fixed "now" so the mock is stable across reloads. */
export const NOW = new Date("2026-10-11T18:00:00+05:30").getTime();
const DAY = 86_400_000;

export interface AdminCall {
  id: string;
  at: number;
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
}

/* ---- seeded PRNG (mulberry32) ---- */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(20261011);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const weighted = <T,>(xs: readonly [T, number][]) => {
  let x = r() * xs.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of xs) { if ((x -= w) < 0) return v; }
  return xs[xs.length - 1][0];
};

const FIRST = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Pooja", "Rohan", "Anjali", "Sachin", "Neha", "Aniket", "Shruti", "Kunal", "Meera", "Omkar", "Tejas", "Aditi", "Prasad", "Kavya", "Nikhil", "Swati", "Harsh", "Gauri", "Yash"];
const LAST = ["Deshpande", "Kulkarni", "Patil", "Joshi", "Shinde", "Pawar", "Jadhav", "Gaikwad", "Bhosale", "Mehta", "Sharma", "Kale", "Wagh", "Chavan", "Rane", "Gokhale", "Agarwal", "Thakur"];

/**
 * Converted share per score band — tuned so the analytics validate the scoring model.
 * Applied after generation as an exact quota (round(share × band size)), picked by an independent
 * per-lead roll among settled (2+ day old) leads. It only moves leads into / out of "converted",
 * so bands, cities, scores, calls and every other field stay exactly as generated.
 */
const CONVERT_SHARE: Record<ScoreBand, number> = { Hot: 0.25, Warm: 0.1, Cold: 0.03 };
const convRoll = (id: string) => {
  let h = 2166136261;
  for (const ch of `${id}:conv`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  // Avalanche the hash (ids differ by one digit) and skip the first draw so rolls spread evenly.
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16;
  const r = rng(h >>> 0);
  r();
  return r();
};

const N = 180;
export const LEADS: AdminLead[] = Array.from({ length: N }, (_, i) => {
  const city: City = r() < 0.6 ? "Nashik" : "Pune";
  const proj = pick(PROJECTS.filter((p) => p.city === city));
  // More recent days get slightly more leads (a growing funnel).
  const createdAt = NOW - Math.floor(Math.pow(r(), 1.25) * 60 * DAY) - Math.floor(r() * 10 * 3_600_000);
  const intent = weighted<IntentLabel>([["Buy", 34], ["Schedule visit", 20], ["Info", 18], ["Invest", 12], ["Rent", 10], ["Other", 6]]);
  const sentiment = weighted<SentimentLabel>([["Positive", 45], ["Neutral", 35], ["Negative", 20]]);
  const budgetLakh = r() < 0.18 ? null : city === "Pune" ? Math.round(55 + r() * 110) : Math.round(32 + r() * 95);
  // Score loosely follows the signals so the bands feel plausible.
  let score = 14 + r() * 56;
  if (intent === "Schedule visit" || intent === "Buy") score += 18;
  if (sentiment === "Positive") score += 10;
  if (sentiment === "Negative") score -= 15;
  if (budgetLakh !== null) score += 6;
  score = Math.max(5, Math.min(98, Math.round(score)));

  const age = NOW - createdAt;
  const status: LeadStatus =
    age < 2 * DAY ? weighted<LeadStatus>([["not_contacted", 80], ["contacted", 12], ["call_back", 8]])
    : weighted<LeadStatus>([
      ["not_contacted", 18], ["contacted", 30], ["call_back", 12],
      ["visit_scheduled", intent === "Schedule visit" ? 20 : 8], ["converted", score >= 70 ? 16 : 5], ["lost", 14],
    ]);
  const statusChangedAt = status === "not_contacted" ? createdAt : Math.min(NOW, createdAt + Math.floor(r() * Math.min(age, 10 * DAY)));
  const nCalls = r() < 0.3 ? 2 : r() < 0.08 ? 3 : 1;
  const calls: AdminCall[] = Array.from({ length: nCalls }, (_, c) => ({
    id: `c${i}-${c}`,
    at: c === 0 ? createdAt : Math.min(NOW, createdAt + Math.floor(r() * Math.min(age, 7 * DAY))),
    durationSec: Math.round(70 + r() * 420),
    sentiment: c === nCalls - 1 ? sentiment : pick(SENTIMENT_LABELS),
    confidence: Math.round((0.42 + r() * 0.56) * 100) / 100,
    intent: c === nCalls - 1 ? intent : pick(INTENT_LABELS),
  })).sort((a, b) => a.at - b.at);
  const prevSentiment = calls.length > 1 && calls[calls.length - 2].sentiment !== sentiment ? calls[calls.length - 2].sentiment : null;
  const lastActivityAt = Math.max(statusChangedAt, calls[calls.length - 1].at);
  const digits = `${pick(["98", "97", "96", "88", "77", "70", "93", "90"])}${String(Math.floor(r() * 1e8)).padStart(8, "0")}`;

  return {
    id: `L${1000 + i}`,
    name: `${pick(FIRST)} ${pick(LAST)}`,
    phone: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
    projectId: proj.id,
    project: proj.name,
    city,
    locality: proj.locality,
    score,
    band: band(score),
    status,
    sentiment,
    intent,
    budgetLakh,
    createdAt,
    lastActivityAt,
    statusChangedAt,
    prevSentiment,
    calls,
  };
});

// Quota per band, applied separately to the last 30 days and to older leads, so the default
// 30-day Analytics view and the all-time numbers both land on the target shares.
const recent = (l: AdminLead) => NOW - l.createdAt < 30 * DAY;
for (const b of ["Hot", "Warm", "Cold"] as ScoreBand[]) {
  for (const inWindow of [true, false]) {
    const group = LEADS.filter((l) => l.band === b && recent(l) === inWindow);
    const settled = group.filter((l) => NOW - l.createdAt >= 2 * DAY).sort((x, y) => convRoll(x.id) - convRoll(y.id));
    const quota = Math.round(CONVERT_SHARE[b] * group.length);
    settled.forEach((l, k) => {
      if (k < quota) l.status = "converted";
      else if (l.status === "converted") l.status = "visit_scheduled";
    });
  }
}

/* ---- formatting (Indian) ---- */
export const fmtNum = (n: number) => n.toLocaleString("en-IN");
/** Short ₹ format for budgets in lakh: 65 → "₹65L", 120 → "₹1.2Cr". */
export const fmtLakh = (l: number) => (l >= 100 ? `₹${(l / 100).toFixed(l % 100 === 0 ? 0 : 1)}Cr` : `₹${l}L`);
export const fmtDuration = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
export const fmtAgo = (t: number) => {
  const m = Math.round((NOW - t) / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
};
export const DAY_MS = DAY;

/* ---- Shared, live lead state (mock store; swap for API mutations + refetch later) ---- */

let current: AdminLead[] = LEADS;
const listeners = new Set<() => void>();

/** Every screen reads leads through this, so a status change shows up everywhere at once. */
export function useLeads(): AdminLead[] {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    () => current,
  );
}

/** Update one lead's status (mock "PATCH /leads/:id"). Touches activity time so derived sets stay right. */
export function setLeadStatus(id: string, status: LeadStatus) {
  const at = Date.now() > NOW ? NOW : Date.now();
  current = current.map((l) => (l.id === id ? { ...l, status, statusChangedAt: at, lastActivityAt: at } : l));
  listeners.forEach((fn) => fn());
}

/* ---- Per-lead AI outputs (mock): extracted requirements + SHAP. Deterministic per lead id, and
   derived from the lead's own signals so the card, the score and the "why" always agree. ---- */

export interface ShapItem { feature: string; label: string; value: number }
export interface LeadInsights {
  details: EnquiryDetails;
  shap: ShapItem[]; // top contributors, signed (points on the 0–100 scale)
  scoredAt: number;
}

const hash = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

/** "₹ 65 L" / "₹ 1.2 Cr" (DESIGN §27.3 card format). */
export const fmtBudget = (l: number) => (l >= 100 ? `₹ ${(l / 100).toFixed(l % 100 === 0 ? 0 : 1)} Cr` : `₹ ${l} L`);

/** Areas callers mention (NER location spans), per city. */
const AREAS: Record<City, string[]> = {
  Nashik: ["Gangapur Road", "College Road", "Indira Nagar", "Panchavati", "Nashik Road", "Satpur", "CIDCO", "Deolali Camp", "Ashok Stambh"],
  Pune: ["Baner", "Aundh", "Wakad", "Hinjewadi", "Kharadi", "Viman Nagar", "Kothrud", "Hadapsar", "Bavdhan"],
};

export function leadInsights(l: AdminLead): LeadInsights {
  const rr = rng(hash(l.id));
  const proj = PROJECTS.find((p) => p.id === l.projectId)!;
  const maybe = <T,>(v: T, p: number) => (rr() < p ? v : null);
  const bhk = maybe(`${rr() < 0.55 ? 2 : rr() < 0.7 ? 3 : 1} BHK`, 0.8);
  const propertyType = maybe(rr() < 0.85 ? "Apartment" : "Villa", 0.7);
  const amenityList = proj.features.filter(() => rr() < 0.45);
  const details: EnquiryDetails = {
    bhk,
    budget: l.budgetLakh === null ? null : fmtBudget(l.budgetLakh),
    city: l.city,
    // Callers often name the project's own area, sometimes a nearby one they'd also consider.
    locality: maybe(rr() < 0.55 ? l.locality : AREAS[l.city][Math.floor(rr() * AREAS[l.city].length)], 0.8),
    propertyType,
    amenities: amenityList.length ? amenityList.join(", ") : null,
    furnishing: maybe((["Semi-furnished", "Unfurnished", "Fully furnished"] as const)[Math.floor(rr() * 3)], 0.35),
  };

  const s: ShapItem[] = [];
  const add = (feature: string, label: string, value: number) => s.push({ feature, label, value });
  if (l.intent === "Schedule visit") add("intent=schedule_visit", "Asked to visit", 12);
  else if (l.intent === "Buy") add("intent=buy", "Wants to buy (not just browsing)", 10);
  else if (l.intent === "Invest") add("intent=invest", "Looking to invest", 5);
  else add(`intent=${l.intent.toLowerCase()}`, l.intent === "Rent" ? "Wants to rent, not buy" : "Only asking for information", -5);
  if (l.sentiment === "Positive") add("sentiment=positive", "Positive tone on the call", 8);
  else if (l.sentiment === "Negative") add("sentiment=negative", "Hesitant / frustrated tone", -10);
  else add("sentiment=neutral", "Neutral tone", -1);
  if (l.budgetLakh !== null) add("budget_mentioned", l.budgetLakh >= 100 ? `High budget (${fmtBudget(l.budgetLakh)})` : "Shared a clear budget", l.budgetLakh >= 100 ? 9 : 7);
  else add("budget_mentioned=false", "No budget shared", -6);
  if (l.calls.length > 1) add("num_calls>1", "Called more than once", 5);
  add(propertyType && bhk ? "property_type_specified" : "property_type_missing", propertyType && bhk ? "Knew exactly what they wanted" : "Requirements still vague", propertyType && bhk ? 4 : -3);
  if (amenityList.length >= 2) add("amenities_count", "Detailed requirements", 3);
  add(`city=${l.city.toLowerCase()}`, `City: ${l.city}`, l.city === "Pune" ? 1.5 : 1);

  return {
    details,
    shap: s.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 5),
    scoredAt: l.calls[l.calls.length - 1].at + 4 * 60_000, // pipeline finishes a few minutes after the call
  };
}

/* ---- Per-call transcript + call_metadata (mock). Client speaks first; Hinglish / code-mixed.
   `highlights` are the exact spans the NER step extracted, so the card and the chat agree. ---- */
export interface CallTranscript {
  turns: TranscriptTurn[];
  highlights: string[];
  metadata: Record<string, unknown>;
}

export function callTranscript(l: AdminLead, callIndex: number): CallTranscript {
  const call = l.calls[callIndex];
  const rr = rng(hash(call.id));
  const d = leadInsights(l).details;
  const hl: string[] = [];
  const say = (span: string | null) => { if (span) hl.push(span); return span; };
  const t: TranscriptTurn[] = [];
  const C = (text: string, lang = "en-IN") => t.push({ who: "client", text, lang });
  const A = (text: string) => t.push({ who: "agent", text, lang: "en-IN" });

  if (callIndex === 0) {
    C(`Hello, mujhe ${say(l.project)} ke baare mein jaankari chahiye.`);
    A(`Namaste! ${l.project} is in ${l.locality}, ${l.city}. What kind of home are you looking for?`);
    const bits = [say(d.bhk), say(d.propertyType)].filter(Boolean).join(" ");
    C(bits ? `Mujhe ${bits} chahiye${d.locality ? `, ${say(d.locality)} side mein` : ""}.` : "Abhi exact decide nahi kiya, options dekhna hai.");
    A("Sure. Do you have a budget range in mind?");
    if (l.budgetLakh !== null) {
      const spoken = l.budgetLakh >= 100 ? `${(l.budgetLakh / 100).toFixed(1)} crore` : `${l.budgetLakh} lakh`;
      C(`Budget around ${say(spoken)} hai, thoda flexible.`);
    } else {
      C("Budget abhi fix nahi hai, pehle price dekh lete hain.");
    }
    if (d.amenities) C(`${say(d.amenities)} hona chahiye, family ke liye important hai.`);
    if (d.furnishing) C(`Aur ${say(d.furnishing)} prefer karenge.`);
    A(`Got it. I've found a few units at ${l.project} that match.`);
  } else {
    C(`Hello, maine pehle ${say(l.project)} ke liye call kiya tha. Kuch update hai?`);
    A("Welcome back! Yes — a couple of units matching your requirements are still available.");
  }

  if (call.intent === "Schedule visit") { C(`Kya main ${say("is Saturday")} site visit kar sakta hoon?`); A("Of course. I'll note a site visit for Saturday and the team will confirm."); }
  else if (call.intent === "Buy") { C("Booking ka process kya hai? Hum jaldi lena chahte hain."); A("The team will share the booking steps and payment plan with you."); }
  else if (call.intent === "Invest") { C("Rental yield kitna milega? Investment ke liye dekh raha hoon."); A("Rental demand here is steady; the team can share recent numbers."); }
  else if (call.intent === "Rent") { C("Kya rent pe bhi milega?"); A("These are for sale, but I can ask the team about rental options nearby."); }
  else { C("Theek hai, abhi bas information chahiye thi."); A("No problem — I'll send the details to your number."); }

  if (call.sentiment === "Negative") C("Price thoda zyada lag raha hai, sochna padega.");
  else if (call.sentiment === "Positive") C("बहुत बढ़िया, धन्यवाद!", "hi-IN");
  else C("Okay, thank you.");
  A("Thank you for calling. Have a good day!");

  return {
    turns: t,
    highlights: hl,
    metadata: {
      vapi_call_id: `call_${call.id}_${Math.floor(rr() * 1e6).toString(36)}`,
      ended_reason: rr() < 0.85 ? "customer-ended-call" : "assistant-ended-call",
      language_detected: call.sentiment === "Positive" ? "hi-en (code-mixed)" : "en-IN",
      tool_calls: [
        { name: "searchProperties", args: { city: l.city, project: l.project, bhk: d.bhk, budget_max_lakh: l.budgetLakh } },
        ...(call.intent === "Schedule visit" ? [{ name: "requestSiteVisit", args: { project: l.project, preferred_day: "Saturday" } }] : []),
      ],
      pipeline: { ner: "done", sentiment: MODELS.sentiment, scoring: MODELS.scoring },
    },
  };
}
