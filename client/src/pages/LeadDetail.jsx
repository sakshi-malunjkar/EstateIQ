import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useNavigate, useParams } from 'react-router-dom'
import AnimatedNumber from '@/components/AnimatedNumber'
import { ErrorState } from '@/components/StateViews'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'
import {
  INTENT_META,
  LOST_REASON_OPTIONS,
  SENTIMENT_META,
  SHAP_LABELS,
  STATUS_OPTIONS,
  TIER_COLORS,
  TIER_LABELS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchLead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchLead() {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const { data } = await api.get(`/leads/${id}`)
      setLead(data)
    } catch (err) {
      if (err.status === 404) setNotFound(true)
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </button>

      {loading ? (
        <DetailSkeleton />
      ) : notFound ? (
        <ErrorState title="Lead not found" message={`No lead with id ${id} exists.`} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLead} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <TranscriptCard lead={lead} />
            {lead.ner && <RequirementsCard ner={lead.ner} />}
            {lead.sentiment && <MiniSignalCard title="Sentiment" kind="sentiment" data={lead.sentiment} />}
            {lead.intent && <MiniSignalCard title="Intent" kind="intent" data={lead.intent} />}
          </div>
          <div className="flex flex-col gap-6">
            {lead.lead_score && <ScoreCard leadScore={lead.lead_score} />}
            <StatusCard lead={lead} onUpdated={setLead} />
          </div>
        </div>
      )}
    </div>
  )
}

function TranscriptCard({ lead }) {
  const lines = (lead.transcript || 'No transcript available.').split('\n')
  return (
    <Card className="glass-card animate-fade-in">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Transcript</h2>
          <Badge variant="outline" className="border-white/15 text-xs">
            Lead #{lead.id}
          </Badge>
        </div>
        <div className="max-h-[200px] overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs leading-relaxed">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-6 shrink-0 select-none text-right text-muted-foreground/50">{i + 1}</span>
              <span className="text-foreground/90 whitespace-pre-wrap">{line}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Phone: {lead.contact_phone || '—'}</span>
          <span>Created: {new Date(lead.created_at).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function RequirementsCard({ ner }) {
  return (
    <Card className="glass-card animate-fade-in">
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Extracted Requirements
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Location" value={ner.location?.join(', ')} />
          <Field label="Property Type" value={ner.property_type?.join(', ')} />
          <Field label="Budget" value={ner.budget} />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Amenities</p>
            {ner.amenities?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {ner.amenities.map((a) => (
                  <Badge key={a} variant="outline" className="border-white/15">
                    {a}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  )
}

function MiniSignalCard({ title, kind, data }) {
  const isSentiment = kind === 'sentiment'
  const meta = isSentiment ? SENTIMENT_META[data.label] : INTENT_META[data.label]
  const confidencePct = Math.round((data.confidence ?? 0) * 100)
  const reliable = data.reliability === 'ok'

  return (
    <Card className="glass-card animate-fade-in">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isSentiment ? (
            <span className="text-2xl">{meta?.emoji ?? '❓'}</span>
          ) : (
            meta?.icon && <meta.icon className="size-5" style={{ color: meta.color }} />
          )}
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="font-semibold" style={{ color: meta?.color }}>
              {data.label ?? '—'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm">{confidencePct}%</p>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              reliable ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'
            )}
          >
            {reliable ? 'Reliable' : 'Low Confidence'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreCard({ leadScore }) {
  const { score, tier, shap_values: shapValues } = leadScore
  const tierColor = TIER_COLORS[tier] ?? '#94a3b8'
  const shapData = Object.entries(shapValues)
    .map(([key, value]) => ({ name: SHAP_LABELS[key] ?? key, value: Number(value.toFixed(2)) }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  return (
    <Card className="glass-card animate-fade-in">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lead Score</p>
            <p className="text-4xl font-bold font-mono" style={{ color: tierColor }}>
              <AnimatedNumber value={score} decimals={1} />
            </p>
          </div>
          <Badge
            className="rounded-full border-0 px-3 py-1"
            style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
          >
            {TIER_LABELS[tier] ?? tier}
          </Badge>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={shapData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
            <XAxis type="number" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis type="category" dataKey="name" width={130} stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
              {shapData.map((entry) => (
                <Cell key={entry.name} fill={entry.value >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function StatusCard({ lead, onUpdated }) {
  const [status, setStatus] = useState(lead.current_status)
  const [notes, setNotes] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await api.patch(`/leads/${lead.id}/status`, {
        status,
        notes: notes.trim() || null,
        lost_reason: status === 'lost' ? lostReason || null : null,
      })
      toast.success('Status updated.')
      setSaved(true)
      setNotes('')
      const { data } = await api.get(`/leads/${lead.id}`)
      onUpdated(data)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="glass-card animate-fade-in">
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Update Status</h2>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full rounded-xl border-white/10 bg-white/5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <AnimatePresence>
          {status === 'lost' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger className="w-full rounded-xl border-white/10 bg-white/5">
                  <SelectValue placeholder="Reason for loss" />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          )}
        </AnimatePresence>

        <Textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-xl border-white/10 bg-white/5 resize-none"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-200',
            saved ? 'bg-green-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110',
            'disabled:opacity-60'
          )}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Status'}
        </button>

        {lead.status_history?.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {[...lead.status_history].reverse().map((event, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {event.status_from ? `${event.status_from} → ` : ''}
                    <span className="text-foreground capitalize">{event.status_to}</span>
                    {event.lost_reason && <span className="text-red-400"> ({event.lost_reason})</span>}
                  </span>
                  <span className="text-muted-foreground/70">
                    {new Date(event.changed_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-56 rounded-xl bg-white/5" />
        <Skeleton className="h-32 rounded-xl bg-white/5" />
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-72 rounded-xl bg-white/5" />
        <Skeleton className="h-48 rounded-xl bg-white/5" />
      </div>
    </div>
  )
}
