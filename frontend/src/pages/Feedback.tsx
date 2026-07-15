import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShieldCheck, Lightbulb, ArrowRight, Loader2 } from 'lucide-react'

import { api } from '@/lib/api'
import type { ApiEnvelope, FeedbackInfo } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const GENERAL_TIPS = [
  "Check the sender's real email address, not just the display name.",
  'Hover over links to preview where they really go before clicking.',
  "Be cautious of urgency or pressure — 'act now', 'account suspended'.",
  'Never enter your password after following a link in an email; open the site directly.',
  'When something feels off, report it to your security team.',
]

export function Feedback() {
  const { token } = useParams()
  const [info, setInfo] = useState<FeedbackInfo | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    api
      .get<ApiEnvelope<FeedbackInfo>>(`/api/feedback/${token}`)
      .then((r) => {
        setInfo(r.data.data)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Reassuring header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            This was a phishing simulation
          </h1>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            You clicked a link in a simulated phishing email sent by your security
            team. Nothing was harmed and nothing was compromised — there's no need to
            worry. This is simply a safe chance to sharpen your instincts.
          </p>
        </div>

        {/* Template-specific tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              What to watch for in this email
            </CardTitle>
            {info?.template_name ? (
              <CardDescription>
                {info.campaign_name ? `${info.campaign_name} · ` : ''}
                {info.difficulty_level ? `${info.difficulty_level} difficulty` : ''}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="text-sm">
            {status === 'loading' ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tips…
              </span>
            ) : status === 'ok' && info?.feedback_notes ? (
              <p className="leading-relaxed text-foreground">{info.feedback_notes}</p>
            ) : (
              <p className="text-muted-foreground">
                Review the general guidance below to spot emails like this one.
              </p>
            )}
          </CardContent>
        </Card>

        {/* General advice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to spot phishing in general</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {GENERAL_TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Link to personal performance */}
        {status === 'ok' && token ? (
          <div className="flex justify-center">
            <Button asChild variant="outline" className="gap-2">
              <Link to={`/performance/${token}`}>
                See your results
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
