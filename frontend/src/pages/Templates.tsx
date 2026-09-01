import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'

import { api } from '@/lib/api'
import type { ApiEnvelope, Template } from '@/types'
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
import { Skeleton } from '@/components/ui/skeleton'
import { DifficultyBadge } from '@/components/templates/DifficultyBadge'
import { TemplateFormDialog } from '@/components/templates/TemplateFormDialog'

function TemplatesTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Difficulty</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-36" /></TableCell>
            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
            <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function Templates() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)

  const [preview, setPreview] = useState<Template | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoadError(null)
    try {
      const resp = await api.get<ApiEnvelope<Template[]>>('/api/templates')
      setTemplates(resp.data.data)
    } catch (err) {
      setTemplates([])
      if (isAxiosError(err) && err.response?.data?.error) {
        setLoadError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setLoadError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setLoadError('Failed to load templates.')
      }
    }
  }, [])

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  // If navigated here from search with ?edit=:id, open the edit dialog for that template.
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || !templates) return
    const target = templates.find((t) => t.id === Number(editId))
    if (target) {
      setEditing(target)
      setFormOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, templates, setSearchParams])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(template: Template) {
    setEditing(template)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/api/templates/${deleteTarget.id}`)
      setDeleteTarget(null)
      await fetchTemplates()
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setDeleteError(String(err.response.data.error))
      } else {
        setDeleteError('Failed to delete the template.')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Templates</h2>
          <p className="text-sm text-muted-foreground">
            Phishing email templates across difficulty levels.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All templates</CardTitle>
          <CardDescription>
            {templates === null
              ? 'Loading…'
              : `${templates.length} template${templates.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading skeleton */}
          {templates === null && !loadError ? (
            <TemplatesTableSkeleton />
          ) : null}

          {/* Error */}
          {loadError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm font-medium text-destructive">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchTemplates()}>
                Retry
              </Button>
            </div>
          ) : null}

          {/* Empty */}
          {templates !== null && !loadError && templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">No templates yet.</p>
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first template
              </Button>
            </div>
          ) : null}

          {/* Data */}
          {templates && templates.length > 0 && !loadError ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium">{tpl.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {tpl.subject}
                    </TableCell>
                    <TableCell>
                      <DifficultyBadge level={tpl.difficulty_level} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Preview"
                          onClick={() => setPreview(tpl)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => openEdit(tpl)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteTarget(tpl)
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
      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
        onSaved={() => void fetchTemplates()}
      />

      {/* Preview */}
      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>Rendered email preview</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-white p-4 text-sm text-black">
            <div className="mb-2 border-b pb-2 text-xs text-neutral-500">
              Subject: {preview?.subject}
            </div>
            {preview ? (
              <div dangerouslySetInnerHTML={{ __html: preview.body_html }} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Delete template</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium">{deleteTarget?.name}</span>? This
              cannot be undone.
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
