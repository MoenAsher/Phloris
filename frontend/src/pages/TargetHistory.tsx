import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import {
  ArrowLeft,
  MousePointerClick,
  Flag,
  Minus,
  TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

import { api } from '@/lib/api'
import { formatDuration } from '@/lib/format'
import type { ApiEnvelope, TargetHistory as TargetHistoryData } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OutcomeBadge } from '@/components/campaigns/OutcomeBadge'

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data?.error) return String(err.response.data.error)
  if (isAxiosError(err) && err.request) return 'Cannot reach the backend. Is it running on port 5001?'
  return fallback
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '—'
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

const COLORS = { click: '#dc2626', report: '#16a34a' }

export function TargetHistory() {
  const { targetId } = useParams<{ targetId: string }>()
  const [data, setData] = useState<TargetHistoryData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!targetId) {
      setStatus('error')
      setErrorMsg('No target ID provided.')
      return
    }
    setStatus('loading')
    try {
      const resp = await api.get<ApiEnvelope<TargetHistoryData>>(
        `/api/targets/${targetId}/history`,
      )
      setData(resp.data.data)
      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setErrorMsg(errorMessage(err, 'Failed to load target history.'))
    }
  }, [targetId])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  // --- Loading skeleton ---
  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-8 w-12" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-52" />
      </div>
    )
  }

  // --- Error state ---
  if (status === 'error' || !data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-medium text-destructive">{errorMsg ?? 'Something went wrong.'}</p>
          <button
            className="text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground"
            onClick={() => void fetchHistory()}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const { target, campaigns, summary } = data

  const displayName =
    [target.first_name, target.last_name].filter(Boolean).join(' ') || null

  // Trend chart data — one point per campaign in launch order.
  const trendData = campaigns.map((c, i) => ({
    label: c.campaign_name ?? `#${i + 1}`,
    Clicked: c.clicked ? 1 : 0,
    Reported: c.reported ? 1 : 0,
  }))

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{target.email}</h2>
        {displayName ? (
          <p className="text-sm text-muted-foreground">{displayName}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          Campaign history · admin view
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Campaigns received"
          value={summary.total_campaigns}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Clicked"
          value={summary.clicked_count}
          icon={<MousePointerClick className="h-3.5 w-3.5 text-red-500" />}
        />
        <StatCard
          label="Reported"
          value={summary.reported_count}
          icon={<Flag className="h-3.5 w-3.5 text-green-600" />}
        />
        <StatCard
          label="No action"
          value={summary.no_action_count}
          icon={<Minus className="h-3.5 w-3.5 text-neutral-400" />}
        />
      </div>

      {/* Trend chart */}
      {campaigns.length >= 2 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Response trend over time</CardTitle>
            <CardDescription>
              Whether this target clicked or reported each campaign, in launch order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={trendData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={trendData.length > 4 ? -20 : 0}
                  textAnchor={trendData.length > 4 ? 'end' : 'middle'}
                  height={trendData.length > 4 ? 48 : 30}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 1]}
                  tickFormatter={(v: number) => (v === 1 ? 'Yes' : 'No')}
                  width={36}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value === 1 ? 'Yes' : 'No',
                    name,
                  ]}
                />
                <Legend />
                <Line
                  type="stepAfter"
                  dataKey="Clicked"
                  stroke={COLORS.click}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="stepAfter"
                  dataKey="Reported"
                  stroke={COLORS.report}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : campaigns.length === 1 ? (
        <div className="rounded-md border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          Trend chart appears once this target has participated in two or more campaigns.
        </div>
      ) : null}

      {/* Campaign history table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign-by-campaign results</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No campaign data yet — this target has not been sent to in any launched
              campaign.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Launched</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Time to click</TableHead>
                  <TableHead>Time to report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.campaign_id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/campaigns/${c.campaign_id}`}
                        className="hover:underline underline-offset-4"
                      >
                        {c.campaign_name ?? `Campaign #${c.campaign_id}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.launched_at)}
                    </TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={c.outcome} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(c.time_to_click_seconds)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(c.time_to_report_seconds)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/targets"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to targets
    </Link>
  )
}
