import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flame, Layers, Search, Snowflake, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import AnimatedNumber from '@/components/AnimatedNumber'
import { ErrorState, EmptyState } from '@/components/StateViews'
import api from '@/lib/api'
import { INTENT_META, SENTIMENT_META, STATUS_COLORS, TIER_COLORS, TIER_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
const TIER_FILTERS = [
  { value: null, label: 'All' },
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [total, setTotal] = useState(0)
  const [tier, setTier] = useState(null)
  const [search, setSearch] = useState('')
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, skip])

  async function fetchLeads() {
    setLoading(true)
    setError(null)
    try {
      const params = { limit: PAGE_SIZE, skip }
      if (tier) params.tier = tier
      const { data } = await api.get('/leads', { params })
      setLeads(data.leads)
      setTotal(data.total)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleTierChange(value) {
    setTier(value)
    setSkip(0)
  }

  // GET /leads has no text-search query param, so search filters only
  // the currently-loaded page client-side (by id/phone) -- a full
  // cross-dataset search would need a backend change.
  const visibleLeads = search.trim()
    ? leads.filter(
        (l) =>
          String(l.id).includes(search.trim()) ||
          (l.contact_phone ?? '').includes(search.trim()) ||
          (l.name ?? '').toLowerCase().includes(search.trim().toLowerCase())
      )
    : leads

  const stats = [
    { label: 'Total Leads', value: total, icon: Layers, color: '#6366f1' },
    { label: 'Hot', value: leads.filter((l) => l.tier === 'hot').length, icon: Flame, color: TIER_COLORS.hot },
    { label: 'Warm', value: leads.filter((l) => l.tier === 'warm').length, icon: Sun, color: TIER_COLORS.warm },
    { label: 'Cold', value: leads.filter((l) => l.tier === 'cold').length, icon: Snowflake, color: TIER_COLORS.cold },
  ]

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1

  return (
    <div className="flex flex-col gap-8">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-gradient">Lead Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          {/* This page shows leads currently on this filtered page, not the whole dataset, in the tier counts below. */}
          Portfolio overview of all analyzed leads
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </span>
              <s.icon className="size-4" style={{ color: s.color }} />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono" style={{ color: s.color }}>
              <AnimatedNumber value={s.value} />
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in">
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 p-1">
          {TIER_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => handleTierChange(f.value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200',
                tier === f.value
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search this page (id, name, phone)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-white/10 bg-white/5"
          />
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLeads} />
      ) : visibleLeads.length === 0 ? (
        <EmptyState title="No leads found" message="Try a different filter, or analyze a new transcript." />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="overflow-hidden rounded-xl border border-white/10 bg-card/60 backdrop-blur-xl"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Lead</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLeads.map((lead, i) => {
                const sentimentMeta = SENTIMENT_META[lead.sentiment]
                const intentMeta = INTENT_META[lead.intent]
                const tierColor = TIER_COLORS[lead.tier] ?? '#475569'
                const statusColor = STATUS_COLORS[lead.current_status] ?? '#475569'
                return (
                  <TableRow
                    key={lead.id}
                    className={cn(
                      'border-white/5 cursor-pointer transition-colors duration-150 hover:bg-indigo-500/5',
                      i % 2 === 1 && 'bg-white/[0.02]'
                    )}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <TableCell className="font-medium">
                      {lead.name || lead.contact_phone || `Lead #${lead.id}`}
                    </TableCell>
                    <TableCell>
                      {sentimentMeta ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span>{sentimentMeta.emoji}</span>
                          <span style={{ color: sentimentMeta.color }} className="capitalize text-sm">
                            {lead.sentiment}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {intentMeta ? (
                        <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: intentMeta.color }}>
                          <intentMeta.icon className="size-3.5" />
                          {lead.intent}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="w-32">
                      {lead.score != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${lead.score}%`, backgroundColor: tierColor }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">{lead.score.toFixed(1)}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.tier ? (
                        <Badge
                          className="rounded-full border-0 gap-1"
                          style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
                        >
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: tierColor }} />
                          {TIER_LABELS[lead.tier]}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="rounded-full gap-1 capitalize border-white/15"
                        style={{ color: statusColor }}
                      >
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                        {lead.current_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/leads/${lead.id}`)
                        }}
                        className="group inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
                      >
                        View
                        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </motion.div>
      )}

      {!loading && !error && total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground animate-fade-in">
          <span>
            Page {currentPage} of {totalPages} &middot; {total} leads total
          </span>
          <div className="flex gap-2">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200"
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </button>
            <button
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => setSkip(skip + PAGE_SIZE)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200"
            >
              Next
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg bg-white/5" />
      ))}
    </div>
  )
}
