import { Clock, Shield, Users, HelpCircle, Brain } from 'lucide-react'

export function SocialEngineering() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Phishing emails succeed not by bypassing technical knowledge but by triggering
        cognitive shortcuts that all humans rely on to process information quickly.
        Understanding the levers helps you recognise when you're being pushed toward a
        fast, unreflective response.
      </p>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Clock className="h-4 w-4 text-amber-500" />
          Urgency and scarcity
        </h2>
        <p className="text-sm text-muted-foreground">
          <em>"Your account will be suspended in 24 hours."</em> Time pressure activates
          fast, automatic thinking — what psychologists call System 1 — and crowds out
          careful analysis. When you feel you must act immediately, that feeling itself
          is the signal to pause.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Shield className="h-4 w-4 text-blue-500" />
          Authority
        </h2>
        <p className="text-sm text-muted-foreground">
          <em>"This message is from the IT security team."</em> Impersonating a manager,
          helpdesk, or government body exploits our tendency to comply with perceived
          authority. Real logos, job titles, and signature blocks reinforce this
          impression convincingly.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Users className="h-4 w-4 text-violet-500" />
          Social proof and familiarity
        </h2>
        <p className="text-sm text-muted-foreground">
          <em>"Your colleague Alice has already signed the document."</em> References to
          known colleagues or familiar platforms lower suspicion by making the request
          feel socially validated and routine — something everyone else is already doing.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <HelpCircle className="h-4 w-4 text-emerald-500" />
          Curiosity and helpfulness
        </h2>
        <p className="text-sm text-muted-foreground">
          <em>"Your package delivery failed — click to reschedule."</em> Requests that
          appear to offer help or satisfy natural curiosity bypass the question of why a
          stranger would want you to act. The offer feels service-oriented rather than
          suspicious.
        </p>
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Brain className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">Key takeaway</p>
            <p className="mt-1 text-sm text-amber-800">
              These levers work by design — they short-circuit careful thinking under
              time pressure. The defence is a brief deliberate pause: does this request
              make sense, and is there an independent way to verify it before acting?
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
