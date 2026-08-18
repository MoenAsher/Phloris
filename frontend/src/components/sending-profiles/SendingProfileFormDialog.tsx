import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'

import { api } from '@/lib/api'
import type { ApiEnvelope, SendingProfile } from '@/types'
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

export function SendingProfileFormDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: SendingProfile | null
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [fromAddress, setFromAddress] = useState('')
  const [useTls, setUseTls] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setSmtpPassword('')
    if (profile) {
      setName(profile.name)
      setSmtpHost(profile.smtp_host)
      setSmtpPort(String(profile.smtp_port))
      setSmtpUsername(profile.smtp_username ?? '')
      setFromAddress(profile.from_address)
      setUseTls(profile.use_tls)
    } else {
      setName('')
      setSmtpHost('')
      setSmtpPort('587')
      setSmtpUsername('')
      setFromAddress('')
      setUseTls(true)
    }
  }, [open, profile])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        smtp_host: smtpHost.trim(),
        smtp_port: Number(smtpPort),
        smtp_username: smtpUsername.trim() || null,
        from_address: fromAddress.trim(),
        use_tls: useTls,
      }
      if (smtpPassword) {
        payload.smtp_password = smtpPassword
      }

      if (profile) {
        await api.put<ApiEnvelope<SendingProfile>>(
          `/api/sending-profiles/${profile.id}`,
          payload,
        )
      } else {
        await api.post<ApiEnvelope<SendingProfile>>('/api/sending-profiles', payload)
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setError(profile ? 'Failed to update the profile.' : 'Failed to create the profile.')
      }
    } finally {
      setSaving(false)
    }
  }

  const isValid =
    name.trim() !== '' &&
    smtpHost.trim() !== '' &&
    fromAddress.trim() !== '' &&
    Number(smtpPort) >= 1 &&
    Number(smtpPort) <= 65535 &&
    (profile !== null || smtpPassword !== '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{profile ? 'Edit sending profile' : 'Create sending profile'}</DialogTitle>
          <DialogDescription>
            {profile
              ? 'Update the SMTP configuration. Leave the password blank to keep the existing one.'
              : 'Configure an SMTP server to send campaign emails from.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sp-name">Name</Label>
            <Input
              id="sp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mailtrap Sandbox"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="sp-host">SMTP Host</Label>
              <Input
                id="sp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="sandbox.smtp.mailtrap.io"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-port">Port</Label>
              <Input
                id="sp-port"
                type="number"
                min={1}
                max={65535}
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sp-username">SMTP Username</Label>
            <Input
              id="sp-username"
              value={smtpUsername}
              onChange={(e) => setSmtpUsername(e.target.value)}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sp-password">
              SMTP Password
              {profile?.has_password ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (password saved — leave blank to keep)
                </span>
              ) : null}
            </Label>
            <Input
              id="sp-password"
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder={profile?.has_password ? '••••••••' : 'Required'}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sp-from">From Address</Label>
            <Input
              id="sp-from"
              type="email"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="security-team@simulation.local"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="sp-tls"
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={useTls}
              onChange={(e) => setUseTls(e.target.checked)}
            />
            <Label htmlFor="sp-tls" className="cursor-pointer font-normal">
              Use TLS
            </Label>
          </div>

          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !isValid}>
              {saving ? (profile ? 'Saving…' : 'Creating…') : (profile ? 'Save changes' : 'Create profile')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
