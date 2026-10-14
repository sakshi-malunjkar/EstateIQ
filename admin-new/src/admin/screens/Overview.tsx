import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, type Transition } from "motion/react";

import { useReducedMotion } from "@/lib/motion";
import { AppMotion } from "@/lib/AppMotion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Check, Minus, Phone, PhoneIncoming, RefreshCw, Smile, Undo2 } from "lucide-react";
import type { City, LeadStatus } from "@/api/types";
import { STATUS_LABEL } from "@/api/status";
import { PROJECTS } from "@/api/mock";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { HaloTabs, HaloTabsIndicator, HaloTabsList, HaloTabsTrigger } from "@/components/ui/halo-tabs";
import { cn } from "@/lib/utils";
import { DAY_MS, fmtDayIST, hourIST, startOfDayIST, INTENT_LABELS, MODELS, SENTIMENT_LABELS, fmtAgo, fmtNum, type AdminLead } from "../format";
import { setLeadStatus, useLeadsData } from "../leadsStore";
import { getAnalytics } from "@/api/leads";
import type { Analytics } from "@/lib/mappings";
import { LoadError, Loading } from "../components/LoadState";
import { useChartColors, type ChartColors } from "../useChartColors";

export type Range = "today" | "all";
export type CityFilter = "All" | City;

export const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "all", label: "All" },
];

/** [from, to) for the selected range and the period before it. "all" has no filter and no comparison. */
export function windows(range: Range) {
  const now = Date.now();
  if (range === "all") return { from: 0, to: now, prevFrom: 0, prevTo: 0 };
  // "Today" is the current IST calendar day; it is compared with the whole of yesterday (IST).
  const from = startOfDayIST(now);
  return { from, to: now, prevFrom: from - DAY_MS, prevTo: from };
}

/** Start of a chart's x-axis: the range start, or for "all" the IST day of the earliest event. */
export function chartFrom(range: Range, from: number, times: number[]) {
  if (range !== "all") return from;
  return startOfDayIST(times.length ? Math.min(Date.now(), ...times) : Date.now());
}

const inRange = (t: number, a: number, b: number) => t >= a && t < b + 1;

export function metrics(leads: AdminLead[], from: number, to: number) {
  const ls = leads.filter((l) => inRange(l.createdAt, from, to));
  const calls = leads.flatMap((l) => l.calls).filter((c) => inRange(c.at, from, to));
  const count = (f: (l: AdminLead) => boolean) => ls.filter(f).length;
  // Tier counts are a snapshot of ALL leads, not just those created in the window.
  const countAll = (f: (l: AdminLead) => boolean) => leads.filter(f).length;
  // Leads with a call in the window: what the intent/sentiment splits describe.
  const active = leads.filter((l) => l.calls.some((c) => inRange(c.at, from, to)));
  // Lead lists behind each KPI (drill-down). Highest score first.
  const sorted = (xs: AdminLead[]) => [...xs].sort((a, b) => b.score - a.score);
  return {
    leads: ls,
    activeLeads: active,
    calls,
    totalCalls: calls.length,
    totalLeads: ls.length,
    hot: countAll((l) => l.band === "Hot"),
    warm: countAll((l) => l.band === "Warm"),
    cold: countAll((l) => l.band === "Cold"),
    conversion: ls.length ? count((l) => l.status === "converted") / ls.length : 0,
    avgScore: ls.length ? ls.reduce((s, l) => s + l.score, 0) / ls.length : 0,
    hotUncontacted: count((l) => l.band === "Hot" && l.status === "not_contacted"),
    visits: count((l) => l.intent === "Schedule visit"),
    lists: {
      callers: sorted(leads.filter((l) => l.calls.some((c) => inRange(c.at, from, to)))),
      leads: sorted(ls),
      converted: sorted(ls.filter((l) => l.status === "converted")),
      hot: sorted(leads.filter((l) => l.band === "Hot")),
      warm: sorted(leads.filter((l) => l.band === "Warm")),
      cold: sorted(leads.filter((l) => l.band === "Cold")),
      hotUncontacted: sorted(ls.filter((l) => l.band === "Hot" && l.status === "not_contacted")),
      visits: sorted(ls.filter((l) => l.intent === "Schedule visit")),
    },
  };
}

/* ------------------------------------------------------------------ */

export function Overview() {
  const range: Range = "all"; // the dashboard always shows all-time data
  const [city, setCity] = useState<CityFilter>("All");
  const c = useChartColors();
  const reduced = useReducedMotion();
  // §25: charts draw in on first visit only — never re-animate on a filter change.
  const [animate, setAnimate] = useState(!reduced);
  useEffect(() => { const t = setTimeout(() => setAnimate(false), 1200); return () => clearTimeout(t); }, []);

  // One shared, live lead state: a status change anywhere recomputes every number on this page.
  const { leads: all, total, loading, error, reload } = useLeadsData();
  const [overall, setOverall] = useState<Analytics | null>(null);
  useEffect(() => {
    let live = true;
    getAnalytics().then((a) => { if (live) setOverall(a); }).catch(() => { /* the all-time strip just stays hidden */ });
    return () => { live = false; };
  }, []);
  const scoped = useMemo(() => (city === "All" ? all : all.filter((l) => l.city === city)), [all, city]);
  const w = windows(range);
  const cur = useMemo(() => metrics(scoped, w.from, w.to), [scoped, w.from, w.to]);
  // Derived, current state (not range-bound): contacted and nothing happened for 3+ days.
  const followUpList = useMemo(
    () => scoped.filter((l) => l.status === "contacted" && Date.now() - l.lastActivityAt >= 3 * DAY_MS).sort((a, b) => a.lastActivityAt - b.lastActivityAt),
    [scoped],
  );
  const followUp = followUpList.length;
    const markContacted = (id: string) => setLeadStatus(id, "contacted");

  // Drill-down: one card open at a time; "View all" / chart clicks open the side drawer.
  const [open, setOpen] = useState<string | null>(null);
  // The drawer keeps a *selector*, not a snapshot, so it stays live when a status changes.
  type Ctx = { cur: typeof cur; followUpList: AdminLead[] };
  const ctx: Ctx = { cur, followUpList };
  const [drawer, setDrawer] = useState<{ title: string; select: (c: Ctx) => AdminLead[] } | null>(null);
  const card = (id: string, title: string, select: (c: Ctx) => AdminLead[]) => ({
    leads: select(ctx),
    expanded: open === id,
    onToggle: () => setOpen((o) => (o === id ? null : id)),
    onViewAll: () => setDrawer({ title, select }),
    onMarkContacted: markContacted,
  });
  const segment = (title: string, f: (l: AdminLead) => boolean) =>
    setDrawer({ title, select: (c) => c.cur.leads.filter(f).sort((x, y) => y.score - x.score) });

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Filters — drive the whole page. Range left, city far right; wraps on narrow screens. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs label="Date range" value="all" onChange={() => {}} options={[{ id: "all", label: "All" }]} />
        <FilterTabs
          label="City"
          value={city}
          onChange={setCity}
          options={(["All", "Nashik", "Pune"] as CityFilter[]).map((id) => ({ id, label: id }))}
        />
      </div>

      {overall && (
        <p className="text-small text-ink-muted tnum">
          All time: {fmtNum(overall.totalLeads)} leads · avg. score {overall.avgScore == null ? "—" : overall.avgScore.toFixed(1)} · {(overall.conversionRate * 100).toFixed(1)}% converted
          {total > all.length && ` · charts below use the ${all.length} highest-scoring leads`}
        </p>
      )}
      {error && <LoadError message={`Couldn't load leads: ${error}`} onRetry={reload} />}
      {loading && !all.length && !error && <Loading label="Loading dashboard…" />}

      {/* 1. KPIs */}
      <div className={cn((error || (loading && !all.length)) && "hidden")}>
      <AppMotion>
      <section aria-label="Key numbers" className="space-y-3">
        {/* items-start: an expanded card grows on its own without stretching its row-mates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          <Kpi label="Total Enquiries" value={fmtNum(cur.totalLeads)} hint="All leads" {...card("calls", "Total enquiries", (c) => c.cur.lists.leads)} />
          <Kpi label="Conversion rate" value={`${(cur.conversion * 100).toFixed(1)}%`} hint="Converted ÷ leads" {...card("conv", "Converted leads", (c) => c.cur.lists.converted)} />
          <Kpi label="Avg. lead score" value={cur.avgScore.toFixed(1)} hint="Out of 100" {...card("score", "Leads", (c) => c.cur.lists.leads)} />
          <Kpi label="Hot leads" dot="bg-hot" value={fmtNum(cur.hot)} hint="Score ≥ 75 · all leads" {...card("hot", "Hot leads", (c) => c.cur.lists.hot)} />
          <Kpi label="Warm leads" dot="bg-warm" value={fmtNum(cur.warm)} hint="Score 40–74 · all leads" {...card("warm", "Warm leads", (c) => c.cur.lists.warm)} />
          <Kpi label="Cold leads" dot="bg-cold" value={fmtNum(cur.cold)} hint="Score < 40 · all leads" {...card("cold", "Cold leads", (c) => c.cur.lists.cold)} />
          <Kpi label="Visit requests" value={fmtNum(cur.visits)} hint="Intent = Schedule visit" {...card("visits", "Visit requests", (c) => c.cur.lists.visits)} />
          <Kpi
            label="Hot leads not contacted"
            value={fmtNum(cur.hotUncontacted)}
           
            upIsBad
            highlight
            hint="Hot + status New — call these today"
            {...card("hotnew", "Hot leads not contacted", (c) => c.cur.lists.hotUncontacted)}
          />
          <Kpi label="Follow-up pending" value={fmtNum(followUp)} hint="Contacted, no activity in 3+ days · right now" {...card("follow", "Follow-up pending", (c) => c.followUpList)} />
        </div>
      </section>
      </AppMotion>

      {/* Today's priority calls — one AI-ranked list, full width under the KPIs */}
      <PriorityCalls leads={scoped} />

      {/* 2. Breakdown charts */}
      {/* Left (2/3): calls over time, then intent + sentiment side by side. Right (1/3): activity,
          stretched to the full height so both columns end on the same line. */}
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 grid gap-4">
          <Panel title="Calls over time" empty={!cur.totalCalls}>
            <CallsOverTime calls={cur.calls} range={range} from={w.from} c={c} animate={animate} />
          </Panel>
          <div className="grid md:grid-cols-2 gap-4">
            <Panel title="Intent split" empty={!cur.activeLeads.length}>
              <IntentSplit leads={cur.activeLeads} c={c} animate={animate} />
            </Panel>
            <Panel title="Sentiment split" sub="Latest call" empty={!cur.activeLeads.length}>
              <SentimentSplit leads={cur.activeLeads} c={c} animate={animate} onPick={(name) => segment(`${name} sentiment`, (l) => l.sentiment === name)} />
            </Panel>
          </div>
        </div>
        <Panel title="Recent activity">
          <ActivityFeed leads={scoped} from={w.from} />
        </Panel>
      </div>

      <LeadsDrawer data={drawer && { title: drawer.title, leads: drawer.select(ctx) }} onClose={() => setDrawer(null)} onMarkContacted={markContacted} />
      </div>
    </div>
  );
}

/* ---------------- drill-down ---------------- */

const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Right-side sheet built on the shared Radix dialog (focus trap, Esc, scroll lock come with it). */
export function LeadsDrawer({ data, onClose, onMarkContacted }: {
  data: { title: string; leads: AdminLead[] } | null; onClose: () => void; onMarkContacted?: (id: string) => void;
}) {
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      {data && (
        <DialogContent
          className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-dvh max-h-dvh w-full max-w-2xl rounded-none border-y-0 border-r-0 p-0 gap-0 flex flex-col overflow-hidden eq-sheet"
        >
          <div className="px-6 py-5 border-b border-border pr-16">
            <DialogTitle className="font-display tracking-tight">
              {data.title} <span className="text-ink-muted font-normal tnum">({fmtNum(data.leads.length)})</span>
            </DialogTitle>
            <DialogDescription className="text-small mt-1">Highest score first · select a lead to open it.</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto">
            {data.leads.length === 0 ? (
              <p className="p-6 text-body text-ink-muted">No leads in this range.</p>
            ) : (
              <table className="w-full text-body">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-small text-ink-muted border-b border-border">
                    <th className="font-medium px-6 py-2">Client</th>
                    <th className="font-medium px-3 py-2">City</th>
                    <th className="font-medium px-3 py-2">Type</th>
                    <th className="font-medium px-3 py-2 text-right">Last call</th>
                    {onMarkContacted && <th className="px-6 py-2"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                  {data.leads.map((l) => (
                    <motion.tr
                      key={l.id}
                      layout="position"
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="relative border-b border-border hover:bg-surface-hover transition-colors duration-fast"
                    >
                      <td className="px-6 py-2.5">
                        {/* stretched link: the whole row opens Lead Detail */}
                        <Link to={`/leads/${l.id}`} className="font-medium after:absolute after:inset-0 hover:text-accent-ink rounded-control">{l.name}</Link>
                        <div className="text-small text-ink-muted tnum">{l.phone}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        {l.city}
                      </td>
                      <td className="px-3 py-2.5"><ScoreBadge score={l.score} band={l.band} provisional={MODELS.provisional} /></td>
                      <td className="px-3 py-2.5 text-right text-ink-soft tnum whitespace-nowrap">{fmtDate(l.calls[l.calls.length - 1].at)}</td>
                      {onMarkContacted && (
                        <td className="relative z-[1] px-6 py-2.5 text-right">
                          {l.status === "not_contacted" ? (
                            <MarkContactedButton onClick={() => onMarkContacted(l.id)} name={l.name} />
                          ) : (
                            <span className="text-small text-ink-muted">{STATUS_LABEL[l.status]}</span>
                          )}
                        </td>
                      )}
                    </motion.tr>
                  ))}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

/* ---------------- building blocks ---------------- */

/** Pill tabs (cult-ui HaloTabs, token-themed) used purely as a filter — no panels. */
export function FilterTabs<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { id: T; label: string }[];
}) {
  return (
    <HaloTabs value={value} onValueChange={(v) => onChange(v as T)}>
      <HaloTabsList variant="pill" aria-label={label} activateOnFocus loopFocus>
        {options.map((o) => (
          <HaloTabsTrigger key={o.id} value={o.id}>{o.label}</HaloTabsTrigger>
        ))}
        <HaloTabsIndicator variant="pill" />
      </HaloTabsList>
    </HaloTabs>
  );
}

/**
 * Typewriter: on `active`, reveal the text one character at a time with a caret, then drop the
 * caret. Under reduced motion the full text shows at once.
 */
function useTypewriter(text: string, active: boolean) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(text.length);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!active || reduced) { setCount(text.length); setTyping(false); return; }
    let n = 0;
    setCount(0);
    setTyping(true);
    const id = setInterval(() => {
      n++;
      setCount(n);
      if (n >= text.length) { clearInterval(id); setTyping(false); }
    }, 38);
    return () => clearInterval(id);
  }, [active, text, reduced]);
  return { text: text.slice(0, count), typing };
}

/** ShiftCard-style spring for the number glide. */
const SHIFT: Transition = { type: "spring", bounce: 0.2, duration: 0.5 };

type Delta = { text: string; dir: "up" | "down" | "flat" } | null;

function Kpi({ label, value, delta, hint, dot, highlight, upIsBad, leads, expanded, onToggle, onViewAll, onMarkContacted }: {
  label: string; value: string; delta?: Delta; hint?: string; dot?: string; highlight?: boolean; upIsBad?: boolean;
  leads: AdminLead[]; expanded: boolean; onToggle: () => void; onViewAll: () => void; onMarkContacted: (id: string) => void;
}) {
  const good = delta && delta.dir !== "flat" ? (delta.dir === "up") !== !!upIsBad : null;
  const Icon = !delta || delta.dir === "flat" ? Minus : delta.dir === "up" ? ArrowUpRight : ArrowDownRight;
  const panelId = useId();
  const { text: shown, typing } = useTypewriter(label, expanded);
  // Collapsed preview is inert so its controls aren't tabbable while hidden.
  const inert = expanded ? {} : ({ inert: "" } as Record<string, string>);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-controls={panelId}
      onClick={(e) => { if (!(e.target as HTMLElement).closest("[data-kpi-action]")) onToggle(); }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }
      }}
      className={cn("eq-kpi flex flex-col gap-1 text-left self-start", highlight && "eq-kpi--hl", expanded && "is-expanded")}
    >
      {/* Shift: collapsed = label over number; expanded = label left, number glides to the top-right
          (one element, Framer layout animation — no cross-fade of two copies). */}
      <div className={cn("flex", expanded ? "flex-row items-start justify-between gap-2" : "flex-col gap-1")}>
        <motion.div layout="position" transition={SHIFT} className="flex items-center gap-2 text-small text-ink-soft min-w-0">
          {dot && <span className={cn("w-2 h-2 shrink-0 rounded-pill", dot)} aria-hidden="true" />}
          <span
            className={cn(
              "transition-[font-size] duration-base ease-out",
              expanded ? "text-h2 font-semibold text-ink" : "text-small",
              highlight && "font-medium text-ink",
            )}
          >
            <span className="sr-only">{label}</span>
            <span aria-hidden="true">{shown}{typing && <span className="eq-caret">|</span>}</span>
          </span>
        </motion.div>
      <motion.div
        layout="position"
        transition={SHIFT}
        animate={{ scale: expanded ? 0.78 : 1 }}
        style={{ transformOrigin: expanded ? "top right" : "top left" }}
        className={cn("flex items-baseline gap-2 shrink-0", expanded ? "flex-col items-end gap-0" : "flex-wrap")}
      >
        <span className="font-display text-kpi font-semibold tracking-tight tnum leading-tight">{value}</span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-small font-medium tnum",
              good === null ? "text-ink-muted" : good ? "text-positive" : "text-negative",
            )}
          >
            <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">{delta.dir === "up" ? "up" : delta.dir === "down" ? "down" : "no change"}</span>
            {delta.text}
          </span>
        )}
      </motion.div>
      </div>
      {/* Sub-line slot is always present (2 lines reserved) so every card has the same height. */}
      <motion.p layout="position" transition={SHIFT} className="text-small text-ink-muted min-h-[2lh] line-clamp-2" aria-hidden={!hint || undefined}>
        {hint ?? " "}
      </motion.p>

      {/* Preview: springs open to fit its content (grid-rows 0fr → 1fr) */}
      <div className="eq-kpi__drawer" id={panelId} {...inert}>
        <div>
          <div className="mt-3 pt-3 border-t border-border">
            {leads.length === 0 ? (
              <p className="text-small text-ink-muted">No leads behind this number.</p>
            ) : (
              <ul className="space-y-2.5" aria-label={`Top leads: ${label}`}>
                <AnimatePresence initial={false}>
                {leads.slice(0, 3).map((l, i) => (
                  <motion.li
                    key={l.id}
                    layout="position"
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="eq-kpi__row flex items-center justify-between gap-3"
                    style={{ "--i": i } as CSSProperties}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-body text-ink truncate">{l.name}</div>
                      <div className="text-small text-ink-muted truncate">{l.city}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Lead type only (band from score) — no status pill here */}
                      <ScoreBadge score={l.score} band={l.band} provisional={MODELS.provisional} />
                      {l.status === "not_contacted" && (
                        <span data-kpi-action>
                          <MarkContactedButton compact onClick={() => onMarkContacted(l.id)} name={l.name} />
                        </span>
                      )}
                    </div>
                  </motion.li>
                ))}
                </AnimatePresence>
              </ul>
            )}
            {leads.length > 0 && (
              <button
                type="button"
                data-kpi-action
                onClick={onViewAll}
                className="eq-kpi__row mt-3 text-small font-medium text-accent-ink hover:underline rounded-control"
                style={{ "--i": Math.min(leads.length, 3) } as CSSProperties}
              >
                View all ({fmtNum(leads.length)}) →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Panel({ title, sub, action, className, empty, children }: {
  title: string; sub?: string; action?: ReactNode; className?: string; empty?: boolean; children: ReactNode;
}) {
  return (
    <section className={cn("rounded-card border border-border bg-surface p-4 flex flex-col", className)} aria-label={title}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-semibold text-h3">{title}</h2>
          {sub && <p className="text-small text-ink-muted mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {empty ? (
        <p className="flex-1 grid place-items-center min-h-40 text-body text-ink-muted">No data in this range.</p>
      ) : (
        // Axis/legend text follows the type tokens (CSS beats Recharts' font-size attribute).
        <div className="flex-1 [&_text]:text-small">{children}</div>
      )}
    </section>
  );
}

export const tooltip = (c: ChartColors) => ({
  contentStyle: {
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: "var(--radius-control)",
    boxShadow: "var(--shadow-sm)", fontSize: "var(--text-small)",
  },
  labelStyle: { color: c["ink-soft"] },
  itemStyle: { color: c.ink },
  cursor: { fill: c.border, fillOpacity: 0.4 },
});
export const axis = (c: ChartColors) => ({ tick: { fill: c["ink-muted"] }, axisLine: false, tickLine: false });
type ChartProps = { leads: AdminLead[]; c: ChartColors; animate: boolean; onPick?: (name: string) => void };
/** Recharts click payloads carry the datum's `name` (directly or under `payload`). */
const pickName = (d: unknown) => {
  const x = d as { name?: string; payload?: { name?: string } } | null;
  return x?.payload?.name ?? x?.name;
};

/* ---------------- action lists ---------------- */


function ActivityFeed({ leads, from }: { leads: AdminLead[]; from: number }) {
  type Ev = { at: number; icon: typeof PhoneIncoming; text: ReactNode; id: string };
  const evs: Ev[] = [];
  for (const l of leads) {
    const who = <Link to={`/leads/${l.id}`} className="font-medium text-ink hover:text-accent-ink">{l.name}</Link>;
    for (const call of l.calls) {
      if (call.at >= from) evs.push({ id: call.id, at: call.at, icon: PhoneIncoming, text: <>New call from {who} · {l.city}</> });
    }
    const last = l.calls[l.calls.length - 1];
    if (l.prevSentiment && last.at >= from) {
      evs.push({ id: `${l.id}-s`, at: last.at + 1, icon: Smile, text: <>Sentiment shift for {who}: {l.prevSentiment} → {l.sentiment}</> });
    }
    if (l.status !== "not_contacted" && l.statusChangedAt >= from) {
      evs.push({ id: `${l.id}-st`, at: l.statusChangedAt, icon: RefreshCw, text: <>{who} moved to <span className="font-medium text-ink">{STATUS_LABEL[l.status]}</span></> });
    }
  }
  const list = evs.sort((a, b) => b.at - a.at).slice(0, 8);
  if (!list.length) return <p className="text-body text-ink-muted py-6 text-center">Nothing yet in this range.</p>;
  return (
    <ol className="space-y-3">
      {list.map(({ id, at, icon: Icon, text }) => (
        <li key={id} className="flex gap-3">
          <span className="mt-0.5 w-7 h-7 shrink-0 rounded-pill bg-surface-hover grid place-items-center text-ink-soft">
            <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-body text-ink-soft">{text}</p>
            <p className="text-small text-ink-muted tnum">{fmtAgo(at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- charts (§25) ---------------- */

const H = "h-56";

export function CallsOverTime({ calls, range, from: rangeFrom, c, animate }: { calls: AdminLead["calls"]; range: Range; from: number; c: ChartColors; animate: boolean }) {
  const data = useMemo(() => {
    const from = chartFrom(range, rangeFrom, calls.map((x) => x.at));
    const hourly = range === "today";
    // "All" can span months: go weekly past ~2 months so the axis stays readable.
    const step = hourly ? 3_600_000 : Date.now() - from > 60 * DAY_MS ? 7 * DAY_MS : DAY_MS;
    const n = Math.max(1, Math.ceil((Date.now() - from) / step));
    const buckets = Array.from({ length: n }, (_, i) => {
      const t = from + i * step;
      return { label: hourly ? `${hourIST(t)}:00` : step === DAY_MS ? fmtDayIST(t) : `Wk of ${fmtDayIST(t)}`, calls: 0 };
    });
    for (const call of calls) {
      const i = Math.min(n - 1, Math.floor((call.at - from) / step));
      if (i >= 0) buckets[i].calls++;
    }
    return buckets;
  }, [calls, range, rangeFrom]);
  return (
    <div className={H}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.3} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.border} />
          <XAxis dataKey="label" {...axis(c)} interval="preserveStartEnd" minTickGap={16} />
          <YAxis allowDecimals={false} {...axis(c)} />
          <Tooltip {...tooltip(c)} cursor={{ stroke: c.border }} />
          <Area type="monotone" dataKey="calls" name="Calls" stroke={c.accent} strokeWidth={2} fill="url(#callsFill)" isAnimationActive={animate} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CitySplit({ leads, c, animate, onPick }: ChartProps) {
  const nashik = leads.filter((l) => l.city === "Nashik").length;
  const data = [
    { name: "Nashik", value: nashik, fill: c.accent },
    { name: "Pune", value: leads.length - nashik, fill: c.cold },
  ];
  const target = [{ name: "Nashik target", value: 60 }, { name: "Pune target", value: 40 }];
  const share = leads.length ? Math.round((nashik / leads.length) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className={cn(H, "relative flex-1 min-w-0")}>
        <ResponsiveContainer>
          <PieChart>
            {/* faint 60/40 target ring */}
            <Pie data={target} dataKey="value" innerRadius={86} outerRadius={90} startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
              <Cell fill={c.accent} fillOpacity={0.3} />
              <Cell fill={c.cold} fillOpacity={0.3} />
            </Pie>
            {/* 16px ring (§25) */}
            <Pie data={data} dataKey="value" innerRadius={64} outerRadius={80} startAngle={90} endAngle={-270} stroke={c.surface} strokeWidth={2} isAnimationActive={animate} className="cursor-pointer" onClick={(d) => { const n = pickName(d); if (n) onPick?.(n); }}>
              {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
            </Pie>
            <Tooltip {...tooltip(c)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="font-display text-kpi font-semibold tnum">{share}%</div>
            <div className="text-small text-ink-muted">Nashik</div>
          </div>
        </div>
      </div>
      <ul className="space-y-2 text-small shrink-0">
        {data.map((d, i) => (
          <li key={d.name}>
            <span className="inline-flex items-center gap-1.5 text-ink"><span className={cn("w-2 h-2 rounded-pill", i ? "bg-cold" : "bg-accent")} />{d.name}</span>
            <div className="text-ink-muted tnum">{fmtNum(d.value)} · target {target[i].value}%</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBar({ data, c, animate, fill, cells, width = 96, onPick, className, outline = false }: {
  data: { name: string; value: number }[]; c: ChartColors; animate: boolean; fill?: string; cells?: string[]; width?: number; onPick?: (name: string) => void; className?: string;
  /** Outline-only bars that fill with the accent on hover / keyboard focus. */
  outline?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const track = outline
    ? {
        accessibilityLayer: true, // arrow keys move the active bar → it fills too
        onMouseMove: (st: { activeTooltipIndex?: number }) => setActive(st?.activeTooltipIndex ?? null),
        onMouseLeave: () => setActive(null),
      }
    : {};
  return (
    <div className={className ?? H} onBlur={outline ? () => setActive(null) : undefined}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6} {...track}>
          <CartesianGrid horizontal={false} vertical={false} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" interval={0} width={width} {...axis(c)} tick={{ fill: c["ink-soft"] }} />
          <Tooltip {...tooltip(c)} />
          <Bar dataKey="value" name="Leads" fill={fill} radius={[0, 4, 4, 0]} isAnimationActive={animate} className={onPick ? "cursor-pointer" : undefined} onClick={onPick ? (d) => { const n = pickName(d); if (n) onPick(n); } : undefined}
            label={{ position: "right", fill: c["ink-soft"] }}>
            {outline
              ? data.map((d, i) => <Cell key={d.name} {...outlineCell(c, i === active)} />)
              : cells?.map((f, i) => <Cell key={i} fill={f} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Outlined bar: transparent with a 1px accent stroke; solid accent when active (150ms fill fade). */
export const outlineCell = (c: ChartColors, on: boolean) => ({
  fill: on ? c.accent : "transparent",
  stroke: c.accent,
  strokeWidth: 1,
  style: { transition: "fill var(--dur-fast) var(--ease-out)" },
});

export function TopProjects({ leads, c, animate, onPick, outline }: ChartProps & { outline?: boolean }) {
  const data = PROJECTS.map((p) => ({ name: p.name, value: leads.filter((l) => l.projectId === p.id).length }))
    .filter((d) => d.value)
    .sort((a, b) => b.value - a.value);
  return <HBar data={data} c={c} animate={animate} fill={c.accent} width={110} onPick={onPick} outline={outline} />;
}

function IntentSplit({ leads, c, animate }: ChartProps) {
  const data = INTENT_LABELS.map((i) => ({ name: i, value: leads.filter((l) => l.intent === i).length }));
  // §27.2: intent is a category, not a judgement — neutral styling.
  return <HBar data={data} c={c} animate={animate} fill={c["ink-soft"]} />;
}

function SentimentSplit({ leads, c, animate, onPick }: ChartProps) {
  const color = { Positive: c.positive, Neutral: c.neutral, Negative: c.negative };
  const dot = { Positive: "bg-positive", Neutral: "bg-neutral", Negative: "bg-negative" };
  const data = SENTIMENT_LABELS.map((s) => ({ name: s, value: leads.filter((l) => l.sentiment === s).length }));
  return (
    <div className="flex items-center gap-4">
      <div className={cn(H, "flex-1 min-w-0")}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={56} outerRadius={72} startAngle={90} endAngle={-270} stroke={c.surface} strokeWidth={2} isAnimationActive={animate} className="cursor-pointer" onClick={(d) => { const n = pickName(d); if (n) onPick?.(n); }}>
              {data.map((d) => <Cell key={d.name} fill={color[d.name]} />)}
            </Pie>
            <Tooltip {...tooltip(c)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-small shrink-0">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-pill", dot[d.name])} aria-hidden="true" />
            <span className="text-ink">{d.name}</span>
            <span className="text-ink-muted tnum">{leads.length ? Math.round((d.value / leads.length) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Funnel({ leads, c, animate }: ChartProps) {
  const n = (s: LeadStatus[]) => leads.filter((l) => s.includes(l.status)).length;
  // Stage reached: every lead starts Not contacted; later stages include everyone who got past them.
  const data = [
    { name: "All leads", value: leads.length },
    { name: "Contacted", value: n(["contacted", "call_back", "visit_scheduled", "converted", "lost"]) },
    { name: "Visit scheduled", value: n(["visit_scheduled", "converted"]) },
    { name: "Converted", value: n(["converted"]) },
    { name: "Lost", value: n(["lost"]) },
  ];
  return <HBar data={data} c={c} animate={animate} cells={[c.ink, c.cold, c.accent, c.positive, c.negative]} width={104} />;
}

export function Budget({ leads, c, animate }: ChartProps) {
  const b = (f: (l: number) => boolean) => leads.filter((l) => l.budgetLakh !== null && f(l.budgetLakh)).length;
  const data = [
    { name: "< ₹50L", value: b((x) => x < 50) },
    { name: "₹50L – 1Cr", value: b((x) => x >= 50 && x <= 100) },
    { name: "> ₹1Cr", value: b((x) => x > 100) },
    { name: "Not mentioned", value: leads.filter((l) => l.budgetLakh === null).length },
  ];
  return (
    <div className={H}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.border} />
          <XAxis dataKey="name" {...axis(c)} interval={0} />
          <YAxis allowDecimals={false} {...axis(c)} />
          <Tooltip {...tooltip(c)} />
          <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]} isAnimationActive={animate} label={{ position: "top", fill: c["ink-soft"] }}>
            {/* "Not mentioned" stays muted — an extraction gap, never a guess (§27.3) */}
            {data.map((d, i) => <Cell key={d.name} fill={i === 3 ? c.border : c.accent} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- Today's priority calls ---------------- */

/**
 * Urgency = how much calling this lead *now* matters, from signals we already have.
 * Weights are a transparent heuristic (mock) — tune once real outcomes exist.
 */
function urgency(l: AdminLead) {
  const hrs = (Date.now() - l.calls[l.calls.length - 1].at) / 3_600_000;
  let u = l.score * 0.6; // 0–60: lead score carries the most weight (Hot ranks highest)
  if (l.status === "not_contacted") u += 25; // not contacted yet — the big one
  if (hrs < 24) u += 12; else if (hrs < 48) u += 8; else if (hrs < 168) u += 3;
  if (l.intent === "Schedule visit") u += 8; else if (l.intent === "Buy") u += 6;
  if (l.sentiment === "Positive") u += 4; else if (l.sentiment === "Negative") u -= 4;
  return u;
}

/** Plain-language reasons, in the same order as their weight. */
function reasons(l: AdminLead) {
  const out: string[] = [l.band];
  if (l.status === "not_contacted") out.push("not contacted yet");
  if (l.intent === "Schedule visit") out.push("asked to visit");
  else if (l.intent === "Buy") out.push("wants to buy");
  out.push(`called ${fmtAgo(l.calls[l.calls.length - 1].at)}`);
  if (l.sentiment === "Positive") out.push("positive tone");
  else if (l.sentiment === "Negative") out.push("hesitant tone");
  return out;
}

const telHref = (phone: string) => `tel:${phone.replace(/\s+/g, "")}`;

/** Shared "Mark contacted" control (priority queue, expanded cards, drawer). */
function MarkContactedButton({ onClick, name, compact = false }: { onClick: () => void; name: string; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mark ${name} as contacted`}
      title="Mark contacted"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 h-8 rounded-control border border-border text-small text-ink-soft hover:text-ink hover:bg-surface-hover transition-colors duration-fast",
        compact ? "w-8" : "px-3",
      )}
    >
      <Check size={14} strokeWidth={1.5} aria-hidden="true" />
      {!compact && "Mark contacted"}
    </button>
  );
}

function PriorityCalls({ leads }: { leads: AdminLead[] }) {
  // Queue = hot leads nobody has contacted yet, all-time (the date filter doesn't apply here;
  // contacted ones move on to "Follow-up pending"). Top 8 are shown, the heading counts them all.
  const queue = useMemo(
    () => leads
      .filter((l) => l.band === "Hot" && l.status === "not_contacted")
      .map((l) => ({ l, u: urgency(l) }))
      .sort((a, b) => b.u - a.u),
    [leads],
  );
  const ranked = useMemo(() => queue.slice(0, 8), [queue]);
  const [last, setLast] = useState<AdminLead | null>(null);
  const mark = (l: AdminLead) => { setLeadStatus(l.id, "contacted"); setLast(l); };
  const undo = () => { if (last) setLeadStatus(last.id, "not_contacted"); setLast(null); };

  return (
    <section aria-labelledby="priority-title" className="rounded-card border border-border bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-2 px-4 lg:px-6 pt-4 pb-3 border-b border-border">
        <div>
          <h2 id="priority-title" className="font-semibold text-h2">
            Today&apos;s priority calls <span className="text-ink-muted font-normal tnum">({queue.length})</span>
          </h2>
          <p className="text-small text-ink-muted mt-0.5">Ranked by urgency · score, not-yet-contacted, recent call, intent, tone</p>
        </div>
        <p className="text-small text-ink-muted" aria-live="polite">
          {last ? (
            <>
              Marked <span className="text-ink font-medium">{last.name}</span> as contacted ·{" "}
              <button type="button" onClick={undo} className="inline-flex items-center gap-1 font-medium text-accent-ink hover:underline rounded-control">
                <Undo2 size={12} strokeWidth={1.5} aria-hidden="true" /> Undo
              </button>
            </>
          ) : (
            "Not yet contacted"
          )}
        </p>
      </div>

      {ranked.length === 0 ? (
        <p className="px-6 py-8 text-body text-ink-muted text-center">Everyone has been contacted.</p>
      ) : (
        <AppMotion>
          <ol>
            <AnimatePresence initial={false}>
              {ranked.map(({ l }, i) => (
                <motion.li
                  key={l.id}
                  layout="position"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] } }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
                  className="relative flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 px-4 lg:px-6 py-3 border-b border-border last:border-0 hover:bg-surface-hover transition-colors duration-fast"
                >
                  <span className={cn("w-7 h-7 shrink-0 rounded-pill grid place-items-center text-small font-semibold tnum", i < 3 ? "bg-accent-soft text-accent-ink" : "bg-surface-hover text-ink-soft")}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 basis-48">
                    {/* stretched link: the row opens Lead Detail; buttons sit above it */}
                    <Link to={`/leads/${l.id}`} className="font-medium text-body after:absolute after:inset-0 hover:text-accent-ink rounded-control">
                      {l.name}
                    </Link>
                    <div className="text-small text-ink-muted truncate">{l.city}</div>
                  </div>
                  <ScoreBadge score={l.score} band={l.band} provisional={MODELS.provisional} className="shrink-0" />
                  <p className="text-small text-ink-soft basis-full md:basis-auto md:flex-1 min-w-0 md:truncate">{reasons(l).join(" · ")}</p>
                  <div className="relative z-[1] flex items-center gap-2 shrink-0 ml-auto">
                    <a
                      href={telHref(l.phone)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-control bg-ink text-surface text-small font-medium hover:opacity-90 transition-opacity duration-fast"
                      aria-label={`Call ${l.name}, ${l.phone}`}
                    >
                      <Phone size={14} strokeWidth={1.5} aria-hidden="true" /> Call
                    </a>
                    <MarkContactedButton onClick={() => mark(l)} name={l.name} />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </AppMotion>
      )}

      <div className="px-4 lg:px-6 py-3 border-t border-border">
        <Link to="/leads" className="text-small font-medium text-accent-ink hover:underline">View all leads →</Link>
      </div>
    </section>
  );
}
