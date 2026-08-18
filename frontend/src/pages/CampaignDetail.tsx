import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import {
  ArrowLeft,
  Flag,
  Loader2,
  Rocket,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

import { api } from '@/lib/api'
import type {
  ApiEnvelope,
  Campaign,
  CampaignMetrics,
  CampaignTargetResult,
  CampaignTimeline,
  LaunchResult,
  Template,
  TargetGroup,
} from '@/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/campaigns/StatusBadge'
import { OutcomeBadge } from '@/components/campaigns/OutcomeBadge'
import { CampaignCharts } from '@/components/campaigns/CampaignCharts'

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data?.error) return String(err.response.data.error)
  if (isAxiosError(err) && err.request) return 'Cannot reach the backend. Is it running on port 5001?'
  return fallback
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}

export function CampaignDetail() {
  const { id } = useParams()
  const campaignId = Number(id)

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [group, setGroup] = useState<TargetGroup | null>(null)
  const [targets, setTargets] = useState<CampaignTargetResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null)
  const [timeline, setTimeline] = useState<CampaignTimeline | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null)

  const [completeOpen, setCompleteOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    setError(null)
    try {
      const [campaignResp, templatesResp, groupsResp, targetsResp, metricsResp, timelineResp] =
        await Promise.all([
          api.get<ApiEnvelope<Campaign>>(`/api/campaigns/${campaignId}`),
          api.get<ApiEnvelope<Template[]>>('/api/templates'),
          api.get<ApiEnvelope<TargetGroup[]>>('/api/target-groups'),
          api.get<ApiEnvelope<{ targets: CampaignTargetResult[] }>>(
            `/api/dashboard/campaigns/${campaignId}/targets`,
          ),
          api.get<ApiEnvelope<CampaignMetrics>>(`/api/dashboard/campaigns/${campaignId}/metrics`),
          api.get<ApiEnvelope<CampaignTimeline>>(`/api/dashboard/campaigns/${campaignId}/timeline`),
        ])
      const c = campaignResp.data.data
      setCampaign(c)
      setTemplate(templatesResp.data.data.find((t) => t.id === c.template_id) ?? null)
      setGroup(groupsResp.data.data.find((g) => g.id === c.target_group_id) ?? null)
      setTargets(targetsResp.data.data.targets)
      setMetrics(metricsResp.data.data)
      setTimeline(timelineResp.data.data)
    } catch (err) {
      setError(errorMessage(err, 'Failed to load the campaign.'))
    }
  }, [campaignId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  async function confirmLaunch() {
    setLaunching(true)
    setLaunchError(null)
    try {
      const resp = await api.post<ApiEnvelope<LaunchResult>>(
        `/api/campaigns/${campaignId}/launch`,
      )
      setLaunchResult(resp.data.data)
      setConfirmOpen(false)
      await fetchDetail()
    } catch (err) {
      setLaunchError(errorMessage(err, 'Launch failed.'))
    } finally {
      setLaunching(false)
    }
  }

  async function confirmComplete() {
    setCompleting(true)
    setCompleteError(null)
    try {
      await api.post<ApiEnvelope<Campaign>>(`/api/campaigns/${campaignId}/complete`)
      setCompleteOpen(false)
      await fetchDetail()
    } catch (err) {
      setCompleteError(errorMessage(err, 'Could not complete campaign.'))
    } finally {
      setCompleting(false)
    }
  }

  // --- Loading / error gates ---
  if (error && campaign === null) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchDetail()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (campaign === null) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading campaign…
        </div>
      </div>
    )
  }

  const targetCount = group?.target_count ?? 0
  const alreadyLaunched = campaign.status === 'running' || campaign.status === 'completed'
  const canLaunch = !alreadyLaunched && targetCount > 0

  // Outcome summary counts (from the per-target results).
  const summary = (targets ?? []).reduce(
    (acc, t) => {
      acc[t.outcome] += 1
      return acc
    },
    { clicked: 0, reported: 0, no_action: 0, not_sent: 0 } as Record<string, number>,
  )

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">{campaign.name}</h2>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Template: <span className="font-medium text-foreground">{template?.name ?? '—'}</span>
            {' · '}
            Target group: <span className="font-medium text-foreground">{group?.name ?? '—'}</span>
            {' '}({targetCount} target{targetCount === 1 ? '' : 's'})
          </p>
          <p className="text-xs text-muted-foreground">
            Launched: {formatDate(campaign.launched_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="gap-2"
            disabled={!canLaunch}
            title={
              alreadyLaunched
                ? 'This campaign has already been launched.'
                : targetCount === 0
                  ? 'The target group has no targets.'
                  : undefined
            }
            onClick={() => {
              setLaunchError(null)
              setConfirmOpen(true)
            }}
          >
            <Rocket className="h-4 w-4" />
            {alreadyLaunched ? 'Launched' : 'Launch Campaign'}
          </Button>

          {campaign.status === 'running' && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setCompleteError(null)
                setCompleteOpen(true)
              }}
            >
              <Flag className="h-4 w-4" />
              Mark as Completed
            </Button>
          )}
        </div>
      </div>

      {/* Post-launch summary banner */}
      {launchResult ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Launched: {launchResult.sent_count} of {launchResult.total_targets} email
            {launchResult.total_targets === 1 ? '' : 's'} sent.
          </p>
          {launchResult.failed.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="flex items-center gap-2 font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                {launchResult.failed.length} send{launchResult.failed.length === 1 ? '' : 's'} failed:
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto pl-6 text-muted-foreground">
                {launchResult.failed.map((f) => (
                  <li key={f.target_id} className="list-disc">
                    <span className="font-mono">{f.email}</span> — {f.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Per-campaign charts — only shown once the campaign is active */}
      {campaign.status === 'running' || campaign.status === 'completed'
        ? metrics && timeline
            ? <CampaignCharts metrics={metrics} timeline={timeline} />
            : <p className="text-sm text-muted-foreground">Loading metrics…</p>
        : null}

      {/* Per-target results */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Per-target results</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.clicked} clicked · {summary.reported} reported ·{' '}
              {summary.no_action} no action · {summary.not_sent} not sent
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void fetchDetail()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {targets === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading results…
            </div>
          ) : targets.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              This campaign's target group has no targets.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Time to click</TableHead>
                  <TableHead>Time to report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((t) => (
                  <TableRow key={t.target_id}>
                    <TableCell className="font-medium">{t.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[t.first_name, t.last_name].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={t.outcome} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(t.time_to_click_seconds)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(t.time_to_report_seconds)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Launch confirmation */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <DialogContent className=”max-w-md”>
          <DialogHeader>
            <DialogTitle>Launch this campaign?</DialogTitle>
            <DialogDescription>
              This will send the simulated phishing email to all {targetCount} target
              {targetCount === 1 ? '' : 's'} in{' '}
              <span className=”font-medium”>{group?.name}</span> via the Mailtrap
              sandbox, and record a “sent” event for each. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {launchError ? (
            <p className=”text-sm font-medium text-destructive”>{launchError}</p>
          ) : null}
          <DialogFooter>
            <Button variant=”outline” onClick={() => setConfirmOpen(false)} disabled={launching}>
              Cancel
            </Button>
            <Button className=”gap-2” onClick={() => void confirmLaunch()} disabled={launching}>
              <Rocket className=”h-4 w-4” />
              {launching ? 'Launching…' : 'Launch now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete confirmation */}
      <Dialog open={completeOpen} onOpenChange={(o) => !o && setCompleteOpen(false)}>
        <DialogContent className=”max-w-md”>
          <DialogHeader>
            <DialogTitle>Mark this campaign as completed?</DialogTitle>
            <DialogDescription>
              This will close the campaign and record the completion time. No further
              events will be associated with it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {completeError ? (
            <p className=”text-sm font-medium text-destructive”>{completeError}</p>
          ) : null}
          <DialogFooter>
            <Button variant=”outline” onClick={() => setCompleteOpen(false)} disabled={completing}>
              Cancel
            </Button>
            <Button className=”gap-2” onClick={() => void confirmComplete()} disabled={completing}>
              <Flag className=”h-4 w-4” />
              {completing ? 'Completing…' : 'Mark as completed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/campaigns"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to campaigns
    </Link>
  )
}
