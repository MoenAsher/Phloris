import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'

import { api } from '@/lib/api'
import type { ApiEnvelope, TargetGroup } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (group: TargetGroup) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setError(null)
    }
  }, [open])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const resp = await api.post<ApiEnvelope<TargetGroup>>('/api/target-groups', {
        name: name.trim(),
        description: description.trim() ? description : null,
      })
      onCreated(resp.data.data)
      onOpenChange(false)
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setError('Failed to create the group.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create target group</DialogTitle>
          <DialogDescription>
            A named collection of recipients for campaigns.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grp-name">Name</Label>
            <Input
              id="grp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finance Dept"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grp-desc">Description (optional)</Label>
            <Textarea
              id="grp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this group is for"
              className="min-h-[70px]"
            />
          </div>
          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || name.trim() === ''}>
              {saving ? 'Creating…' : 'Create group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
