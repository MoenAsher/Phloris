import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { FileText, Search, Send, Server, Users, X } from 'lucide-react'

import { api } from '@/lib/api'
import type { ApiEnvelope, SearchResults } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  running: 'Running',
  completed: 'Completed',
}

interface ResultItem {
  key: string
  label: string
  sublabel?: string
  to: string
  Icon: typeof Search
}

function toItems(results: SearchResults): ResultItem[] {
  const items: ResultItem[] = []
  for (const c of results.campaigns) {
    items.push({
      key: `campaign-${c.id}`,
      label: c.name,
      sublabel: STATUS_LABEL[c.status] ?? c.status,
      to: `/campaigns/${c.id}`,
      Icon: Send,
    })
  }
  for (const t of results.targets) {
    const name = [t.first_name, t.last_name].filter(Boolean).join(' ')
    items.push({
      key: `target-${t.id}`,
      label: t.email,
      sublabel: name || undefined,
      to: `/targets/${t.id}/history`,
      Icon: Users,
    })
  }
  for (const tpl of results.templates) {
    items.push({
      key: `template-${tpl.id}`,
      label: tpl.name,
      sublabel: tpl.difficulty_level,
      to: `/templates?edit=${tpl.id}`,
      Icon: FileText,
    })
  }
  for (const p of results.sending_profiles) {
    items.push({
      key: `profile-${p.id}`,
      label: p.name,
      sublabel: p.from_address,
      to: `/sending-profiles?edit=${p.id}`,
      Icon: Server,
    })
  }
  return items
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on click-outside
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const resp = await api.get<ApiEnvelope<SearchResults>>('/api/search', {
        params: { q },
      })
      setResults(resp.data.data)
      setOpen(true)
    } catch (err) {
      if (!isAxiosError(err) || err.response?.status !== 401) {
        setResults({ campaigns: [], targets: [] })
        setOpen(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setActiveIdx(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setResults(null)
      setOpen(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => void fetchResults(val.trim()), 300)
  }

  function handleClear() {
    setQuery('')
    setResults(null)
    setOpen(false)
    setActiveIdx(-1)
    inputRef.current?.focus()
  }

  function navigateTo(to: string) {
    setOpen(false)
    setQuery('')
    setResults(null)
    setActiveIdx(-1)
    navigate(to)
  }

  // Build flat item list for keyboard navigation
  const items: ResultItem[] = results ? toItems(results) : []

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) {
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < items.length) {
        e.preventDefault()
        navigateTo(items[activeIdx].to)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const hasCampaigns = (results?.campaigns.length ?? 0) > 0
  const hasTargets = (results?.targets.length ?? 0) > 0
  const hasTemplates = (results?.templates.length ?? 0) > 0
  const hasProfiles = (results?.sending_profiles.length ?? 0) > 0
  const isEmpty = results !== null && !hasCampaigns && !hasTargets && !hasTemplates && !hasProfiles
  // Sequential offsets for keyboard navigation across groups
  const targetOffset = results?.campaigns.length ?? 0
  const templateOffset = targetOffset + (results?.targets.length ?? 0)
  const profileOffset = templateOffset + (results?.templates.length ?? 0)

  return (
    <div ref={containerRef} className="relative w-64">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results && query.length >= 2) setOpen(true)
          }}
          placeholder="Search campaigns, targets…"
          className={cn(
            'h-8 w-full rounded-md border border-input bg-background pl-8 pr-7',
            'text-sm placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-1 focus:ring-ring',
          )}
        />
        {query.length > 0 ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={handleClear}
            className="absolute right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {open ? (
        <div
          role="listbox"
          className={cn(
            'absolute right-0 top-full z-50 mt-1 w-80 rounded-md border bg-popover text-popover-foreground shadow-md',
            'overflow-hidden',
          )}
        >
          {loading ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              Searching…
            </div>
          ) : isEmpty ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {hasCampaigns ? (
                <section>
                  <p className="sticky top-0 bg-muted/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    Campaigns
                  </p>
                  {results!.campaigns.map((c, idx) => (
                    <ResultRow
                      key={`campaign-${c.id}`}
                      icon={Send}
                      label={c.name}
                      sublabel={STATUS_LABEL[c.status] ?? c.status}
                      active={activeIdx === idx}
                      onPointerEnter={() => setActiveIdx(idx)}
                      onClick={() => navigateTo(`/campaigns/${c.id}`)}
                    />
                  ))}
                </section>
              ) : null}

              {hasTargets ? (
                <section>
                  <p className="sticky top-0 bg-muted/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    Targets
                  </p>
                  {results!.targets.map((t, idx) => {
                    const name = [t.first_name, t.last_name].filter(Boolean).join(' ')
                    return (
                      <ResultRow
                        key={`target-${t.id}`}
                        icon={Users}
                        label={t.email}
                        sublabel={name || undefined}
                        active={activeIdx === targetOffset + idx}
                        onPointerEnter={() => setActiveIdx(targetOffset + idx)}
                        onClick={() => navigateTo(`/targets/${t.id}/history`)}
                      />
                    )
                  })}
                </section>
              ) : null}

              {hasTemplates ? (
                <section>
                  <p className="sticky top-0 bg-muted/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    Templates
                  </p>
                  {results!.templates.map((tpl, idx) => (
                    <ResultRow
                      key={`template-${tpl.id}`}
                      icon={FileText}
                      label={tpl.name}
                      sublabel={tpl.difficulty_level}
                      active={activeIdx === templateOffset + idx}
                      onPointerEnter={() => setActiveIdx(templateOffset + idx)}
                      onClick={() => navigateTo(`/templates?edit=${tpl.id}`)}
                    />
                  ))}
                </section>
              ) : null}

              {hasProfiles ? (
                <section>
                  <p className="sticky top-0 bg-muted/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    Sending Profiles
                  </p>
                  {results!.sending_profiles.map((p, idx) => (
                    <ResultRow
                      key={`profile-${p.id}`}
                      icon={Server}
                      label={p.name}
                      sublabel={p.from_address}
                      active={activeIdx === profileOffset + idx}
                      onPointerEnter={() => setActiveIdx(profileOffset + idx)}
                      onClick={() => navigateTo(`/sending-profiles?edit=${p.id}`)}
                    />
                  ))}
                </section>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

interface ResultRowProps {
  icon: typeof Search
  label: string
  sublabel?: string
  active: boolean
  onPointerEnter: () => void
  onClick: () => void
}

function ResultRow({ icon: Icon, label, sublabel, active, onPointerEnter, onClick }: ResultRowProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onPointerEnter={onPointerEnter}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {sublabel ? (
          <span className="block truncate text-xs text-muted-foreground">{sublabel}</span>
        ) : null}
      </span>
    </button>
  )
}
