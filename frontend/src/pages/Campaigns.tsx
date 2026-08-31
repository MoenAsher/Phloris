import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Plus, ArrowRight } from 'lucide-react'

import { api } from '@/lib/api'
import type { ApiEnvelope, Campaign, SendingProfile, Template, TargetGroup } from '@/types'
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
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/campaigns/StatusBadge'
import { CreateCampaignDialog } from '@/components/campaigns/CreateCampaignDialog'

function CampaignsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Template</TableHead>
          <TableHead>Target group</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-36" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-14" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function Campaigns() {
  const navigate = useNavigate()

  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [groups, setGroups] = useState<TargetGroup[]>([])
  const [profiles, setProfiles] = useState<SendingProfile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setError(null)
    try {
      const [campaignsResp, templatesResp, groupsResp, profilesResp] = await Promise.all([
        api.get<ApiEnvelope<Campaign[]>>('/api/campaigns'),
        api.get<ApiEnvelope<Template[]>>('/api/templates'),
        api.get<ApiEnvelope<TargetGroup[]>>('/api/target-groups'),
        api.get<ApiEnvelope<SendingProfile[]>>('/api/sending-profiles'),
      ])
      setCampaigns(campaignsResp.data.data)
      setTemplates(templatesResp.data.data)
      setGroups(groupsResp.data.data)
      setProfiles(profilesResp.data.data)
    } catch (err) {
      setCampaigns([])
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setError('Failed to load campaigns.')
      }
    }
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const templateName = (id: number) =>
    templates.find((t) => t.id === id)?.name ?? '—'
  const groupName = (id: number) => groups.find((g) => g.id === id)?.name ?? '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Campaigns</h2>
          <p className="text-sm text-muted-foreground">
            Create, launch, and track phishing simulation campaigns.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All campaigns</CardTitle>
          <CardDescription>
            {campaigns === null
              ? 'Loading…'
              : `${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns === null && !error ? (
            <CampaignsTableSkeleton />
          ) : null}

          {error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchAll()}>
                Retry
              </Button>
            </div>
          ) : null}

          {campaigns !== null && !error && campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create your first campaign
              </Button>
            </div>
          ) : null}

          {campaigns && campaigns.length > 0 && !error ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Target group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {templateName(c.template_id)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {groupName(c.target_group_id)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/campaigns/${c.id}`)
                        }}
                      >
                        View
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      <CreateCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        templates={templates}
        groups={groups}
        profiles={profiles}
        onCreated={(campaign) => navigate(`/campaigns/${campaign.id}`)}
      />
    </div>
  )
}
