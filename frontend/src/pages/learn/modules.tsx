import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Zap, TrendingUp, Bell, Brain, Link2, ShieldX, CheckCircle2 } from 'lucide-react'

import { SocialEngineering } from './SocialEngineering'
import { Overconfidence } from './Overconfidence'
import { Habituation } from './Habituation'
import { CognitiveLoad } from './CognitiveLoad'
import { LinkRecognition } from './LinkRecognition'
import { BeyondCredentials } from './BeyondCredentials'
import { WhatToDoIfClicked } from './WhatToDoIfClicked'

export interface LearnModuleMeta {
  slug: string
  title: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  readTime: string
  description: string
  Component: ComponentType
}

export const LEARN_MODULES: LearnModuleMeta[] = [
  {
    slug: 'social-engineering',
    title: 'Social Engineering & Manipulation',
    icon: Zap,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    readTime: '~1 min',
    description:
      'How phishing exploits urgency, authority, and familiarity to bypass careful thinking.',
    Component: SocialEngineering,
  },
  {
    slug: 'overconfidence',
    title: 'Overconfidence: Why Experience Isn\'t Protection',
    icon: TrendingUp,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    readTime: '~1 min',
    description:
      'Research shows experienced professionals can be more susceptible, not less.',
    Component: Overconfidence,
  },
  {
    slug: 'habituation',
    title: 'Habituation & Alert Fatigue',
    icon: Bell,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    readTime: '~1 min',
    description:
      'Familiar-looking emails bypass habituated filters because they look like everything else.',
    Component: Habituation,
  },
  {
    slug: 'cognitive-load',
    title: 'Cognitive Load & Multitasking',
    icon: Brain,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    readTime: '~1 min',
    description:
      'Multitasking depletes the attentional resources needed to spot phishing.',
    Component: CognitiveLoad,
  },
  {
    slug: 'link-recognition',
    title: 'Link & URL Recognition',
    icon: Link2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    readTime: '~1 min',
    description:
      'Hover to preview, read domains carefully, and check suspicious links externally.',
    Component: LinkRecognition,
  },
  {
    slug: 'beyond-credentials',
    title: 'Beyond Credentials: Other Payloads',
    icon: ShieldX,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    readTime: '~1 min',
    description: '"I didn\'t enter a password" doesn\'t mean nothing happened.',
    Component: BeyondCredentials,
  },
  {
    slug: 'what-to-do',
    title: 'What To Do If You\'ve Already Clicked',
    icon: CheckCircle2,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    readTime: '~1 min',
    description:
      'Report immediately, verify through a separate channel, and notify IT if needed.',
    Component: WhatToDoIfClicked,
  },
]
