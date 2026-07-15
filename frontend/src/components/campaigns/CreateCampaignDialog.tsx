import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'

import { api } from '@/lib/api'
import type { ApiEnvelope, Campaign, Template, TargetGroup } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export function CreateCampaignDialog({
  open,
  onOpenChange,
  templates,
  groups,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: Template[]
  groups: TargetGroup[]
  onCreated: (campaign: Campaign) => void
}) {
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Default the selects to the first available option each time we open.
  useEffect(() => {
    if (!open) return
    setName('')
    setError(null)
    setTemplateId(templates[0] ? String(templates[0].id) : '')
    setGroupId(groups[0] ? String(groups[0].id) : '')
  }, [open, templates, groups])

  const missingPrereqs = templates.length === 0 || groups.length === 0

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const resp = await api.post<ApiEnvelope<Campaign>>('/api/campaigns', {
        name: name.trim(),
        template_id: Number(templateId),
        target_group_id: Number(groupId),
      })
      onCreated(resp.data.data)
      onOpenChange(false)
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setError('Failed to create the campaign.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create campaign</DialogTitle>
          <DialogDescription>
            Pair an email template with a target group. The campaign starts as a
            draft; you launch it from its detail page.
          </DialogDescription>
        </DialogHeader>

        {missingPrereqs ? (
          <div className="space-y-2 py-2 text-sm text-muted-foreground">
            <p>You need at least one template and one target group first.</p>
            <ul className="list-disc pl-5">
              {templates.length === 0 ? <li>No templates yet — create one on the Templates page.</li> : null}
              {groups.length === 0 ? <li>No target groups yet — create one on the Targets page.</li> : null}
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="camp-name">Name</Label>
              <Input
                id="camp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q3 Awareness Test"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-template">Template</Label>
              <select
                id="camp-template"
                className={SELECT_CLASS}
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.difficulty_level})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-group">Target group</Label>
              <select
                id="camp-group"
                className={SELECT_CLASS}
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.target_count} target{g.target_count === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
            </div>
            {error ? (
              <p className="text-sm font-medium text-destructive">{error}</p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || name.trim() === '' || !templateId || !groupId}>
                {saving ? 'Creating…' : 'Create campaign'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
