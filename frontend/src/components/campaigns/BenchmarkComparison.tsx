import { formatPercent, formatDuration } from '@/lib/format'
import type { Benchmarks, CampaignMetrics, MetricBenchmark } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BenchmarkRow {
  key: keyof Benchmarks
  campaignValue: string
  baseline: string
  source: string | null
  interpretation: string
  valueColor: string
  interpretColor: string
}

function interpretRate(
  key: 'click_rate' | 'report_rate',
  value: number,
  b: MetricBenchmark,
): { interpretation: string; valueColor: string; interpretColor: string } {
  const bv = b.value as number
  const pct = formatPercent(bv)

  if (key === 'click_rate') {
    if (value > bv + 0.05) {
      return {
        interpretation: `Above the industry average (${pct}) — higher susceptibility than the benchmark.`,
        valueColor: 'text-amber-600',
        interpretColor: 'text-amber-700',
      }
    }
    if (value < bv - 0.05) {
      return {
        interpretation: `Below the industry average (${pct}) — lower susceptibility than the benchmark.`,
        valueColor: 'text-emerald-600',
        interpretColor: 'text-emerald-700',
      }
    }
    return {
      interpretation: `Approximately at the industry average (${pct}).`,
      valueColor: 'text-foreground',
      interpretColor: 'text-muted-foreground',
    }
  }

  // report_rate — higher is better
  if (value >= bv) {
    return {
      interpretation: `At or above the mature-programme reporting threshold (${pct}).`,
      valueColor: 'text-emerald-600',
      interpretColor: 'text-emerald-700',
    }
  }
  return {
    interpretation: `Below the mature-programme reporting threshold (${pct}).`,
    valueColor: 'text-amber-600',
    interpretColor: 'text-amber-700',
  }
}

function buildRows(metrics: CampaignMetrics, benchmarks: Benchmarks): BenchmarkRow[] {
  const rows: BenchmarkRow[] = []

  // --- Click rate ---
  const cr = benchmarks.click_rate
  if (cr.value !== null) {
    const { interpretation, valueColor, interpretColor } = interpretRate(
      'click_rate',
      metrics.click_rate,
      cr,
    )
    rows.push({
      key: 'click_rate',
      campaignValue: formatPercent(metrics.click_rate),
      baseline: `~${formatPercent(cr.value)}`,
      source: cr.source,
      interpretation,
      valueColor,
      interpretColor,
    })
  }

  // --- Report rate ---
  const rr = benchmarks.report_rate
  if (rr.value !== null) {
    const { interpretation, valueColor, interpretColor } = interpretRate(
      'report_rate',
      metrics.report_rate,
      rr,
    )
    rows.push({
      key: 'report_rate',
      campaignValue: formatPercent(metrics.report_rate),
      baseline: `≥${formatPercent(rr.value)}`,
      source: rr.source,
      interpretation,
      valueColor,
      interpretColor,
    })
  }

  // --- Avg time-to-click ---
  const tc = benchmarks.avg_time_to_click
  rows.push({
    key: 'avg_time_to_click',
    campaignValue: formatDuration(metrics.avg_time_to_click_seconds),
    baseline: '—',
    source: null,
    interpretation: tc.note ?? '',
    valueColor: 'text-foreground',
    interpretColor: 'text-muted-foreground',
  })

  // --- Avg time-to-report ---
  const tr = benchmarks.avg_time_to_report
  rows.push({
    key: 'avg_time_to_report',
    campaignValue: formatDuration(metrics.avg_time_to_report_seconds),
    baseline: '—',
    source: null,
    interpretation: tr.note ?? '',
    valueColor: 'text-foreground',
    interpretColor: 'text-muted-foreground',
  })

  return rows
}

interface BenchmarkComparisonProps {
  metrics: CampaignMetrics
  benchmarks: Benchmarks
}

export function BenchmarkComparison({ metrics, benchmarks }: BenchmarkComparisonProps) {
  const rows = buildRows(metrics, benchmarks)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Benchmark comparison</CardTitle>
        <CardDescription>
          Campaign metrics contextualised against industry baselines.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-wrap items-start justify-between gap-x-8 gap-y-2 py-4 first:pt-0 last:pb-0"
            >
              {/* Left: label + interpretation */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{benchmarks[row.key].label}</p>
                <p className={`mt-1 text-xs leading-relaxed ${row.interpretColor}`}>
                  {row.interpretation}
                </p>
              </div>

              {/* Right: campaign value + baseline */}
              <div className="flex shrink-0 gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">This campaign</p>
                  <p className={`mt-0.5 text-sm font-semibold ${row.valueColor}`}>
                    {row.campaignValue}
                  </p>
                </div>
                <div className="min-w-[110px] text-right">
                  <p className="text-xs text-muted-foreground">Baseline</p>
                  <p className="mt-0.5 text-sm font-medium">{row.baseline}</p>
                  {row.source ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.source}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      No published baseline
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
