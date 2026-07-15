import { Badge } from '@/components/ui/badge'
import type { TargetOutcome } from '@/types'

const CONFIG: Record<TargetOutcome, { label: string; className: string }> = {
  clicked: { label: 'clicked', className: 'border-transparent bg-red-100 text-red-800' },
  reported: { label: 'reported', className: 'border-transparent bg-green-100 text-green-800' },
  no_action: { label: 'no action', className: 'border-transparent bg-neutral-100 text-neutral-700' },
  not_sent: { label: 'not sent', className: 'border-transparent bg-amber-100 text-amber-800' },
}

export function OutcomeBadge({ outcome }: { outcome: TargetOutcome }) {
  const { label, className } = CONFIG[outcome]
  return <Badge className={className}>{label}</Badge>
}
