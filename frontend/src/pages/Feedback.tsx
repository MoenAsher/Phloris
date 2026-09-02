import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShieldCheck, ArrowRight, Clock } from 'lucide-react'

import { api } from '@/lib/api'
import type { ApiEnvelope, FeedbackInfo } from '@/types'
import { LEARN_MODULES } from './learn/modules'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function Feedback() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<FeedbackInfo | null>(null)

  useEffect(() => {
    if (!token) return
    api
      .get<ApiEnvelope<FeedbackInfo>>(`/api/feedback/${token}`)
      .then((r) => setInfo(r.data.data))
      .catch(() => {})
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Reassuring header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            This was a phishing simulation
          </h1>
          {info?.campaign_name ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {info.campaign_name}
              {info.difficulty_level ? ` · ${info.difficulty_level} difficulty` : ''}
            </p>
          ) : null}
          <p className="mx-auto mt-3 max-w-prose text-sm text-muted-foreground">
            You clicked a link in a simulated phishing email sent by your security team.
            Nothing was harmed and nothing was compromised — there's no need to worry.
            This is a safe chance to understand why it happened and sharpen your
            instincts.
          </p>
        </div>

        {/* Link to personal performance */}
        {token ? (
          <div className="flex justify-center">
            <Button asChild variant="outline" className="gap-2">
              <Link to={`/performance/${token}`}>
                See your results
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}

        {/* Why it happens intro */}
        <div className="rounded-lg border bg-card p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Phishing works not because its targets are careless, but because it exploits
            cognitive mechanisms that all people share — urgency, authority, familiarity,
            and attentional limits. Understanding these mechanisms is the most effective
            defence. The seven short modules below cover each one.
          </p>
        </div>

        {/* Module cards */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Why phishing works — explore the research
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {LEARN_MODULES.map((mod) => (
              <Link key={mod.slug} to={`/learn/${mod.slug}`} className="group">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${mod.iconBg}`}
                        >
                          <mod.icon className={`h-4 w-4 ${mod.iconColor}`} />
                        </div>
                        <p className="text-sm font-medium leading-snug">{mod.title}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="mb-2 text-xs text-muted-foreground">
                      {mod.description}
                    </p>
                    <Badge className="gap-1 border-transparent bg-muted text-muted-foreground text-xs font-normal">
                      <Clock className="h-3 w-3" />
                      {mod.readTime}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
