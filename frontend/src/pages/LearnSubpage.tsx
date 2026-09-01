import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock, ChevronLeft } from 'lucide-react'

import { LEARN_MODULES } from './learn/modules'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function LearnSubpage() {
  const { slug } = useParams<{ slug: string }>()
  const index = LEARN_MODULES.findIndex((m) => m.slug === slug)
  const mod = LEARN_MODULES[index]

  const prev = index > 0 ? LEARN_MODULES[index - 1] : null
  const next = index < LEARN_MODULES.length - 1 ? LEARN_MODULES[index + 1] : null

  if (!mod) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-medium">Module not found</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/learn">Back to library</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { Component } = mod

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Back to library */}
        <div>
          <Link
            to="/learn"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to library
          </Link>
        </div>

        {/* Module header */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${mod.iconBg}`}
          >
            <mod.icon className={`h-7 w-7 ${mod.iconColor}`} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold leading-snug tracking-tight">
              {mod.title}
            </h1>
            <Badge className="gap-1 border-transparent bg-muted text-muted-foreground text-xs font-normal">
              <Clock className="h-3 w-3" />
              {mod.readTime} read
            </Badge>
          </div>
        </div>

        {/* Module body */}
        <Component />

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between gap-4 border-t pt-6">
          {prev ? (
            <Link
              to={`/learn/${prev.slug}`}
              className="group flex max-w-[48%] items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
              <span className="line-clamp-2">{prev.title}</span>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              to={`/learn/${next.slug}`}
              className="group ml-auto flex max-w-[48%] items-center gap-2 text-right text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="line-clamp-2">{next.title}</span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>

        {/* Module counter */}
        <p className="text-center text-xs text-muted-foreground">
          {index + 1} of {LEARN_MODULES.length}
        </p>
      </div>
    </div>
  )
}
