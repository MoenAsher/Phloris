import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Loader2 } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

import { api } from '@/lib/api'
import { formatPercent, formatDuration } from '@/lib/format'
import type {
  ApiEnvelope,
  Campaign,
  CampaignMetrics,
  CampaignTimeline,
  DashboardOverview,
} from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const COLORS = {
  click: '#dc2626', // red — clicking is the risk signal
  report: '#16a34a', // green — reporting is the desired behaviour
  noAction: '#a3a3a3', // gray
}

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data?.error) return String(err.response.data.error)
  if (isAxiosError(err) && err.request) return 'Cannot reach the backend. Is it running on port 5001?'
  return fallback
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [topError, setTopError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null)
  const [timeline, setTimeline] = useState<CampaignTimeline | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  const fetchTop = useCallback(async () => {
    setTopError(null)
    try {
      const [overviewResp, campaignsResp] = await Promise.all([
        api.get<ApiEnvelope<DashboardOverview>>('/api/dashboard/overview'),
        api.get<ApiEnvelope<Campaign[]>>('/api/campaigns'),
      ])
      setOverview(overviewResp.data.data)
      setCampaigns(campaignsResp.data.data)
    } catch (err) {
      setCampaigns([])
      setTopError(errorMessage(err, 'Failed to load the dashboard.'))
    }
  }, [])

  const fetchCampaignData = useCallback(async (id: number) => {
    setMetrics(null)
    setTimeline(null)
    setDetailError(null)
    try {
      const [metricsResp, timelineResp] = await Promise.all([
        api.get<ApiEnvelope<CampaignMetrics>>(`/api/dashboard/campaigns/${id}/metrics`),
        api.get<ApiEnvelope<CampaignTimeline>>(`/api/dashboard/campaigns/${id}/timeline`),
      ])
      setMetrics(metricsResp.data.data)
      setTimeline(timelineResp.data.data)
    } catch (err) {
      setDetailError(errorMessage(err, 'Failed to load campaign metrics.'))
    }
  }, [])

  useEffect(() => {
    void fetchTop()
  }, [fetchTop])

  // Default to the first campaign once the list loads.
  useEffect(() => {
    if (campaigns === null) return
    setSelectedId((cur) =>
      cur !== null && campaigns.some((c) => c.id === cur) ? cur : (campaigns[0]?.id ?? null),
    )
  }, [campaigns])

  useEffect(() => {
    if (selectedId === null) return
    void fetchCampaignData(selectedId)
  }, [selectedId, fetchCampaignData])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Overview of campaign performance and susceptibility metrics.
        </p>
      </div>

      {/* Overview cards */}
      {topError ? (
        <div className="flex flex-col items-center gap-3 rounded-md border py-10 text-center">
          <p className="text-sm font-medium text-destructive">{topError}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchTop()}>
            Retry
          </Button>
        </div>
      ) : overview === null ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading overview…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Campaigns" value={String(overview.total_campaigns)} />
          <StatCard label="Total Targets" value={String(overview.total_targets)} />
          <StatCard
            label="Overall Click Rate"
            value={formatPercent(overview.overall_click_rate)}
            hint={`${overview.emails_sent} emails sent`}
          />
          <StatCard
            label="Overall Report Rate"
            value={formatPercent(overview.overall_report_rate)}
            hint={`${overview.emails_sent} emails sent`}
          />
        </div>
      )}

      {/* Campaign selector + per-campaign charts */}
      {campaigns && campaigns.length === 0 && !topError ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No campaigns yet. Create and launch one to see metrics here.
          </CardContent>
        </Card>
      ) : null}

      {campaigns && campaigns.length > 0 ? (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Campaign metrics</CardTitle>
              <CardDescription>Behavioural breakdown for a single campaign.</CardDescription>
            </div>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            {detailError ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm font-medium text-destructive">{detailError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedId !== null && void fetchCampaignData(selectedId)}
                >
                  Retry
                </Button>
              </div>
            ) : metrics === null || timeline === null ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading metrics…
              </div>
            ) : metrics.sent_count === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                This campaign has no activity yet — launch it to record “sent” events
                and start collecting metrics.
              </div>
            ) : (
              <CampaignCharts metrics={metrics} timeline={timeline} />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function CampaignCharts({
  metrics,
  timeline,
}: {
  metrics: CampaignMetrics
  timeline: CampaignTimeline
}) {
  const barData = [
    { name: 'Click rate', value: Number((metrics.click_rate * 100).toFixed(1)), fill: COLORS.click },
    { name: 'Report rate', value: Number((metrics.report_rate * 100).toFixed(1)), fill: COLORS.report },
  ]

  const pieData = [
    { name: 'Clicked', value: metrics.clicked_count, color: COLORS.click },
    { name: 'Reported', value: metrics.reported_count, color: COLORS.report },
    { name: 'No action', value: metrics.no_action_count, color: COLORS.noAction },
  ].filter((d) => d.value > 0)

  const lineData = timeline.points.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    Clicks: p.cumulative_clicks,
    Reports: p.cumulative_reports,
  }))

  return (
    <div className="space-y-6">
      {/* Stat cards: the four behavioural metrics as numbers */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Click rate" value={formatPercent(metrics.click_rate, 1)} hint={`${metrics.clicked_count} of ${metrics.sent_count} clicked`} />
        <StatCard label="Report rate" value={formatPercent(metrics.report_rate, 1)} hint={`${metrics.reported_count} of ${metrics.sent_count} reported`} />
        <StatCard label="Avg time-to-click" value={formatDuration(metrics.avg_time_to_click_seconds)} hint="mean over clickers" />
        <StatCard label="Avg time-to-report" value={formatDuration(metrics.avg_time_to_report_seconds)} hint="mean over reporters" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar: click vs report rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Click rate vs report rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie: outcomes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <ChartEmpty message="No outcomes yet." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Counts are per distinct target; someone who both clicked and reported
              is counted in each.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Line: events over time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clicks and reports over time</CardTitle>
        </CardHeader>
        <CardContent>
          {lineData.length === 0 ? (
            <ChartEmpty message="No click or report events yet." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Clicks" stroke={COLORS.click} strokeWidth={2} />
                <Line type="monotone" dataKey="Reports" stroke={COLORS.report} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
