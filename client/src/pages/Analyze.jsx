import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import AnimatedNumber from '@/components/AnimatedNumber'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'
import { INTENT_META, NER_ICONS, SENTIMENT_META, SHAP_LABELS, TIER_COLORS, TIER_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const SAMPLE_TRANSCRIPT =
  "Agent: Hello, welcome to our real estate assistant. How can I help you today?\n" +
  'Client: I want a 2BHK in Baner, budget 60 lakhs, swimming pool chahiye, this is amazing!'

export default function Analyze() {
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleAnalyze() {
    if (!transcript.trim()) {
      toast.error('Paste a transcript first.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await api.post('/analyze', { transcript })
      setResult(data)
      toast.success('Analysis complete.')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-gradient">Analyze Lead</h1>
        <p className="mt-1 text-muted-foreground">Paste a call transcript to extract insights</p>
      </div>

      <Card className="glass-card animate-fade-in">
        <CardContent className="flex flex-col gap-4">
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste a call transcript here... e.g. Agent: Hello! Client: I'm looking for a 2BHK in Baner, budget 60 lakhs."
            rows={6}
            className="rounded-xl border-white/10 bg-white/5 text-base focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 resize-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Use sample transcript
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={cn(
                'ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-200',
                'hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0'
              )}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </CardContent>
      </Card>

      {loading && <AnalyzeSkeleton />}

      {error && !loading && (
        <Card className="border-red-500/30 bg-red-500/5 animate-fade-in">
          <CardContent className="text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-6">
          <NERSection ner={result.ner} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SignalCard title="Sentiment" kind="sentiment" data={result.sentiment} />
            <SignalCard title="Intent" kind="intent" data={result.intent} />
          </div>
          <LeadScoreCard leadScore={result.lead_score} />
        </div>
      )}
    </div>
  )
}

function NERSection({ ner }) {
  const items = [
    { key: 'location', label: 'Location', value: ner.location?.join(', ') || '—' },
    { key: 'property_type', label: 'Property Type', value: ner.property_type?.join(', ') || '—' },
    { key: 'budget', label: 'Budget', value: ner.budget || '—' },
    { key: 'amenities', label: 'Amenities', value: ner.amenities || [] },
  ]

  return (
    <div className="animate-slide-in">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Extracted Requirements
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const Icon = NER_ICONS[item.key]
          return (
            <Card key={item.key} className="glass-card hover:border-indigo-500/30 transition-all duration-200">
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{item.label}</span>
                </div>
                {Array.isArray(item.value) ? (
                  item.value.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {item.value.map((v) => (
                        <Badge key={v} variant="outline" className="border-white/15">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">None found</span>
                  )
                ) : (
                  <span className="text-lg font-semibold font-mono">{item.value}</span>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function SignalCard({ title, kind, data }) {
  const isSentiment = kind === 'sentiment'
  const meta = isSentiment ? SENTIMENT_META[data.label] : INTENT_META[data.label]
  const confidencePct = Math.round((data.confidence ?? 0) * 100)
  const reliable = data.reliability === 'ok'

  return (
    <Card className="glass-card animate-slide-in">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
          <Badge
            className={cn(
              'rounded-full',
              reliable ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
            )}
            variant="outline"
          >
            {reliable ? 'Reliable' : 'Low Confidence'}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {isSentiment ? (
            <span className="text-4xl">{meta?.emoji ?? '❓'}</span>
          ) : (
            <div
              className="flex size-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${meta?.color ?? '#94a3b8'}20` }}
            >
              {meta?.icon && <meta.icon className="size-5" style={{ color: meta.color }} />}
            </div>
          )}
          <div>
            <p className="text-xl font-semibold" style={{ color: meta?.color ?? '#f8fafc' }}>
              {data.label ?? 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{confidencePct}% confidence</p>
          </div>
        </div>

        <ProgressBar value={confidencePct} color={meta?.color ?? '#6366f1'} />

        {isSentiment && (
          <div className="flex flex-col gap-2 pt-1">
            {Object.entries(data.scores ?? {}).map(([label, score]) => (
              <MiniBar key={label} label={label} value={score} color={SENTIMENT_META[label]?.color ?? '#94a3b8'} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProgressBar({ value, color }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

function MiniBar({ label, value, color }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 capitalize text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-muted-foreground">{pct}%</span>
    </div>
  )
}

function LeadScoreCard({ leadScore }) {
  const { score, tier, shap_values: shapValues } = leadScore
  const tierColor = TIER_COLORS[tier] ?? '#94a3b8'
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)

  const shapData = Object.entries(shapValues)
    .map(([key, value]) => ({ name: SHAP_LABELS[key] ?? key, value: Number(value.toFixed(2)) }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  return (
    <Card className="glass-card animate-slide-in overflow-hidden">
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative flex size-40 shrink-0 items-center justify-center">
            <svg viewBox="0 0 120 120" className="size-40 -rotate-90">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#ffffff15" strokeWidth="10" />
              <motion.circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={tierColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-bold font-mono">
                <AnimatedNumber value={score} decimals={0} />
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 text-center md:text-left">
            <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Lead Score
            </span>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="relative flex size-2.5">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: tierColor }}
                />
                <span className="relative inline-flex size-2.5 rounded-full" style={{ backgroundColor: tierColor }} />
              </span>
              <Badge
                className="text-sm px-3 py-1 rounded-full border-0"
                style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
              >
                {TIER_LABELS[tier] ?? tier}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              This lead's overall score combines sentiment, extracted requirements, budget signal,
              and engagement into a single 0-100 estimate of purchase readiness.
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Score Breakdown (SHAP)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={shapData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
              <XAxis type="number" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                stroke="#475569"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                {shapData.map((entry) => (
                  <Cell key={entry.name} fill={entry.value >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function AnalyzeSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-48 rounded-xl bg-white/5" />
        <Skeleton className="h-48 rounded-xl bg-white/5" />
      </div>
      <Skeleton className="h-80 rounded-xl bg-white/5" />
    </div>
  )
}
