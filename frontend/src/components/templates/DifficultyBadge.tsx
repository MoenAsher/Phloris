import { Badge } from '@/components/ui/badge'
import type { Difficulty } from '@/types'

const STYLES: Record<Difficulty, string> = {
  easy: 'border-transparent bg-green-100 text-green-800',
  medium: 'border-transparent bg-amber-100 text-amber-800',
  hard: 'border-transparent bg-red-100 text-red-800',
}

export function DifficultyBadge({ level }: { level: Difficulty }) {
  return <Badge className={STYLES[level]}>{level}</Badge>
}
