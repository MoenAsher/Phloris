import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { Plus, Trash2, Upload, Loader2, UserPlus, Users } from 'lucide-react'

import { api } from '@/lib/api'
import type { ApiEnvelope, Target, TargetGroup } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
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
import { CreateGroupDialog } from '@/components/targets/CreateGroupDialog'
import { ImportCsvDialog } from '@/components/targets/ImportCsvDialog'

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data?.error) return String(err.response.data.error)
  if (isAxiosError(err) && err.request) return 'Cannot reach the backend. Is it running on port 5001?'
  return fallback
}

export function Targets() {
  const [groups, setGroups] = useState<TargetGroup[] | null>(null)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [targets, setTargets] = useState<Target[] | null>(null)
  const [targetsError, setTargetsError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const [addForm, setAddForm] = useState({ email: '', first_name: '', last_name: '' })
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<TargetGroup | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const selectedGroup = groups?.find((g) => g.id === selectedId) ?? null

  const fetchGroups = useCallback(async () => {
    setGroupsError(null)
    try {
      const resp = await api.get<ApiEnvelope<TargetGroup[]>>('/api/target-groups')
      setGroups(resp.data.data)
    } catch (err) {
      setGroups([])
      setGroupsError(errorMessage(err, 'Failed to load target groups.'))
    }
  }, [])

  const fetchTargets = useCallback(async (groupId: number) => {
    setTargets(null)
    setTargetsError(null)
    try {
      const resp = await api.get<ApiEnvelope<Target[]>>(
        `/api/target-groups/${groupId}/targets`,
      )
      setTargets(resp.data.data)
    } catch (err) {
      setTargets([])
      setTargetsError(errorMessage(err, 'Failed to load targets.'))
    }
  }, [])

  useEffect(() => {
    void fetchGroups()
  }, [fetchGroups])

  // Keep a valid selection: default to the first group; clear if it's gone.
  useEffect(() => {
    if (groups === null) return
    setSelectedId((cur) =>
      cur !== null && groups.some((g) => g.id === cur) ? cur : (groups[0]?.id ?? null),
    )
  }, [groups])

  useEffect(() => {
    if (selectedId === null) {
      setTargets([])
      return
    }
    void fetchTargets(selectedId)
  }, [selectedId, fetchTargets])

  async function handleAddTarget(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedId === null) return
    setAdding(true)
    setAddError(null)
    try {
      await api.post(`/api/target-groups/${selectedId}/targets`, {
        email: addForm.email.trim(),
        first_name: addForm.first_name.trim() || null,
        last_name: addForm.last_name.trim() || null,
      })
      setAddForm({ email: '', first_name: '', last_name: '' })
      await Promise.all([fetchTargets(selectedId), fetchGroups()])
    } catch (err) {
      setAddError(errorMessage(err, 'Failed to add the target.'))
    } finally {
      setAdding(false)
    }
  }

  async function confirmDeleteTarget() {
    if (!deleteTarget || selectedId === null) return
    setConfirmBusy(true)
    setConfirmError(null)
    try {
      await api.delete(`/api/targets/${deleteTarget.id}`)
      setDeleteTarget(null)
      await Promise.all([fetchTargets(selectedId), fetchGroups()])
    } catch (err) {
      setConfirmError(errorMessage(err, 'Failed to delete the target.'))
    } finally {
      setConfirmBusy(false)
    }
  }

  async function confirmDeleteGroup() {
    if (!deleteGroup) return
    setConfirmBusy(true)
    setConfirmError(null)
    try {
      await api.delete(`/api/target-groups/${deleteGroup.id}`)
      const removedId = deleteGroup.id
      setDeleteGroup(null)
      if (selectedId === removedId) setSelectedId(null)
      await fetchGroups()
    } catch (err) {
      setConfirmError(errorMessage(err, 'Failed to delete the group.'))
    } finally {
      setConfirmBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Targets</h2>
        <p className="text-sm text-muted-foreground">
          Manage target groups and their recipients.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Groups list */}
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Groups</CardTitle>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {groups === null && !groupsError ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : null}

            {groupsError ? (
              <div className="space-y-2 py-4 text-center">
                <p className="text-sm text-destructive">{groupsError}</p>
                <Button variant="outline" size="sm" onClick={() => void fetchGroups()}>
                  Retry
                </Button>
              </div>
            ) : null}

            {groups && !groupsError && groups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No groups yet.
              </p>
            ) : null}

            {groups?.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedId(group.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                  group.id === selectedId
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
              >
                <span className="truncate font-medium">{group.name}</span>
                <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {group.target_count}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Selected group detail */}
        <Card>
          {selectedGroup === null ? (
            <CardContent className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Users className="h-8 w-8" />
              <p className="text-sm">
                {groups && groups.length === 0
                  ? 'Create a group to get started.'
                  : 'Select a group to view its targets.'}
              </p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>{selectedGroup.name}</CardTitle>
                  {selectedGroup.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedGroup.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setImportOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => {
                      setConfirmError(null)
                      setDeleteGroup(selectedGroup)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete group
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add target form */}
                <form
                  onSubmit={handleAddTarget}
                  className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3"
                >
                  <div className="flex-1 space-y-1" style={{ minWidth: '200px' }}>
                    <label className="text-xs font-medium" htmlFor="add-email">
                      Email
                    </label>
                    <Input
                      id="add-email"
                      type="email"
                      required
                      value={addForm.email}
                      onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="person@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" htmlFor="add-first">
                      First name
                    </label>
                    <Input
                      id="add-first"
                      value={addForm.first_name}
                      onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
                      placeholder="Ada"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" htmlFor="add-last">
                      Last name
                    </label>
                    <Input
                      id="add-last"
                      value={addForm.last_name}
                      onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
                      placeholder="Lovelace"
                    />
                  </div>
                  <Button type="submit" className="gap-1.5" disabled={adding}>
                    <UserPlus className="h-4 w-4" />
                    {adding ? 'Adding…' : 'Add'}
                  </Button>
                </form>
                {addError ? (
                  <p className="text-sm font-medium text-destructive">{addError}</p>
                ) : null}

                {/* Targets table */}
                {targets === null && !targetsError ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading targets…
                  </div>
                ) : null}

                {targetsError ? (
                  <div className="space-y-2 py-8 text-center">
                    <p className="text-sm text-destructive">{targetsError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void fetchTargets(selectedGroup.id)}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}

                {targets && !targetsError && targets.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No targets in this group yet. Add one above or import a CSV.
                  </p>
                ) : null}

                {targets && targets.length > 0 && !targetsError ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>First name</TableHead>
                        <TableHead>Last name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {targets.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.email}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {t.first_name ?? '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {t.last_name ?? '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete target"
                              onClick={() => {
                                setConfirmError(null)
                                setDeleteTarget(t)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(group) => {
          void fetchGroups()
          setSelectedId(group.id)
        }}
      />

      {selectedGroup ? (
        <ImportCsvDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          groupId={selectedGroup.id}
          onImported={() => {
            void fetchTargets(selectedGroup.id)
            void fetchGroups()
          }}
        />
      ) : null}

      {/* Delete target confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete target</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium">{deleteTarget?.email}</span> from
              this group? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {confirmError ? (
            <p className="text-sm font-medium text-destructive">{confirmError}</p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={confirmBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteTarget()}
              disabled={confirmBusy}
            >
              {confirmBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete group confirmation */}
      <Dialog
        open={deleteGroup !== null}
        onOpenChange={(o) => !o && setDeleteGroup(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete group</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium">{deleteGroup?.name}</span> and all
              its targets? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {confirmError ? (
            <p className="text-sm font-medium text-destructive">{confirmError}</p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteGroup(null)}
              disabled={confirmBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteGroup()}
              disabled={confirmBusy}
            >
              {confirmBusy ? 'Deleting…' : 'Delete group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
