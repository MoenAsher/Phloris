import { Badge } from '@/components/ui/badge'
import type { CampaignStatus } from '@/types'

const STYLES: Record<CampaignStatus, string> = {
  draft: 'border-transparent bg-neutral-100 text-neutral-700',
  running: 'border-transparent bg-amber-100 text-amber-800',
  completed: 'border-transparent bg-green-100 text-green-800',
}

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge className={STYLES[status]}>{status}</Badge>
}
