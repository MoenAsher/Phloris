import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'

export function Overconfidence() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        A common assumption is that experienced professionals are harder to phish.
        Research suggests the opposite can sometimes be true.
      </p>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-4 w-4 text-rose-500" />
          Experience can increase susceptibility
        </h2>
        <p className="text-sm text-muted-foreground">
          Wang, Li, and Rao (2016) found that higher self-reported trust was a positive
          predictor of phishing susceptibility — not a protective one. Experienced staff
          tend to trust their own email-reading judgement more, and so apply less
          scrutiny to emails that feel familiar. Confidence in detection ability does not
          equal detection ability.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Awareness doesn't translate to detection
        </h2>
        <p className="text-sm text-muted-foreground">
          Parsons et al. (2015) found that self-reported awareness of phishing is a poor
          predictor of actual detection performance. People consistently overestimate how
          well they would recognise a real attack when asked in the abstract — and then
          miss it in practice.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          What to do instead
        </h2>
        <p className="text-sm text-muted-foreground">
          Confidence is most useful as a prompt to verify, not as a substitute for it.
          When an email feels obviously legitimate, that certainty is exactly when an
          independent check costs the least and matters the most.
        </p>
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">Key takeaway</p>
            <p className="mt-1 text-sm text-amber-800">
              Treat your own certainty as a variable to check, not a safety guarantee.
              The more certain you feel that an email is legitimate, the more worthwhile
              it is to verify through a separate channel before acting.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="font-medium">Citations</p>
        <p className="mt-1">
          Wang, J., Li, Y., &amp; Rao, H.R. (2016). Overconfidence in phishing email
          detection. <em>Journal of the Association for Information Systems</em>, 17(12),
          759–783.
        </p>
        <p className="mt-1">
          Parsons, K., McCormac, A., Pattinson, M., Butavicius, M., &amp; Jerram, C.
          (2015). The design of phishing studies: Challenges for researchers.{' '}
          <em>Computers &amp; Security</em>, 52, 194–206.
        </p>
      </div>
    </div>
  )
}
