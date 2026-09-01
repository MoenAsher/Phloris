import { Brain, Layers, Clock } from 'lucide-react'

export function CognitiveLoad() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Detecting phishing requires attentional resources. Multitasking depletes exactly
        those resources — and the conditions most favourable to attackers are the same
        ones most people work in every day.
      </p>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Layers className="h-4 w-4 text-violet-500" />
          Load reduces detection accuracy
        </h2>
        <p className="text-sm text-muted-foreground">
          Vishwanath et al. (2011) found that individuals processing email under higher
          cognitive demands were significantly more vulnerable to phishing. Inspecting a
          link carefully, checking a sender address, or questioning whether a request
          makes sense all require working-memory capacity — which concurrent task
          switching consumes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Brain className="h-4 w-4 text-rose-500" />
          Why attacker timing doesn't matter
        </h2>
        <p className="text-sm text-muted-foreground">
          Attackers don't need to know your schedule. They send to large groups and rely
          statistically on the email arriving during a busy moment for many recipients. A
          campaign sent to 200 people will reach dozens of them mid-meeting,
          mid-deadline, or actively switching between tasks.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Clock className="h-4 w-4 text-amber-500" />
          A practical counter
        </h2>
        <p className="text-sm text-muted-foreground">
          If you receive an unexpected, action-requiring email while already under load,
          treat it as a signal rather than a demand. Flag it to review in a focused
          moment, or verify through a separate channel before acting. The urgency framing
          in the email is designed to override exactly this instinct.
        </p>
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Brain className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">Key takeaway</p>
            <p className="mt-1 text-sm text-amber-800">
              Attackers benefit from haste. An unexpected email demanding immediate action
              when you're busy is not a coincidence — it is the optimal delivery
              condition from the attacker's perspective.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="font-medium">Citation</p>
        <p className="mt-1">
          Vishwanath, A., Herath, T., Chen, R., Wang, J., &amp; Rao, H.R. (2011). Why
          do people get phished? Testing individual differences in phishing vulnerability
          within an integrated, information processing model.{' '}
          <em>Decision Support Systems</em>, 51(3), 576–586.
        </p>
      </div>
    </div>
  )
}
