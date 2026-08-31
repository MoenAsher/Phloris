import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'

import { api } from '@/lib/api'
import type { ApiEnvelope, Difficulty, Template } from '@/types'
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

const PLACEHOLDERS = ['{{first_name}}', '{{last_name}}', '{{tracking_link}}', '{{report_link}}']

const EMPTY = {
  name: '',
  subject: '',
  body_html: '',
  difficulty_level: 'medium' as Difficulty,
  feedback_notes: '',
}

type Touched = { name: boolean; subject: boolean; body_html: boolean }

function fieldErrors(form: typeof EMPTY) {
  return {
    name: form.name.trim() === '' ? 'Name is required' : null,
    subject: form.subject.trim() === '' ? 'Subject is required' : null,
    body_html: form.body_html.trim() === '' ? 'Body HTML is required' : null,
  }
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: Template | null
  onSaved: () => void
}) {
  const isEdit = template !== null
  const [form, setForm] = useState(EMPTY)
  const [touched, setTouched] = useState<Touched>({ name: false, subject: false, body_html: false })
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setServerError(null)
    setTouched({ name: false, subject: false, body_html: false })
    if (template) {
      setForm({
        name: template.name,
        subject: template.subject,
        body_html: template.body_html,
        difficulty_level: template.difficulty_level,
        feedback_notes: template.feedback_notes ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [open, template])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function touch(field: keyof Touched) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched({ name: true, subject: true, body_html: true })
    const errs = fieldErrors(form)
    if (errs.name || errs.subject || errs.body_html) return
    setServerError(null)
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      body_html: form.body_html,
      difficulty_level: form.difficulty_level,
      feedback_notes: form.feedback_notes.trim() ? form.feedback_notes : null,
    }
    try {
      if (isEdit && template) {
        await api.put<ApiEnvelope<Template>>(`/api/templates/${template.id}`, payload)
      } else {
        await api.post<ApiEnvelope<Template>>('/api/templates', payload)
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setServerError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setServerError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setServerError('Something went wrong while saving.')
      }
    } finally {
      setSaving(false)
    }
  }

  const errs = fieldErrors(form)
  const canSubmit = !errs.name && !errs.subject && !errs.body_html && !saving

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit template' : 'Create template'}</DialogTitle>
          <DialogDescription>
            Placeholders {PLACEHOLDERS.join(', ')} are stored exactly and replaced
            per-recipient at send time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="grid gap-4 md:grid-cols-2">
          {/* Left: fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                onBlur={() => touch('name')}
                placeholder="Internal label"
                aria-invalid={!!(touched.name && errs.name)}
              />
              {touched.name && errs.name ? (
                <p className="text-xs font-medium text-destructive">{errs.name}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input
                id="tpl-subject"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
                onBlur={() => touch('subject')}
                placeholder="Email subject line"
                aria-invalid={!!(touched.subject && errs.subject)}
              />
              {touched.subject && errs.subject ? (
                <p className="text-xs font-medium text-destructive">{errs.subject}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-difficulty">Difficulty</Label>
              <select
                id="tpl-difficulty"
                value={form.difficulty_level}
                onChange={(e) => update('difficulty_level', e.target.value as Difficulty)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-body">Body (HTML)</Label>
              <Textarea
                id="tpl-body"
                value={form.body_html}
                onChange={(e) => update('body_html', e.target.value)}
                onBlur={() => touch('body_html')}
                placeholder="<p>Hi {{first_name}}, <a href='{{tracking_link}}'>click here</a></p>"
                className="min-h-[160px] font-mono text-xs"
                aria-invalid={!!(touched.body_html && errs.body_html)}
              />
              {touched.body_html && errs.body_html ? (
                <p className="text-xs font-medium text-destructive">{errs.body_html}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-notes">Feedback notes (optional)</Label>
              <Textarea
                id="tpl-notes"
                value={form.feedback_notes}
                onChange={(e) => update('feedback_notes', e.target.value)}
                placeholder="Tips shown on the feedback page"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Right: live HTML preview */}
          <div className="space-y-2">
            <Label>Live preview</Label>
            <div className="rounded-md border bg-white p-4 text-sm text-black">
              <div className="mb-2 border-b pb-2 text-xs text-neutral-500">
                Subject: {form.subject || <span className="italic">（none）</span>}
              </div>
              {form.body_html.trim() ? (
                <div dangerouslySetInnerHTML={{ __html: form.body_html }} />
              ) : (
                <p className="italic text-neutral-400">
                  Body preview will appear here.
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Placeholder tokens render literally here; they are replaced when a
              campaign is launched.
            </p>
          </div>

          {serverError ? (
            <p className="text-sm font-medium text-destructive md:col-span-2">
              {serverError}
            </p>
          ) : null}

          <DialogFooter className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
