import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BarChart3, Loader2, MousePointerClick, Flag, Minus } from 'lucide-react'

import { api } from '@/lib/api'
import { formatDuration } from '@/lib/format'
import type {
  ApiEnvelope,
  PerformanceCampaign,
  PerformanceOutcome,
  PerformanceResponse,
} from '@/types'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const OUTCOME: Record<
  PerformanceOutcome,
  { label: string; className: string; Icon: typeof MousePointerClick }
> = {
  clicked: {
    label: 'Clicked the link',
    className: 'border-transparent bg-amber-100 text-amber-800',
    Icon: MousePointerClick,
  },
  reported: {
    label: 'Reported it',
    className: 'border-transparent bg-emerald-100 text-emerald-800',
    Icon: Flag,
  },
  ignored: {
    label: 'No action',
    className: 'border-transparent bg-neutral-100 text-neutral-700',
    Icon: Minus,
  },
}

function CampaignRow({ campaign }: { campaign: PerformanceCampaign }) {
  const outcome = OUTCOME[campaign.outcome]
  const { Icon } = outcome
  return (
    <div className="flex flex-col gap-2 border-b py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{campaign.campaign_name ?? 'Campaign'}</p>
        <p className="mt-1 space-x-3 text-xs text-muted-foreground">
          {campaign.clicked ? (
            <span>Clicked after {formatDuration(campaign.time_to_click_seconds)}</span>
          ) : null}
          {campaign.reported ? (
            <span>Reported after {formatDuration(campaign.time_to_report_seconds)}</span>
          ) : null}
          {!campaign.clicked && !campaign.reported ? (
            <span>You didn't interact with this one — nicely done.</span>
          ) : null}
        </p>
      </div>
      <Badge className={`gap-1.5 ${outcome.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {outcome.label}
      </Badge>
    </div>
  )
}

export function Performance() {
  const { token } = useParams()
  const [data, setData] = useState<PerformanceResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    api
      .get<ApiEnvelope<PerformanceResponse>>(`/api/performance/${token}`)
      .then((r) => {
        setData(r.data.data)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
            <BarChart3 className="h-7 w-7 text-sky-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your simulation results
          </h1>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            {status === 'ok' && data?.first_name
              ? `Hi ${data.first_name} — here's a private summary of how you responded to your security team's simulated phishing emails.`
              : "A private summary of how you responded to your security team's simulated phishing emails."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaigns you received</CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'loading' ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your results…
              </div>
            ) : status === 'error' ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                We couldn't find results for this link. It may have expired or been
                mistyped.
              </p>
            ) : data && data.campaigns.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No simulations have been recorded for you yet.
              </p>
            ) : (
              <div className="divide-y">
                {data?.campaigns.map((c) => (
                  <CampaignRow key={c.campaign_id} campaign={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Only your own results are shown here. No one else's data is accessible from
          this page.
        </p>
      </div>
    </div>
  )
}
