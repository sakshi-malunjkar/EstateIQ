import { apiFetch } from "./http";
import type { IntentLabel, LeadStatus, ScoreBand, SentimentLabel } from "./types";
import type { AdminLead, AdminLeadDetail } from "@/admin/format";
import {
  adaptAnalytics, adaptLead, adaptLeadDetail, intentFrontendToBackend, sentimentFrontendToBackend, statusBackendToFrontend, statusFrontendToBackend,
  type Analytics, type BackendAnalytics, type BackendLeadDetail, type BackendLeadSummary,
} from "@/lib/mappings";

/** The backend caps `limit` at 200. */
export const MAX_PAGE = 200;

export interface LeadFilters {
  tier?: ScoreBand;
  sentiment?: SentimentLabel;
  intent?: IntentLabel;
  limit?: number;
  skip?: number;
}

export interface LeadsPage { leads: AdminLead[]; total: number; limit: number; skip: number }

/** GET /leads — one page, plus the server's total so callers can tell when the list is truncated. */
export async function getLeadsPage(filters: LeadFilters = {}): Promise<LeadsPage> {
  const qs = new URLSearchParams();
  if (filters.tier) qs.set("tier", filters.tier.toLowerCase());
  if (filters.sentiment) qs.set("sentiment", sentimentFrontendToBackend(filters.sentiment));
  if (filters.intent) qs.set("intent", intentFrontendToBackend(filters.intent));
  qs.set("limit", String(Math.min(filters.limit ?? MAX_PAGE, MAX_PAGE)));
  if (filters.skip) qs.set("skip", String(filters.skip));
  const res = await apiFetch<{ total: number; limit: number; skip: number; leads: BackendLeadSummary[] }>(`/leads?${qs}`);
  return { leads: res.leads.map(adaptLead), total: res.total, limit: res.limit, skip: res.skip };
}

export async function getLeads(filters: LeadFilters = {}): Promise<AdminLead[]> {
  return (await getLeadsPage(filters)).leads;
}

/** GET /leads/{id} — the lead plus enquiry details, SHAP and per-call transcripts. */
export async function getLead(id: string): Promise<AdminLeadDetail> {
  return adaptLeadDetail(await apiFetch<BackendLeadDetail>(`/leads/${encodeURIComponent(id)}`));
}

/** PATCH /leads/{id}/status — sends the backend's status value; returns the status the server saved. */
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<LeadStatus> {
  const res = await apiFetch<{ current_status: string }>(`/leads/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: statusFrontendToBackend(status) }),
  });
  return statusBackendToFrontend(res.current_status);
}

/** GET /analytics — all-time totals (the API has no date range). */
export async function getAnalytics(): Promise<Analytics> {
  return adaptAnalytics(await apiFetch<BackendAnalytics>("/analytics"));
}
