import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { City, LeadStatus, ScoreBand } from "@/api/types";
import { STATUSES, statusMeta } from "@/api/status";
import { ScoreBadge } from "@/components/ScoreBadge";
import { EnquiryDetailsCard } from "@/components/EnquiryDetailsCard";
import { SentimentChip } from "@/components/SentimentChip";
import { IntentChip } from "@/components/IntentChip";
import { cn } from "@/lib/utils";
import { getAnalytics, getLead, getLeadsPage, MAX_PAGE } from "@/api/leads";
import type { Analytics } from "@/lib/mappings";
import { MODELS, SENTIMENT_CONFIDENCE_THRESHOLD, fmtDuration, type AdminLead, type AdminLeadDetail } from "../format";
import { changeLeadStatus, useStatusSync, withStatus } from "../leadsStore";
import { LoadError, Loading } from "../components/LoadState";
import { useLeadSearch } from "../leadSearch";
import { FilterTabs } from "./Overview";

const PAGE = 20;
type Tab = "All" | ScoreBand;

/** Finer than the Hot/Warm/Cold tabs, so the two filters never repeat each other. */
const SCORE_BANDS = [
  { id: "90", label: "90 – 100", test: (s: number) => s >= 90 },
  { id: "75", label: "75 – 89", test: (s: number) => s >= 75 && s < 90 },
  { id: "60", label: "60 – 74", test: (s: number) => s >= 60 && s < 75 },
  { id: "40", label: "40 – 59", test: (s: number) => s >= 40 && s < 60 },
  { id: "0", label: "Under 40", test: (s: number) => s < 40 },
];

const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const lastCall = (l: AdminLead) => l.calls[l.calls.length - 1].at;

/**
 * Leads (§11.2): every lead/enquiry. The Hot/Warm/Cold tab is a server-side filter (GET /leads?tier=);
 * the API has no city, status, score-range or search filters, so those narrow the fetched page in the
 * browser. An inline status change shows up on the Overview live (and vice versa).
 */
export function Leads() {
  const [tab, setTab] = useState<Tab>("All");
  const [all, setAll] = useState<AdminLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [counts, setCounts] = useState<Analytics | null>(null);

  useStatusSync((id, status, at) => setAll((ls) => ls.map((l) => withStatus(l, id, status, at))));

  // Fetch on mount, and again whenever the tier tab changes (or the user hits "Try again").
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    getLeadsPage({ tier: tab === "All" ? undefined : tab, limit: MAX_PAGE })
      .then((r) => { if (live) { setAll(r.leads); setTotal(r.total); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load leads."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [tab, attempt]);

  // Tab counts come from /analytics so they stay right while one tier is selected.
  useEffect(() => {
    let live = true;
    getAnalytics().then((a) => { if (live) setCounts(a); }).catch(() => { /* counts just stay hidden */ });
    return () => { live = false; };
  }, [attempt]);

  const [q, setQ] = useLeadSearch(); // shared with the header search box (lives in the URL)
  const [city, setCity] = useState<"" | City>("");
  const [status, setStatus] = useState<"" | LeadStatus>("");
  const [band, setBand] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const toggleRow = (id: string) => {
    setClosing(open);
    setOpen((o) => (o === id ? null : id));
  };

  const tabCounts = counts ? { All: counts.totalLeads, Hot: counts.hot, Warm: counts.warm, Cold: counts.cold } : null;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const scoreTest = SCORE_BANDS.find((b) => b.id === band)?.test;
    return all
      .filter((l) =>
        (!city || l.city === city) &&
        (!status || l.status === status) &&
        (!scoreTest || scoreTest(l.score)) &&
        (!needle || l.name.toLowerCase().includes(needle) || (digits.length > 2 && l.phone.replace(/\D/g, "").includes(digits))),
      )
      .sort((a, b) => lastCall(b) - lastCall(a));
  }, [all, q, city, status, band]);

  // Back to page 1 whenever the filters change.
  useEffect(() => setPage(1), [tab, q, city, status, band]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages);
  const shown = rows.slice((p - 1) * PAGE, p * PAGE);
  const filtered = !!(q || city || status || band);
  const clear = () => { setQ(""); setCity(""); setStatus(""); setBand(""); };

  return (
    <div className="space-y-4 max-w-screen-2xl">
      {/* Tabs (lead type) + total */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          label="Lead type"
          value={tab}
          onChange={setTab}
          options={(["All", "Hot", "Warm", "Cold"] as Tab[]).map((id) => ({ id, label: tabCounts ? `${id} (${tabCounts[id]})` : id }))}
        />
        <p className="text-small text-ink-muted tnum" aria-live="polite">
          {rows.length} {rows.length === 1 ? "lead" : "leads"}{filtered || tab !== "All" ? " match" : ""}
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 h-9 w-full sm:w-64 px-3 rounded-control border border-border bg-surface transition-[border-color,box-shadow] duration-fast focus-within:border-accent focus-within:shadow-focus">
          <Search size={16} strokeWidth={1.5} className="text-ink-muted shrink-0" aria-hidden="true" />
          <span className="sr-only">Search by name or phone</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or phone"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none shadow-none focus-visible:shadow-none text-body placeholder:text-ink-muted"
          />
        </label>
        <Select label="City" value={city} onChange={(v) => setCity(v as "" | City)}>
          <option value="">All cities</option>
          <option value="Nashik">Nashik</option>
          <option value="Pune">Pune</option>
        </Select>
        <Select label="Status" value={status} onChange={(v) => setStatus(v as "" | LeadStatus)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
        <Select label="Score band" value={band} onChange={setBand}>
          <option value="">Any score</option>
          {SCORE_BANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </Select>
        {filtered && (
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 h-9 px-3 rounded-control text-small text-ink-soft hover:text-ink hover:bg-surface-hover">
            <X size={14} strokeWidth={1.5} aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      {error && <LoadError message={`Couldn't load leads: ${error}`} onRetry={() => setAttempt((n) => n + 1)} />}
      {loading && <Loading label="Loading leads…" />}
      {total > all.length && !loading && !error && (
        <p className="text-small text-ink-muted">Showing the {all.length} highest-scoring of {total} leads.</p>
      )}

      {/* Table — header sticks under the app top bar while the page scrolls */}
      <div className={cn("rounded-card border border-border bg-surface overflow-x-auto lg:overflow-visible", (loading || error) && "hidden")}>
        <table className="w-full text-body">
          <thead className="lg:sticky lg:top-16 z-[2] bg-surface">
            <tr className="text-left text-small text-ink-muted border-b border-border">
              <Th className="pl-4 lg:pl-6">Client</Th>
              <Th>Phone</Th>
              <Th>City</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th className="text-right">Score</Th>
              <Th>Last call</Th>
              <Th className="pr-4 lg:pr-6">Created</Th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-ink-muted">
                  No leads match these filters.{" "}
                  {filtered && <button type="button" onClick={clear} className="text-accent-ink font-medium hover:underline">Clear filters</button>}
                </td>
              </tr>
            ) : (
              shown.map((l) => {
                const isOpen = open === l.id;
                return (
                <Fragment key={l.id}>
                <tr
                  onClick={(e) => {
                    // Ignore clicks from the status control, and from its menu (portaled, but React bubbles it here).
                    if (!e.currentTarget.contains(e.target as Node) || (e.target as HTMLElement).closest("[data-row-action]")) return;
                    toggleRow(l.id);
                  }}
                  className={cn(
                    "border-b border-border cursor-pointer transition-colors duration-fast",
                    isOpen ? "bg-accent-soft border-transparent" : "hover:bg-surface-hover",
                  )}
                >
                  <td className="pl-4 lg:pl-6 pr-3 py-2.5 whitespace-nowrap">
                    {/* The name is the keyboard toggle (Enter/Space); clicking anywhere on the row does the same. */}
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`lead-detail-${l.id}`}
                      onClick={(e) => { e.stopPropagation(); toggleRow(l.id); }}
                      className="inline-flex items-center gap-1.5 font-medium text-left hover:text-accent-ink rounded-control"
                    >
                      <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" className={cn("text-ink-muted transition-transform duration-base", isOpen && "rotate-180 text-accent-ink")} />
                      {l.name}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft tnum whitespace-nowrap">{l.phone}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {l.city}
                  </td>
                  <td className="px-3 py-2.5">
                    <ScoreBadge score={l.score} band={l.band} showScore={false} />
                  </td>
                  <td className="px-3 py-2.5" data-row-action>
                    <StatusSelect lead={l} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 font-semibold tnum">
                      {l.score}
                      {MODELS.provisional && (
                        <span className="w-1.5 h-1.5 rounded-pill border border-ink-soft" title="Provisional score" aria-label="(provisional)" />
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft tnum whitespace-nowrap">{fmtDate(lastCall(l))}</td>
                  <td className="pl-3 pr-4 lg:pr-6 py-2.5 text-ink-soft tnum whitespace-nowrap">{fmtDate(l.createdAt)}</td>
                </tr>
                {/* Full-width detail row: auto-height expand (0fr → 1fr) */}
                <tr aria-hidden={!isOpen || undefined} className={cn(isOpen && "border-b border-border")}>
                  <td colSpan={8} className="p-0">
                    <div id={`lead-detail-${l.id}`} className={cn("eq-expand", isOpen && "is-open")} {...(isOpen ? {} : { inert: "" })}>
                      <div>{(isOpen || closing === l.id) && <LeadCard lead={l} />}</div>
                    </div>
                  </td>
                </tr>
                </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {rows.length > PAGE && (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-small text-ink-muted tnum">
            {(p - 1) * PAGE + 1}–{Math.min(p * PAGE, rows.length)} of {rows.length}
          </p>
          <div className="flex items-center gap-1">
            <PageBtn onClick={() => setPage(p - 1)} disabled={p === 1} label="Previous page"><ChevronLeft size={16} strokeWidth={1.5} /></PageBtn>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === pages || Math.abs(n - p) <= 1)
              .map((n, i, arr) => (
                <span key={n} className="flex items-center">
                  {i > 0 && n - arr[i - 1] > 1 && <span className="px-1 text-ink-muted">…</span>}
                  <PageBtn onClick={() => setPage(n)} current={n === p} label={`Page ${n}`}>{n}</PageBtn>
                </span>
              ))}
            <PageBtn onClick={() => setPage(p + 1)} disabled={p === pages} label="Next page"><ChevronRight size={16} strokeWidth={1.5} /></PageBtn>
          </div>
        </nav>
      )}
    </div>
  );
}

/* ---------------- expanded row card ---------------- */

const fmtCallTime = (t: number) =>
  new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Quick summary under a clicked row. The full story (transcript, SHAP) lives on Lead Detail. */
function LeadCard({ lead: l }: { lead: AdminLead }) {
  // The list endpoint has no NER output, so load the full lead for the requirements card.
  const [full, setFull] = useState<AdminLeadDetail | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    getLead(l.id).then((d) => { if (live) setFull(d); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [l.id]);
  const call = l.calls[l.calls.length - 1];
  return (
    <div className="px-4 lg:px-6 pt-2 pb-5 bg-accent-soft">
      <div className="rounded-card border border-border bg-bg p-4 lg:p-5 grid gap-5 lg:grid-cols-2">
        {/* Left: contact + chips + status */}
        <div className="space-y-4 min-w-0">
          <div>
            <p className="font-semibold text-h3">{l.name}</p>
            <p className="text-body text-ink-soft tnum">{l.phone}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-body">
            <div>
              <dt className="text-small text-ink-muted">Last call</dt>
              <dd className="tnum">{fmtCallTime(call.at)}</dd>
            </div>
            <div>
              <dt className="text-small text-ink-muted">Duration</dt>
              <dd className="tnum">{fmtDuration(call.durationSec)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-small text-ink-muted">Timestamp</dt>
              <dd className="tnum text-ink-soft text-small break-all">{new Date(call.at).toISOString()}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <SentimentChip label={call.sentiment} confidence={call.confidence} threshold={SENTIMENT_CONFIDENCE_THRESHOLD} />
            <IntentChip intent={call.intent} />
            <ScoreBadge score={l.score} band={l.band} provisional={MODELS.provisional} />
            <StatusSelect lead={l} />
          </div>

          <Link
            to={`/leads/${l.id}`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-control bg-accent text-on-accent text-body font-medium hover:opacity-90 transition-opacity duration-fast"
          >
            View full lead <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <p className="text-small text-ink-muted">Transcript, “Why this score?” and call details are on the full lead.</p>
        </div>

        {/* Right: requirements */}
        <div className="min-w-0">
          {full ? (
            <EnquiryDetailsCard details={full.details} friendly={false} />
          ) : failed ? (
            <p className="text-small text-negative">Couldn't load the requirements for this lead.</p>
          ) : (
            <Loading label="Loading requirements…" />
          )}
          <p className="text-small text-ink-muted mt-2">{l.city} · extracted from the call; missing fields are never guessed.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th scope="col" className={cn("font-medium px-3 py-2.5 whitespace-nowrap", className)}>{children}</th>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 pl-3 pr-8 rounded-control border bg-surface text-body outline-none focus-visible:shadow-focus cursor-pointer",
          value ? "border-accent text-ink" : "border-border text-ink-soft",
        )}
      >
        {children}
      </select>
    </label>
  );
}

/**
 * Inline status change: optimistic. The new status shows at once everywhere, is saved with
 * PATCH /leads/{id}/status, and snaps back (with a message) if the save fails.
 * Base UI Select (not a native <select>) so the open menu follows our tokens in light & dark;
 * it brings listbox roles, arrow-key / type-ahead navigation and Esc to close.
 */
export function StatusSelect({ lead }: { lead: AdminLead }) {
  const m = statusMeta(lead.status);
  const [err, setErr] = useState<string | null>(null);
  const save = (next: LeadStatus) => {
    setErr(null);
    changeLeadStatus(lead.id, next, lead.status).catch((e) => setErr(e instanceof Error ? e.message : "Couldn't save the status."));
  };
  return (
    <>
    <SelectPrimitive.Root value={lead.status} onValueChange={(v) => v && save(v as LeadStatus)}>
      <SelectPrimitive.Trigger
        aria-label={`Status for ${lead.name}: ${m.label}`}
        title={err ?? undefined}
        className={cn(
          "relative z-[1] inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-pill border text-small text-ink whitespace-nowrap cursor-pointer",
          "outline-none focus-visible:shadow-focus data-[popup-open]:border-accent",
          err ? "border-negative" : m.tone,
        )}
      >
        <span className={cn("w-2 h-2 shrink-0 rounded-pill", m.dot)} aria-hidden="true" />
        <SelectPrimitive.Value>{() => m.label}</SelectPrimitive.Value>
        <SelectPrimitive.Icon className="text-ink-soft">
          <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-dropdown outline-none">
          <SelectPrimitive.Popup className="min-w-44 p-1 rounded-control border border-border bg-surface text-ink shadow-md outline-none eq-fade">
            {STATUSES.map((s) => (
              <SelectPrimitive.Item
                key={s.id}
                value={s.id}
                className={cn(
                  "flex items-center gap-2 h-8 pl-2 pr-2 rounded-control text-small text-ink cursor-pointer select-none outline-none",
                  "data-[highlighted]:bg-surface-hover data-[selected]:font-medium",
                )}
              >
                <span className={cn("w-2 h-2 shrink-0 rounded-pill", s.dot)} aria-hidden="true" />
                <SelectPrimitive.ItemText className="flex-1">{s.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="text-accent-ink">
                  <Check size={14} strokeWidth={1.5} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
    {err && <span role="alert" className="sr-only">{err}</span>}
    </>
  );
}

function PageBtn({ children, onClick, disabled, current, label }: {
  children: ReactNode; onClick: () => void; disabled?: boolean; current?: boolean; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={cn(
        "min-w-8 h-8 px-2 rounded-control text-small tnum grid place-items-center transition-colors duration-fast disabled:opacity-40 disabled:pointer-events-none",
        current ? "bg-ink text-surface font-medium" : "text-ink-soft hover:bg-surface-hover hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
