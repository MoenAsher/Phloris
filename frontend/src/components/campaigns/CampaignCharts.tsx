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

import { formatPercent, formatDuration } from '@/lib/format'
import type { CampaignMetrics, CampaignTimeline } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardDescription } from '@/components/ui/card'

const COLORS = {
  click: '#dc2626',
  report: '#16a34a',
  noAction: '#a3a3a3',
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

export function CampaignCharts({
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
