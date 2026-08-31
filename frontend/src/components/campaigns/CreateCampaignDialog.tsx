import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'

import { api } from '@/lib/api'
import type { ApiEnvelope, Campaign, SendingProfile, Template, TargetGroup } from '@/types'
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
  profiles,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: Template[]
  groups: TargetGroup[]
  profiles: SendingProfile[]
  onCreated: (campaign: Campaign) => void
}) {
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [profileId, setProfileId] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setNameTouched(false)
    setServerError(null)
    setTemplateId(templates[0] ? String(templates[0].id) : '')
    setGroupId(groups[0] ? String(groups[0].id) : '')
    setProfileId(profiles[0] ? String(profiles[0].id) : '')
  }, [open, templates, groups, profiles])

  const missingPrereqs = templates.length === 0 || groups.length === 0 || profiles.length === 0
  const nameError = nameTouched && name.trim() === '' ? 'Campaign name is required' : null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNameTouched(true)
    if (name.trim() === '') return
    setServerError(null)
    setSaving(true)
    try {
      const resp = await api.post<ApiEnvelope<Campaign>>('/api/campaigns', {
        name: name.trim(),
        template_id: Number(templateId),
        target_group_id: Number(groupId),
        sending_profile_id: Number(profileId),
      })
      onCreated(resp.data.data)
      onOpenChange(false)
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setServerError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setServerError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setServerError('Failed to create the campaign.')
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
            <p>You need at least one template, one target group, and one sending profile first.</p>
            <ul className="list-disc pl-5">
              {templates.length === 0 ? <li>No templates yet — create one on the Templates page.</li> : null}
              {groups.length === 0 ? <li>No target groups yet — create one on the Targets page.</li> : null}
              {profiles.length === 0 ? <li>No sending profiles yet — create one on the Sending Profiles page.</li> : null}
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="camp-name">Name</Label>
              <Input
                id="camp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder="e.g. Q3 Awareness Test"
                aria-invalid={!!nameError}
              />
              {nameError ? (
                <p className="text-xs font-medium text-destructive">{nameError}</p>
              ) : null}
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
            <div className="space-y-2">
              <Label htmlFor="camp-profile">Sending profile</Label>
              <select
                id="camp-profile"
                className={SELECT_CLASS}
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.smtp_host}:{p.smtp_port})
                  </option>
                ))}
              </select>
            </div>
            {serverError ? (
              <p className="text-sm font-medium text-destructive">{serverError}</p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !templateId || !groupId || !profileId}>
                {saving ? 'Creating…' : 'Create campaign'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
