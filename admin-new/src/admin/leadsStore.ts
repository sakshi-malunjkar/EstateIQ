/**
 * Shared lead state for the screens that show the whole book of leads (Overview, Analytics) plus the
 * status-change channel every screen uses. A status change is applied optimistically everywhere
 * (any open list or detail patches itself via useStatusSync), sent to the API, and rolled back if it fails.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { LeadStatus } from "@/api/types";
import { getLeadsPage, updateLeadStatus } from "@/api/leads";
import type { AdminLead } from "./format";

/* ---------------- status changes ---------------- */

type StatusListener = (id: string, status: LeadStatus, at: number) => void;
const statusListeners = new Set<StatusListener>();

/** Patch one lead in place for a status change. Use inside a setState updater. */
export const withStatus = <T extends AdminLead>(l: T, id: string, status: LeadStatus, at: number): T =>
  l.id === id ? { ...l, status, statusChangedAt: at, lastActivityAt: at } : l;

/** Subscribe a screen's own copy of a lead/leads to status changes made anywhere. */
export function useStatusSync(apply: StatusListener) {
  const ref = useRef(apply);
  ref.current = apply;
  useEffect(() => {
    const fn: StatusListener = (id, status, at) => ref.current(id, status, at);
    statusListeners.add(fn);
    return () => { statusListeners.delete(fn); };
  }, []);
}

const emitStatus = (id: string, status: LeadStatus) => {
  const at = Date.now();
  statusListeners.forEach((fn) => fn(id, status, at));
};

/**
 * Change a lead's status: shown immediately, saved via PATCH, reverted to `prev` if the save fails.
 * Rejects with the API error so the caller can say what went wrong.
 */
export async function changeLeadStatus(id: string, next: LeadStatus, prev: LeadStatus): Promise<void> {
  if (next === prev) return;
  emitStatus(id, next);
  try {
    const saved = await updateLeadStatus(id, next);
    // e.g. "call_back" is stored as "contacted" by the backend — show what was actually saved
    if (saved !== next) emitStatus(id, saved);
  } catch (e) {
    emitStatus(id, prev);
    throw e;
  }
}

/** Fire-and-forget status change for buttons without their own error UI (Overview's "Mark contacted"). */
export function setLeadStatus(id: string, next: LeadStatus) {
  const prev = store.leads.find((l) => l.id === id)?.status;
  if (!prev) return;
  changeLeadStatus(id, next, prev).catch((e) => console.error(`Could not update lead ${id}:`, e));
}

/* ---------------- the full list ---------------- */

interface State { leads: AdminLead[]; total: number; loading: boolean; error: string | null }
let store: State = { leads: [], total: 0, loading: false, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { store = { ...store, ...patch }; listeners.forEach((fn) => fn()); };
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

statusListeners.add((id, status, at) => set({ leads: store.leads.map((l) => withStatus(l, id, status, at)) }));

let inflight = 0;
async function load() {
  const mine = ++inflight;
  set({ loading: true, error: null });
  try {
    // The API orders by score (not date) and caps a page at 200, so a new low-score lead can fall off
    // page 1 and never reach the Today filter. Keep fetching until we have them all.
    const page = await getLeadsPage();
    const leads = [...page.leads];
    while (leads.length < page.total) {
      const next = await getLeadsPage({ skip: leads.length });
      if (!next.leads.length) break;
      leads.push(...next.leads);
    }
    if (mine === inflight) set({ leads, total: page.total, loading: false });
  } catch (e) {
    if (mine === inflight) set({ loading: false, error: e instanceof Error ? e.message : "Could not load leads." });
  }
}

/** Every lead (up to the API's page cap), fetched on mount and shared between screens. */
export function useLeadsData() {
  const s = useSyncExternalStore(subscribe, () => store);
  useEffect(() => { void load(); }, []);
  const reload = useCallback(() => load(), []);
  return { leads: s.leads, total: s.total, loading: s.loading, error: s.error, reload };
}
