import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { formatPercent, formatDuration } from '@/lib/format'
import type {
  Benchmarks,
  Campaign,
  CampaignMetrics,
  CampaignTargetResult,
  MetricBenchmark,
  TargetOutcome,
} from '@/types'

export interface CampaignPdfArgs {
  campaign: Campaign
  templateName: string | null
  groupName: string | null
  profileName: string | null
  targetCount: number
  metrics: CampaignMetrics
  targets: CampaignTargetResult[]
  benchmarks: Benchmarks | null
}

/** Plain-text interpretation of a rate metric vs its benchmark. */
function interpretRate(
  key: 'click_rate' | 'report_rate',
  value: number,
  b: MetricBenchmark,
): string {
  const bv = b.value as number
  const pct = formatPercent(bv)
  if (key === 'click_rate') {
    if (value > bv + 0.05) return `Above the industry average (${pct}) — higher susceptibility than the benchmark.`
    if (value < bv - 0.05) return `Below the industry average (${pct}) — lower susceptibility than the benchmark.`
    return `Approximately at the industry average (${pct}).`
  }
  // report_rate — higher is better
  if (value >= bv) return `At or above the mature-programme reporting threshold (${pct}).`
  return `Below the mature-programme reporting threshold (${pct}).`
}

/** jspdf-autotable sets `lastAutoTable` on the doc at runtime but doesn't
 *  declare it on the jsPDF type; read the final Y through this narrow accessor. */
function lastTableBottom(doc: jsPDF): number {
  const table = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
  return table?.finalY ?? 0
}

const OUTCOME_LABELS: Record<TargetOutcome, string> = {
  clicked: 'Clicked',
  reported: 'Reported',
  no_action: 'No action',
  not_sent: 'Not sent',
}

/** Turn a campaign name into a filesystem-safe slug for the PDF filename. */
function sanitizeFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'campaign'
}

/** Local date as YYYY-MM-DD for the filename. */
function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}

function displayName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(' ') || '—'
}

/** Build and download a single-campaign PDF report (numbers and tables only —
 *  no charts, per the feature spec). Uses only data already loaded on the page. */
export function exportCampaignPdf(args: CampaignPdfArgs): void {
  const { campaign, templateName, groupName, profileName, targetCount, metrics, targets, benchmarks } = args

  const now = new Date()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 40
  let cursorY = 48

  // --- Header ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Phloris — Campaign Report', marginX, cursorY)

  cursorY += 22
  doc.setFontSize(13)
  doc.text(campaign.name, marginX, cursorY)

  cursorY += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Generated ${now.toLocaleString()}`, marginX, cursorY)
  doc.setTextColor(0)

  cursorY += 12

  // --- Campaign details block ---
  const detailRows: [string, string][] = [
    ['Campaign', campaign.name],
    ['Template', templateName ?? '—'],
    ['Target group', groupName ?? '—'],
    ['Sending profile', profileName ?? '—'],
    ['Status', campaign.status],
    ['Launched', formatDateTime(campaign.launched_at)],
  ]
  if (campaign.completed_at) {
    detailRows.push(['Completed', formatDateTime(campaign.completed_at)])
  }
  detailRows.push(['Total targets', String(targetCount)])

  autoTable(doc, {
    startY: cursorY + 8,
    head: [['Campaign details', '']],
    body: detailRows,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 140 } },
    margin: { left: marginX, right: marginX },
  })

  // --- Behavioural metrics block ---
  const metricsRows: [string, string][] = [
    ['Click rate', formatPercent(metrics.click_rate)],
    ['Reporting rate', formatPercent(metrics.report_rate)],
    ['Average time-to-click', formatDuration(metrics.avg_time_to_click_seconds)],
    ['Average time-to-report', formatDuration(metrics.avg_time_to_report_seconds)],
  ]

  autoTable(doc, {
    startY: lastTableBottom(doc) + 20,
    head: [['Behavioural metric', 'Value']],
    body: metricsRows,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 200 } },
    margin: { left: marginX, right: marginX },
  })

  // --- Benchmark comparison section ---
  if (benchmarks) {
    const benchmarkBody: [string, string, string, string][] = [
      [
        benchmarks.click_rate.label,
        formatPercent(metrics.click_rate),
        benchmarks.click_rate.value !== null
          ? `~${formatPercent(benchmarks.click_rate.value)}\n${benchmarks.click_rate.source ?? ''}`
          : '—\nNo published baseline',
        interpretRate('click_rate', metrics.click_rate, benchmarks.click_rate),
      ],
      [
        benchmarks.report_rate.label,
        formatPercent(metrics.report_rate),
        benchmarks.report_rate.value !== null
          ? `≥${formatPercent(benchmarks.report_rate.value)}\n${benchmarks.report_rate.source ?? ''}`
          : '—\nNo published baseline',
        interpretRate('report_rate', metrics.report_rate, benchmarks.report_rate),
      ],
      [
        benchmarks.avg_time_to_click.label,
        formatDuration(metrics.avg_time_to_click_seconds),
        '—\nNo published baseline',
        benchmarks.avg_time_to_click.note ?? '',
      ],
      [
        benchmarks.avg_time_to_report.label,
        formatDuration(metrics.avg_time_to_report_seconds),
        '—\nNo published baseline',
        benchmarks.avg_time_to_report.note ?? '',
      ],
    ]

    autoTable(doc, {
      startY: lastTableBottom(doc) + 20,
      head: [['Metric', 'This campaign', 'Baseline & source', 'Interpretation']],
      body: benchmarkBody,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 110 },
        1: { cellWidth: 70 },
        2: { cellWidth: 130 },
        3: { cellWidth: 'auto' },
      },
      margin: { left: marginX, right: marginX },
    })
  }

  // --- Per-target results table ---
  const targetBody = targets.map((t) => [
    t.email,
    displayName(t.first_name, t.last_name),
    OUTCOME_LABELS[t.outcome],
    formatDuration(t.time_to_click_seconds),
    formatDuration(t.time_to_report_seconds),
  ])

  autoTable(doc, {
    startY: lastTableBottom(doc) + 20,
    head: [['Email', 'Name', 'Outcome', 'Time to click', 'Time to report']],
    body: targetBody.length > 0 ? targetBody : [['No targets', '', '', '', '']],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    margin: { left: marginX, right: marginX },
  })

  // --- Footer on every page ---
  const footer = `Generated by Phloris · ${now.toLocaleString()}`
  const pageCount = doc.getNumberOfPages()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120)
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.text(footer, marginX, pageHeight - 20)
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - marginX, pageHeight - 20, {
      align: 'right',
    })
  }
  doc.setTextColor(0)

  doc.save(`phloris-campaign-${sanitizeFilename(campaign.name)}-${isoDate(now)}.pdf`)
}
