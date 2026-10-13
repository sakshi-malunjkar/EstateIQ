import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Download, Printer } from "lucide-react";
import type { LeadStatus, ScoreBand } from "@/api/types";
import { PROJECTS } from "@/api/mock";
import { STATUS_LABEL } from "@/api/status";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { DAY_MS, fmtDayIST, hourIST, SENTIMENT_LABELS, leadInsights, type AdminLead } from "../format";
import { useLeadsData } from "../leadsStore";
import { LoadError, Loading } from "../components/LoadState";
import { useChartColors, type ChartColors } from "../useChartColors";
import {
  Budget, CallsOverTime, CitySplit, FilterTabs, Funnel, HBar, LeadsDrawer, Panel, RANGES, TopProjects, axis, metrics, outlineCell, tooltip, windows,
  type CityFilter, type Range,
} from "./Overview";

const NER_NOTE = "Extracted from call transcripts.";
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const isConverted = (s: LeadStatus) => s === "converted";

/** Trend buckets: hourly for Today, daily for 7d, and (for the noisier ratios) weekly for 30d. */
function buckets(range: Range, from: number, weeklyFor30 = false) {
  const step = range === "today" ? 3_600_000 : range === "30d" && weeklyFor30 ? 7 * DAY_MS : DAY_MS;
  const n = Math.max(1, Math.ceil((Date.now() - from) / step));
  return Array.from({ length: n }, (_, i) => {
    const start = from + i * step;
    const label =
      range === "today" ? `${hourIST(start)}:00`
      : step === DAY_MS ? fmtDayIST(start)
      : `Wk of ${fmtDayIST(start)}`;
    return { start, end: start + step, label };
  });
}

const SCORE_BANDS: { name: string; test: (s: number) => boolean }[] = [
  { name: "< 40", test: (s) => s < 40 },
  { name: "40–59", test: (s) => s >= 40 && s < 60 },
  { name: "60–74", test: (s) => s >= 60 && s < 75 },
  { name: "75–89", test: (s) => s >= 75 && s < 90 },
  { name: "90+", test: (s) => s >= 90 },
];

/**
 * Analytics (§11.6). Three sections — Trends, Performance, Demand insights — all driven by the
 * date-range, city and project filters, all from the same shared lead state as the Overview.
 */
export function Analytics() {
  const [range, setRange] = useState<Range>("30d");
  const [city, setCity] = useState<CityFilter>("All");
  const [project, setProject] = useState("");
  const c = useChartColors();
  const reduced = useReducedMotion();
  // §25: draw-in on first visit only — never re-animate on a filter change.
  const [animate, setAnimate] = useState(!reduced);
  useEffect(() => { const t = setTimeout(() => setAnimate(false), 1200); return () => clearTimeout(t); }, []);

  const { leads: all, loading, error, reload } = useLeadsData(); // shared live state, status changes elsewhere show up here too
  const scoped = useMemo(
    () => all.filter((l) => (city === "All" || l.city === city) && (!project || l.projectId === project)),
    [all, city, project],
  );
  const w = windows(range);
  const cur = useMemo(() => metrics(scoped, w.from, w.to), [scoped, w.from, w.to]);
  const leads = cur.leads;

  /* ---- Trends ---- */
  const conversionTrend = useMemo(
    () => buckets(range, w.from, true).map((b) => {
      const ls = leads.filter((l) => l.createdAt >= b.start && l.createdAt < b.end);
      return { label: b.label, rate: pct(ls.filter((l) => isConverted(l.status)).length, ls.length), n: ls.length };
    }),
    [leads, range, w.from],
  );
  const sentimentTrend = useMemo(
    () => buckets(range, w.from, true).map((b) => {
      const calls = cur.calls.filter((x) => x.at >= b.start && x.at < b.end);
      const row: Record<string, number | string> = { label: b.label };
      for (const s of SENTIMENT_LABELS) row[s] = pct(calls.filter((x) => x.sentiment === s).length, calls.length);
      return row;
    }),
    [cur.calls, range, w.from],
  );

  /* ---- Performance ---- */
  const convByProject = useMemo(
    () => PROJECTS.map((p) => {
      const ls = leads.filter((l) => l.projectId === p.id);
      return { name: p.name, value: pct(ls.filter((l) => isConverted(l.status)).length, ls.length), n: ls.length };
    }).filter((d) => d.n).sort((a, b) => b.value - a.value),
    [leads],
  );
  const convByType = useMemo(
    () => (["Hot", "Warm", "Cold"] as ScoreBand[]).map((band) => {
      const ls = leads.filter((l) => l.band === band);
      return { name: band, value: pct(ls.filter((l) => isConverted(l.status)).length, ls.length), n: ls.length };
    }),
    [leads],
  );
  const scoreOutcome = useMemo(
    () => SCORE_BANDS.map((b) => {
      const ls = leads.filter((l) => b.test(l.score));
      return { name: b.name, value: pct(ls.filter((l) => isConverted(l.status)).length, ls.length), n: ls.length };
    }),
    [leads],
  );
  const hi = scoreOutcome.slice(3).reduce((a, d) => ({ n: a.n + d.n, conv: a.conv + (d.value * d.n) / 100 }), { n: 0, conv: 0 });
  const lo = scoreOutcome.slice(0, 2).reduce((a, d) => ({ n: a.n + d.n, conv: a.conv + (d.value * d.n) / 100 }), { n: 0, conv: 0 });
  const takeaway = hi.n && lo.n
    ? `Leads scoring 75+ converted at ${pct(hi.conv, hi.n)}% (${hi.n} leads) vs ${pct(lo.conv, lo.n)}% (${lo.n} leads) under 60 — ${
        pct(hi.conv, hi.n) > pct(lo.conv, lo.n) ? "higher scores are converting more." : "the score isn't separating outcomes in this range yet."
      }`
    : "Not enough leads in this range to compare score bands.";

  /* ---- Demand (NER) ---- */
  const amenitiesOf = (l: AdminLead) => leadInsights(l).details.amenities?.split(", ").filter(Boolean) ?? [];
  const tally = (values: (string | null | undefined)[]) => {
    const n = new Map<string, number>();
    for (const v of values) if (v) n.set(v, (n.get(v) ?? 0) + 1);
    return [...n].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  };
  const localities = useMemo(() => tally(leads.map((l) => leadInsights(l).details.locality)).slice(0, 10), [leads]);
  const amenities = useMemo(() => tally(leads.flatMap(amenitiesOf)).slice(0, 10), [leads]);
  const bhk = useMemo(
    () => tally(leads.map((l) => leadInsights(l).details.bhk)).sort((a, b) => parseInt(a.name) - parseInt(b.name)),
    [leads],
  );

  /* ---- drill-down ---- */
  const [drawer, setDrawer] = useState<{ title: string; leads: AdminLead[] } | null>(null);
  const segment = (title: string, f: (l: AdminLead) => boolean) =>
    setDrawer({ title, leads: leads.filter(f).sort((a, b) => b.score - a.score) });

  /* ---- export ---- */
  const exportCsv = () => {
    const head = ["Lead ID", "Name", "Phone", "City", "Project", "Locality (extracted)", "BHK", "Budget", "Amenities", "Score", "Type", "Status", "Sentiment", "Intent", "Created", "Last call"];
    const rows = leads.map((l) => {
      const d = leadInsights(l).details;
      return [l.id, l.name, l.phone, l.city, l.project, d.locality ?? "", d.bhk ?? "", d.budget ?? "", d.amenities ?? "", l.score, l.band, STATUS_LABEL[l.status], l.sentiment, l.intent,
        new Date(l.createdAt).toISOString(), new Date(l.calls[l.calls.length - 1].at).toISOString()];
    });
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `estateiq-analytics-${range}-${city.toLowerCase()}${project ? `-${project}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const projectName = PROJECTS.find((p) => p.id === project)?.name;

  if (error) return <LoadError message={`Couldn't load analytics: ${error}`} onRetry={reload} />;
  if (loading && !all.length) return <Loading label="Loading analytics…" />;

  return (
    <div className="space-y-8 max-w-screen-2xl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterTabs label="Date range" value={range} onChange={setRange} options={RANGES} />
          <p className="text-small text-ink-muted tnum">
            {cur.totalLeads} leads · {cur.totalCalls} calls{projectName ? ` · ${projectName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="relative">
            <span className="sr-only">Project</span>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className={cn(
                "h-9 pl-3 pr-8 rounded-control border bg-surface text-body outline-none focus-visible:shadow-focus cursor-pointer",
                project ? "border-accent text-ink" : "border-border text-ink-soft",
              )}
            >
              <option value="">All projects</option>
              {PROJECTS.filter((p) => city === "All" || p.city === city).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <FilterTabs
            label="City"
            value={city}
            onChange={(v) => { setCity(v); setProject(""); }}
            options={(["All", "Nashik", "Pune"] as CityFilter[]).map((id) => ({ id, label: id }))}
          />
          <Button variant="secondary" className="h-9" onClick={exportCsv}><Download size={14} strokeWidth={1.5} /> Export CSV</Button>
          <Button variant="secondary" className="h-9" onClick={() => window.print()}><Printer size={14} strokeWidth={1.5} /> Print / PDF</Button>
        </div>
      </div>

      {/* 1. Trends */}
      <Section title="Trends" sub="How enquiries, conversion and caller mood move over the selected range.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Panel title="Enquiries over time" sub="Calls received" className="md:col-span-2" empty={!cur.totalCalls}>
            <CallsOverTime calls={cur.calls} range={range} from={w.from} c={c} animate={animate} />
          </Panel>
          <Panel title="Conversion rate trend" sub={range === "30d" ? "Week over week · by lead created" : "By lead created"} empty={!cur.totalLeads}>
            <PctLine data={conversionTrend} c={c} animate={animate} />
          </Panel>
          <Panel title="Sentiment trend" sub="Share of calls" className="md:col-span-2" empty={!cur.totalCalls}>
            <SentimentArea data={sentimentTrend} c={c} animate={animate} />
          </Panel>
          <Panel title="City split" sub="Target 60 / 40 (outer ring)" empty={!cur.totalLeads}>
            <CitySplit leads={leads} c={c} animate={animate} onPick={(name) => segment(`${name} leads`, (l) => l.city === name)} />
          </Panel>
        </div>
      </Section>

      {/* 2. Performance */}
      <Section title="Performance" sub="Business results — and whether the lead score predicts them.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Panel title="Status funnel" sub="Not contacted → contacted → visit → converted / lost" empty={!cur.totalLeads}>
            <Funnel leads={leads} c={c} animate={animate} />
          </Panel>
          <Panel title="Conversion by project" sub="% of each project's leads converted" empty={!convByProject.length}>
            <HBar data={convByProject} c={c} animate={animate} fill={c.accent} width={112}
              onPick={(name) => segment(`${name} · converted`, (l) => l.project === name && isConverted(l.status))} />
          </Panel>
          <Panel title="Conversion by lead type" sub="Hot should convert best" empty={!cur.totalLeads}>
            <PctColumns data={convByType} c={c} animate={animate} colors={[c.hot, c.warm, c.cold]}
              onPick={(name) => segment(`${name} leads`, (l) => l.band === name)} />
          </Panel>
          <Panel title="Score vs outcome" sub="Conversion rate by lead score band" className="md:col-span-2 xl:col-span-3" empty={!cur.totalLeads}>
            <PctColumns data={scoreOutcome} c={c} animate={animate} colors={scoreOutcome.map((_, i) => (i >= 3 ? c.hot : i === 2 ? c.warm : c.cold))} />
            <p className="text-body text-ink-soft mt-3"><span className="font-medium text-ink">Takeaway:</span> {takeaway}</p>
          </Panel>
        </div>
      </Section>

      {/* 3. Demand insights */}
      <Section title="Demand insights" sub="What callers are asking for — from our transcript extraction (NER).">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Panel title="Top projects by enquiries" empty={!cur.totalLeads}>
            <TopProjects outline leads={leads} c={c} animate={animate} onPick={(name) => segment(name, (l) => l.project === name)} />
          </Panel>
          <Panel title="Budget distribution" sub={`From extracted budget · ${NER_NOTE}`} empty={!cur.totalLeads}>
            <Budget leads={leads} c={c} animate={animate} />
          </Panel>
          <Panel title="BHK demand" sub={NER_NOTE} empty={!bhk.length}>
            <CountColumns outline data={bhk} c={c} animate={animate}
              onPick={(name) => segment(`Asked for ${name}`, (l) => leadInsights(l).details.bhk === name)} />
          </Panel>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <Panel title="Top localities requested" sub={`From the locations callers mentioned. ${NER_NOTE}`} empty={!localities.length}>
            <HBar data={localities} c={c} animate={animate} fill={c.accent} width={112} className="h-80"
              onPick={(name) => segment(`Asked about ${name}`, (l) => leadInsights(l).details.locality === name)} />
          </Panel>
          <Panel title="Most requested amenities" sub={`From amenities callers mentioned. ${NER_NOTE}`} empty={!amenities.length}>
            <HBar outline data={amenities} c={c} animate={animate} fill={c.accent} width={124} className="h-80"
              onPick={(name) => segment(`Asked for ${name}`, (l) => amenitiesOf(l).includes(name))} />
          </Panel>
        </div>
      </Section>

      <LeadsDrawer data={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}

/* ---------------- pieces ---------------- */

function Section({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const id = `sec-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="space-y-3 break-inside-avoid">
      <div>
        <h2 id={id} className="font-display font-semibold text-h2 tracking-tight">{title}</h2>
        <p className="text-small text-ink-muted mt-0.5">{sub}</p>
      </div>
      {children}
    </section>
  );
}

const H = "h-56";
type Pct = { name: string; value: number; n: number };

/** Single-series % line (conversion trend). */
function PctLine({ data, c, animate }: { data: { label: string; rate: number; n: number }[]; c: ChartColors; animate: boolean }) {
  return (
    <div className={H}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.border} />
          <XAxis dataKey="label" {...axis(c)} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...axis(c)} tickFormatter={(v) => `${v}%`} domain={[0, (max: number) => Math.max(10, Math.ceil(max / 10) * 10)]} />
          <Tooltip {...tooltip(c)} cursor={{ stroke: c.border }} formatter={(v: number, _n, p) => [`${v}% (${p.payload.n} leads)`, "Converted"]} />
          <Line type="monotone" dataKey="rate" stroke={c.positive} strokeWidth={2} dot={{ r: 3, fill: c.positive }} isAnimationActive={animate} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 100% stacked sentiment share over time. */
function SentimentArea({ data, c, animate }: { data: Record<string, number | string>[]; c: ChartColors; animate: boolean }) {
  const col: Record<string, string> = { Positive: c.positive, Neutral: c.neutral, Negative: c.negative };
  return (
    <div className={H}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.border} />
          <XAxis dataKey="label" {...axis(c)} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...axis(c)} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <Tooltip {...tooltip(c)} cursor={{ stroke: c.border }} formatter={(v: number, name) => [`${v}%`, name]} />
          <Legend verticalAlign="top" align="right" height={24} iconType="circle" iconSize={8} wrapperStyle={{ color: c["ink-soft"] }} />
          {SENTIMENT_LABELS.map((s) => (
            <Area key={s} type="monotone" dataKey={s} stackId="1" stroke={col[s]} fill={col[s]} fillOpacity={0.35} isAnimationActive={animate} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical % columns with the rate on top and lead count in the tooltip. */
function PctColumns({ data, c, animate, colors, onPick }: { data: Pct[]; c: ChartColors; animate: boolean; colors: string[]; onPick?: (name: string) => void }) {
  return (
    <div className={H}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.border} />
          <XAxis dataKey="name" {...axis(c)} interval={0} />
          <YAxis {...axis(c)} tickFormatter={(v) => `${v}%`} />
          <Tooltip {...tooltip(c)} formatter={(v: number, _n, p) => [`${v}% of ${p.payload.n} leads`, "Converted"]} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={animate} label={{ position: "top", fill: c["ink-soft"], formatter: (v: number) => `${v}%` }}
            className={onPick ? "cursor-pointer" : undefined}
            onClick={onPick ? (d: { name?: string }) => d?.name && onPick(d.name) : undefined}>
            {data.map((d, i) => <Cell key={d.name} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical count columns (BHK demand). */
function CountColumns({ data, c, animate, onPick, outline = false }: { data: { name: string; value: number }[]; c: ChartColors; animate: boolean; onPick?: (name: string) => void; outline?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const track = outline
    ? { accessibilityLayer: true, onMouseMove: (st: { activeTooltipIndex?: number }) => setActive(st?.activeTooltipIndex ?? null), onMouseLeave: () => setActive(null) }
    : {};
  return (
    <div className={H} onBlur={outline ? () => setActive(null) : undefined}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -24, bottom: 0 }} {...track}>
          <CartesianGrid vertical={false} stroke={c.border} />
          <XAxis dataKey="name" {...axis(c)} interval={0} />
          <YAxis allowDecimals={false} {...axis(c)} />
          <Tooltip {...tooltip(c)} />
          <Bar dataKey="value" name="Leads" fill={c.accent} radius={[4, 4, 0, 0]} isAnimationActive={animate} label={{ position: "top", fill: c["ink-soft"] }}
            className={onPick ? "cursor-pointer" : undefined}
            onClick={onPick ? (d: { name?: string }) => d?.name && onPick(d.name) : undefined}>
            {outline && data.map((d, i) => <Cell key={d.name} {...outlineCell(c, i === active)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
