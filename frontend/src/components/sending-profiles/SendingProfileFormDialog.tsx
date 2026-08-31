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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type TouchedFields = {
  name: boolean
  smtp_host: boolean
  smtp_port: boolean
  from_address: boolean
  smtp_password: boolean
}

const NO_TOUCHED: TouchedFields = {
  name: false,
  smtp_host: false,
  smtp_port: false,
  from_address: false,
  smtp_password: false,
}

const ALL_TOUCHED: TouchedFields = {
  name: true,
  smtp_host: true,
  smtp_port: true,
  from_address: true,
  smtp_password: true,
}

function computeErrors(
  name: string,
  smtpHost: string,
  smtpPort: string,
  fromAddress: string,
  smtpPassword: string,
  isEdit: boolean,
) {
  const port = Number(smtpPort)
  return {
    name: name.trim() === '' ? 'Profile name is required' : null,
    smtp_host: smtpHost.trim() === '' ? 'SMTP host is required' : null,
    smtp_port:
      !smtpPort || isNaN(port) || port < 1 || port > 65535
        ? 'SMTP port must be a number between 1 and 65535'
        : null,
    from_address:
      fromAddress.trim() === ''
        ? 'From address is required'
        : !EMAIL_RE.test(fromAddress.trim())
          ? 'Enter a valid email address'
          : null,
    smtp_password: !isEdit && smtpPassword === '' ? 'Password is required' : null,
  }
}

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
  const isEdit = profile !== null

  const [name, setName] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [fromAddress, setFromAddress] = useState('')
  const [useTls, setUseTls] = useState(true)
  const [touched, setTouched] = useState<TouchedFields>(NO_TOUCHED)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setServerError(null)
    setSmtpPassword('')
    setTouched(NO_TOUCHED)
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

  function touch(field: keyof TouchedFields) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched(ALL_TOUCHED)
    const errs = computeErrors(name, smtpHost, smtpPort, fromAddress, smtpPassword, isEdit)
    if (Object.values(errs).some(Boolean)) return
    setServerError(null)
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
        setServerError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setServerError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setServerError(profile ? 'Failed to update the profile.' : 'Failed to create the profile.')
      }
    } finally {
      setSaving(false)
    }
  }

  const errs = computeErrors(name, smtpHost, smtpPort, fromAddress, smtpPassword, isEdit)
  const hasErrors = Object.values(errs).some(Boolean)

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

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sp-name">Name</Label>
            <Input
              id="sp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => touch('name')}
              placeholder="e.g. Mailtrap Sandbox"
              aria-invalid={!!(touched.name && errs.name)}
            />
            {touched.name && errs.name ? (
              <p className="text-xs font-medium text-destructive">{errs.name}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="sp-host">SMTP Host</Label>
              <Input
                id="sp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                onBlur={() => touch('smtp_host')}
                placeholder="sandbox.smtp.mailtrap.io"
                aria-invalid={!!(touched.smtp_host && errs.smtp_host)}
              />
              {touched.smtp_host && errs.smtp_host ? (
                <p className="text-xs font-medium text-destructive">{errs.smtp_host}</p>
              ) : null}
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
                onBlur={() => touch('smtp_port')}
                aria-invalid={!!(touched.smtp_port && errs.smtp_port)}
              />
              {touched.smtp_port && errs.smtp_port ? (
                <p className="text-xs font-medium text-destructive col-span-3">{errs.smtp_port}</p>
              ) : null}
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
              onBlur={() => touch('smtp_password')}
              placeholder={profile?.has_password ? '••••••••' : 'Required'}
              autoComplete="new-password"
              aria-invalid={!!(touched.smtp_password && errs.smtp_password)}
            />
            {touched.smtp_password && errs.smtp_password ? (
              <p className="text-xs font-medium text-destructive">{errs.smtp_password}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sp-from">From Address</Label>
            <Input
              id="sp-from"
              type="email"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              onBlur={() => touch('from_address')}
              placeholder="security-team@simulation.local"
              aria-invalid={!!(touched.from_address && errs.from_address)}
            />
            {touched.from_address && errs.from_address ? (
              <p className="text-xs font-medium text-destructive">{errs.from_address}</p>
            ) : null}
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

          {serverError ? (
            <p className="text-sm font-medium text-destructive">{serverError}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || (Object.values(touched).some(Boolean) && hasErrors)}>
              {saving ? (profile ? 'Saving…' : 'Creating…') : (profile ? 'Save changes' : 'Create profile')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
