import { Link } from 'react-router-dom'
import { BookOpen, ArrowRight, Clock } from 'lucide-react'

import { LEARN_MODULES } from './learn/modules'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function Learn() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
            <BookOpen className="h-7 w-7 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Security Awareness Library
          </h1>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            Seven short modules on why phishing works and what you can do about it. Each
            takes about a minute to read.
          </p>
        </div>

        {/* Module cards */}
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
                  <p className="mb-2 text-xs text-muted-foreground">{mod.description}</p>
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
  )
}
