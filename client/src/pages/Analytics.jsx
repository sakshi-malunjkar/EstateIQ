import { Flame, Gauge, Layers, Snowflake, Sun, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AnimatedNumber from '@/components/AnimatedNumber'
import { ErrorState } from '@/components/StateViews'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api'
import { INTENT_META, SENTIMENT_META, TIER_COLORS } from '@/lib/constants'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/analytics')
      setData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <AnalyticsSkeleton />
  if (error) return <ErrorState message={error} onRetry={fetchAnalytics} />
  if (!data) return null

  const statCards = [
    { label: 'Total Leads', value: data.total_leads, icon: Layers, color: '#6366f1' },
    { label: 'Hot Leads', value: data.hot_count, icon: Flame, color: TIER_COLORS.hot },
    { label: 'Warm Leads', value: data.warm_count, icon: Sun, color: TIER_COLORS.warm },
    { label: 'Cold Leads', value: data.cold_count, icon: Snowflake, color: TIER_COLORS.cold },
    {
      label: 'Avg Score',
      value: data.avg_score ?? 0,
      icon: Gauge,
      color: '#8b5cf6',
      decimals: 1,
    },
    {
      label: 'Conversion Rate',
      value: data.conversion_rate,
      icon: TrendingUp,
      color: '#22c55e',
      decimals: 1,
      suffix: '%',
    },
  ]

  const tierData = [
    { name: 'Hot', value: data.hot_count, color: TIER_COLORS.hot },
    { name: 'Warm', value: data.warm_count, color: TIER_COLORS.warm },
    { name: 'Cold', value: data.cold_count, color: TIER_COLORS.cold },
  ]

  const sentimentData = Object.entries(data.sentiment_distribution ?? {}).map(([name, value]) => ({
    name,
    value,
    color: SENTIMENT_META[name]?.color ?? '#94a3b8',
  }))

  const intentData = Object.entries(data.intent_distribution ?? {}).map(([name, value]) => ({
    name,
    value,
    color: INTENT_META[name]?.color ?? '#94a3b8',
  }))

  return (
    <div className="flex flex-col gap-8">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-gradient">Analytics Overview</h1>
        <p className="mt-1 text-muted-foreground">Portfolio-level insights across all leads</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</span>
              <s.icon className="size-4" style={{ color: s.color }} />
            </div>
            <p className="mt-2 text-3xl font-bold font-mono" style={{ color: s.color }}>
              <AnimatedNumber value={s.value} decimals={s.decimals ?? 0} suffix={s.suffix ?? ''} />
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card animate-fade-in">
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tier Breakdown</h2>
            {data.total_leads === 0 ? (
              <NoData />
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={220} className="max-w-[220px]">
                  <PieChart>
                    <Pie
                      data={tierData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {tierData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#16181f', border: '1px solid #ffffff1a', borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {tierData.map((t) => (
                    <div key={t.name} className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-muted-foreground">{t.name}</span>
                      <span className="font-mono font-medium">{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card animate-fade-in">
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sentiment Distribution
            </h2>
            {sentimentData.length === 0 ? (
              <NoData />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sentimentData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={90} stroke="#475569" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#16181f', border: '1px solid #ffffff1a', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {sentimentData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card animate-fade-in lg:col-span-2">
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Intent Distribution
            </h2>
            {intentData.length === 0 ? (
              <NoData />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={intentData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} stroke="#475569" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#16181f', border: '1px solid #ffffff1a', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {intentData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function NoData() {
  return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <Skeleton className="h-10 w-64 rounded-lg bg-white/5" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  )
}
