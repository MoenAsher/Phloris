import { Bell, BellOff, Eye } from 'lucide-react'

export function Habituation() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        The brain is efficient: it learns to treat stimuli that have been consistently
        non-threatening as safe background noise. This is habituation — a normal,
        adaptive feature of cognition that creates a specific vulnerability to phishing.
      </p>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Bell className="h-4 w-4 text-amber-500" />
          Security fatigue
        </h2>
        <p className="text-sm text-muted-foreground">
          NIST researchers (Stanton et al., 2016) found that workers exposed to a high
          volume of security warnings and routine system notifications progressively paid
          less attention to them. When every email looks like a safe, familiar category
          you've processed hundreds of times before, the scrutiny applied to each one
          drops automatically.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BellOff className="h-4 w-4 text-muted-foreground" />
          The mimicry advantage
        </h2>
        <p className="text-sm text-muted-foreground">
          A phishing email that closely mimics a familiar, frequently-seen template — a
          delivery notification, a password-reset prompt, a shared document alert —
          exploits habituation directly. It arrives in a cognitive category the recipient
          has stopped actively examining, which is exactly why the attacker chose that
          template.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Eye className="h-4 w-4 text-blue-500" />
          What to watch for
        </h2>
        <p className="text-sm text-muted-foreground">
          Routine-looking emails that ask for any action — clicking a link, opening an
          attachment, entering credentials — deserve a moment of deliberate attention
          rather than habituated processing. The fact that it looks like everything else
          you receive safely is not evidence that it is safe.
        </p>
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">Key takeaway</p>
            <p className="mt-1 text-sm text-amber-800">
              Familiarity is not safety. The email that looks exactly like the ones you
              process every day without trouble is the most efficient design an attacker
              can choose — and the one most likely to slip through without scrutiny.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="font-medium">Citation</p>
        <p className="mt-1">
          Stanton, B., Theofanos, M., Prettyman, S.S., &amp; Furman, S. (2016). Security
          Fatigue. <em>IT Professional</em>, 18(5), 26–32. IEEE/NIST.
        </p>
      </div>
    </div>
  )
}
