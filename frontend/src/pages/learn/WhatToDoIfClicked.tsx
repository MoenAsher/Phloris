import { Flag, X, PhoneCall, Monitor, Clock } from 'lucide-react'

const STEPS = [
  {
    icon: Flag,
    iconColor: 'text-emerald-500',
    title: 'Report it immediately',
    body: "Use your organisation's standard reporting channel — email, ticketing system, or the Report Phishing button in your email client. Include the original email if possible. Don't wait to see whether anything seems wrong.",
  },
  {
    icon: X,
    iconColor: 'text-rose-500',
    title: "Don't forward the email",
    body: 'Forwarding spreads the malicious link to other inboxes and may expose additional recipients who could click it.',
  },
  {
    icon: PhoneCall,
    iconColor: 'text-blue-500',
    title: 'Verify through a separate, known channel',
    body: "If the email appeared to come from a colleague, manager, or supplier, contact them directly via a phone number or address you already have — not one from the email itself — to confirm whether they sent it.",
  },
  {
    icon: Monitor,
    iconColor: 'text-amber-500',
    title: 'Notify IT if you opened an attachment or enabled macros',
    body: "If you opened an attachment or accepted a macro prompt in an unexpected document, notify IT so they can scan or isolate the device. This does not require that anything visibly went wrong.",
  },
]

export function WhatToDoIfClicked() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Acting quickly is genuinely helpful — the sooner an incident is reported, the
        more the security team can do to limit its impact. These steps apply both to real
        phishing and to simulation clicks.
      </p>

      <div className="space-y-3">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border p-4">
            <step.icon
              className={`mt-0.5 h-5 w-5 shrink-0 ${step.iconColor}`}
            />
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-900">
              Why quick reporting matters
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              In a real incident, reporting speed is the variable most within a
              recipient's control and the one that most limits damage. Within this
              simulation, reporting is tracked as a separate metric — distinct from
              clicking — because it reflects a proactive and desirable response.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
