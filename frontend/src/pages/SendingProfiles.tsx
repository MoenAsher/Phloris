import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Plus, Pencil, Trash2, Loader2, Send, X } from 'lucide-react'

import { api } from '@/lib/api'
import type { ApiEnvelope, SendingProfile } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SendingProfileFormDialog } from '@/components/sending-profiles/SendingProfileFormDialog'

interface TestResult {
  id: number
  ok: boolean
  message: string
}

export function SendingProfiles() {
  const [profiles, setProfiles] = useState<SendingProfile[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SendingProfile | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<SendingProfile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [testingId, setTestingId] = useState<number | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoadError(null)
    try {
      const resp = await api.get<ApiEnvelope<SendingProfile[]>>('/api/sending-profiles')
      setProfiles(resp.data.data)
    } catch (err) {
      setProfiles([])
      if (isAxiosError(err) && err.response?.data?.error) {
        setLoadError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setLoadError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setLoadError('Failed to load sending profiles.')
      }
    }
  }, [])

  useEffect(() => {
    void fetchProfiles()
  }, [fetchProfiles])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(profile: SendingProfile) {
    setEditing(profile)
    setFormOpen(true)
  }

  async function sendTest(profile: SendingProfile) {
    setTestingId(profile.id)
    setTestResult(null)
    try {
      const resp = await api.get<ApiEnvelope<{ sent_to: string }>>(
        `/api/sending-profiles/${profile.id}/test`,
      )
      setTestResult({
        id: profile.id,
        ok: true,
        message: `Test email sent to ${resp.data.data.sent_to}`,
      })
    } catch (err) {
      let message = 'Test failed.'
      if (isAxiosError(err) && err.response?.data?.error) {
        message = String(err.response.data.error)
      } else if (isAxiosError(err) && err.request) {
        message = 'Cannot reach the backend. Is it running on port 5001?'
      }
      setTestResult({ id: profile.id, ok: false, message })
    } finally {
      setTestingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/api/sending-profiles/${deleteTarget.id}`)
      setDeleteTarget(null)
      await fetchProfiles()
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setDeleteError(String(err.response.data.error))
      } else {
        setDeleteError('Failed to delete the sending profile.')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Sending Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Reusable SMTP configurations used to deliver campaign emails.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All profiles</CardTitle>
          <CardDescription>
            {profiles === null
              ? 'Loading…'
              : `${profiles.length} profile${profiles.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test result banner */}
          {testResult ? (
            <div
              className={`flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${
                testResult.ok
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              <span>{testResult.message}</span>
              <button
                onClick={() => setTestResult(null)}
                className="shrink-0 opacity-60 hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {/* Loading */}
          {profiles === null && !loadError ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profiles…
            </div>
          ) : null}

          {/* Error */}
          {loadError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm font-medium text-destructive">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchProfiles()}>
                Retry
              </Button>
            </div>
          ) : null}

          {/* Empty */}
          {profiles !== null && !loadError && profiles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">No sending profiles yet.</p>
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first profile
              </Button>
            </div>
          ) : null}

          {/* Data */}
          {profiles && profiles.length > 0 && !loadError ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SMTP Host</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>From Address</TableHead>
                  <TableHead>TLS</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.smtp_host}</TableCell>
                    <TableCell className="text-muted-foreground">{p.smtp_port}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {p.from_address}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.use_tls ? 'Yes' : 'No'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Send test email"
                          disabled={testingId !== null}
                          onClick={() => void sendTest(p)}
                        >
                          {testingId === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteTarget(p)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {/* Create / edit */}
      <SendingProfileFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        profile={editing}
        onSaved={() => void fetchProfiles()}
      />

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete sending profile</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium">{deleteTarget?.name}</span>? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-sm font-medium text-destructive">{deleteError}</p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
