import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Mail, Phone } from "lucide-react";
import { STATUS_LABEL } from "@/api/status";
import { ApiError } from "@/api/http";
import { getLead } from "@/api/leads";
import { ScoreBadge } from "@/components/ScoreBadge";
import { EnquiryDetailsCard } from "@/components/EnquiryDetailsCard";
import { SentimentChip } from "@/components/SentimentChip";
import { IntentChip } from "@/components/IntentChip";
import { Transcript } from "@/components/Transcript";
import { WhyThisScore } from "@/components/WhyThisScore";
import { MODELS, SENTIMENT_CONFIDENCE_THRESHOLD, fmtDuration, type AdminLeadDetail } from "../format";
import { useStatusSync, withStatus } from "../leadsStore";
import { LoadError, Loading } from "../components/LoadState";
import { StatusSelect } from "./Leads";

const fmtDateTime = (t: number) =>
  new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Lead Detail (§11.3) — everything about one lead, loaded from GET /leads/{id}. */
export function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState<AdminLeadDetail | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) return;
    let live = true;
    setLead(null);
    setError(null);
    getLead(id)
      .then((l) => { if (live) setLead(l); })
      .catch((e) => {
        if (!live) return;
        setError({ message: e instanceof Error ? e.message : "Could not load this lead.", notFound: e instanceof ApiError && e.status === 404 });
      });
    return () => { live = false; };
  }, [id, attempt]);

  // A status change made from this page (or anywhere else) updates the open lead.
  useStatusSync((leadId, status, at) => setLead((l) => (l ? withStatus(l, leadId, status, at) : l)));

  if (error?.notFound) {
    return (
      <div className="max-w-xl rounded-card border border-border bg-surface p-8">
        <h2 className="font-semibold text-h3">Lead not found</h2>
        <p className="text-body text-ink-soft mt-1">There's no lead with id “{id}”.</p>
        <Link to="/leads" className="inline-block mt-4 text-small font-medium text-accent-ink hover:underline">← Back to leads</Link>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-4 max-w-xl">
        <LoadError message={`Couldn't load this lead: ${error.message}`} onRetry={() => setAttempt((n) => n + 1)} />
        <Link to="/leads" className="inline-block text-small font-medium text-accent-ink hover:underline">← Back to leads</Link>
      </div>
    );
  }
  if (!lead) return <Loading label="Loading lead…" />;
  return <LeadDetailBody lead={lead} />;
}

function LeadDetailBody({ lead: l }: { lead: AdminLeadDetail }) {
  const calls = [...l.calls].map((c, i) => ({ c, i })).reverse(); // newest first
  const source = l.transcripts[l.transcripts.length - 1]?.metadata.source;

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <Link to="/leads" className="inline-flex items-center gap-1 text-small text-ink-soft hover:text-ink rounded-control">
        <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" /> All leads
      </Link>

      {/* Header */}
      <header className="rounded-card border border-border bg-surface p-4 lg:p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-h1 tracking-tight">{l.name}</h2>
          <p className="text-body text-ink-soft mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {l.phone && (
              <a href={`tel:${l.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 tnum hover:text-accent-ink rounded-control">
                <Phone size={14} strokeWidth={1.5} aria-hidden="true" /> {l.phone}
              </a>
            )}
            {l.email && (
              <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 hover:text-accent-ink rounded-control">
                <Mail size={14} strokeWidth={1.5} aria-hidden="true" /> {l.email}
              </a>
            )}
            <span aria-hidden="true" className="text-ink-muted">·</span>
            <span>{l.locality !== "—" ? `${l.locality}, ` : ""}{l.city}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ScoreBadge score={l.score} band={l.band} provisional={MODELS.provisional} />
          <StatusSelect lead={l} />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] items-start">
        {/* Left: requirements + calls */}
        <div className="space-y-6 min-w-0">
          <EnquiryDetailsCard details={l.details} friendly={false} />

          <section aria-labelledby="calls-title" className="space-y-3">
            <h3 id="calls-title" className="font-semibold text-h2">
              Calls <span className="text-ink-muted font-normal tnum">({l.calls.length})</span>
            </h3>
            {calls.map(({ c, i }, n) => {
              const tr = l.transcripts[i];
              return (
                // Native <details>: keyboard + screen-reader friendly; newest call open by default.
                <details key={c.id} open={n === 0} className="group rounded-card border border-border bg-surface">
                  <summary className="list-none cursor-pointer px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card focus-visible:shadow-focus [&::-webkit-details-marker]:hidden">
                    <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" className="text-ink-muted transition-transform duration-base group-open:rotate-180" />
                    <span className="font-medium">Call {i + 1}</span>
                    <span className="text-body text-ink-soft tnum">{fmtDateTime(c.at)}</span>
                    {c.durationSec > 0 && <span className="text-body text-ink-soft tnum">{fmtDuration(c.durationSec)}</span>}
                    <span className="flex flex-wrap items-center gap-2 ml-auto">
                      <SentimentChip label={c.sentiment} confidence={c.confidence} threshold={SENTIMENT_CONFIDENCE_THRESHOLD} />
                      <IntentChip intent={c.intent} />
                    </span>
                  </summary>
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    <p className="text-small text-ink-muted tnum">Timestamp {new Date(c.at).toISOString()} · highlighted words are what the AI extracted</p>
                    {tr.turns.length ? (
                      <Transcript turns={tr.turns} youLabel={l.name.split(" ")[0]} highlights={tr.highlights} />
                    ) : (
                      <p className="text-body text-ink-muted">No transcript was saved for this call.</p>
                    )}
                    <details className="group/tech rounded-control border border-border">
                      <summary className="list-none cursor-pointer px-3 py-2 text-small font-medium text-ink-soft hover:text-ink flex items-center gap-1.5 rounded-control focus-visible:shadow-focus [&::-webkit-details-marker]:hidden">
                        <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" className="transition-transform duration-base group-open/tech:rotate-180" />
                        Technical details <span className="font-normal text-ink-muted">(call_metadata)</span>
                      </summary>
                      <pre className="px-3 pb-3 text-small text-ink-soft overflow-x-auto font-mono">{JSON.stringify(tr.metadata, null, 2)}</pre>
                    </details>
                  </div>
                </details>
              );
            })}
          </section>
        </div>

        {/* Right: SHAP + other info */}
        <aside className="space-y-6 min-w-0">
          <WhyThisScore
            score={l.score}
            band={l.band}
            bars={l.shap}
            provisional={MODELS.provisional}
            modelVersion={MODELS.scoring}
            scoredAt={fmtDateTime(l.scoredAt)}
          />

          <section aria-labelledby="info-title" className="rounded-card border border-border bg-surface p-4">
            <h3 id="info-title" className="font-semibold text-h3 mb-3">Lead info</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-body">
              <dt className="text-ink-soft">Lead ID</dt><dd className="tnum">{l.id}</dd>
              <dt className="text-ink-soft">Created</dt><dd className="tnum">{fmtDateTime(l.createdAt)}</dd>
              <dt className="text-ink-soft">Source</dt><dd>{typeof source === "string" && source ? source : "—"}</dd>
              <dt className="text-ink-soft">Status</dt><dd>{STATUS_LABEL[l.status]} <span className="text-ink-muted">· since {fmtDate(l.statusChangedAt)}</span></dd>
              <dt className="text-ink-soft">Calls</dt><dd className="tnum">{l.calls.length}</dd>
            </dl>
            {l.sentimentLowConfidence && (
              <p className="text-small text-ink-muted mt-4">The tone reading on this lead is low-confidence, so treat the score with care.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
