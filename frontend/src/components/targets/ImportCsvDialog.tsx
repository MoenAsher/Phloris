import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { isAxiosError } from 'axios'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

import { api } from '@/lib/api'
import type { ApiEnvelope, ImportResult } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ImportCsvDialog({
  open,
  onOpenChange,
  groupId,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  onImported: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (open) {
      setFile(null)
      setResult(null)
      setError(null)
    }
  }, [open])

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setResult(null)
    setError(null)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const resp = await api.post<ApiEnvelope<ImportResult>>(
        `/api/target-groups/${groupId}/targets/import`,
        formData,
      )
      setResult(resp.data.data)
      onImported() // refresh the targets table behind the dialog
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setError('Import failed.')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import targets from CSV</DialogTitle>
          <DialogDescription>
            Columns: <code>email, first_name, last_name</code> (a header row is
            optional). Rows with an invalid or duplicate email are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV file</Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={onFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}

          {result ? (
            <div className="space-y-3 rounded-md border p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Imported {result.imported} target
                {result.imported === 1 ? '' : 's'}.
              </p>
              {result.rejected.length > 0 ? (
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    {result.rejected.length} row
                    {result.rejected.length === 1 ? '' : 's'} rejected:
                  </p>
                  <ul className="max-h-40 space-y-0.5 overflow-y-auto pl-6 text-muted-foreground">
                    {result.rejected.map((r, i) => (
                      <li key={`${r.email}-${i}`} className="list-disc">
                        <span className="font-mono">{r.email || '(blank)'}</span> —{' '}
                        {r.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground">No rows were rejected.</p>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          {!result ? (
            <Button onClick={() => void handleUpload()} disabled={!file || uploading}>
              {uploading ? 'Importing…' : 'Import'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
