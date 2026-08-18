import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn() },
}))

import { api } from '@/lib/api'
import { CreateCampaignDialog } from '@/components/campaigns/CreateCampaignDialog'
import type { Template, TargetGroup } from '@/types'

const mockedApi = api as unknown as { post: ReturnType<typeof vi.fn> }

const TEMPLATES: Template[] = [
  { id: 1, name: 'Easy Lottery', subject: 's', body_html: 'b', difficulty_level: 'easy', feedback_notes: null, created_at: '' },
  { id: 2, name: 'Medium IT', subject: 's', body_html: 'b', difficulty_level: 'medium', feedback_notes: null, created_at: '' },
]
const GROUPS: TargetGroup[] = [
  { id: 10, name: 'Finance', description: null, target_count: 5, created_at: '' },
  { id: 20, name: 'Engineering', description: null, target_count: 8, created_at: '' },
]

describe('CreateCampaignDialog', () => {
  beforeEach(() => {
    mockedApi.post.mockReset().mockResolvedValue({ data: { data: { id: 99 } } })
  })

  // 6.3 — cannot create a campaign without at least one template AND one group
  it('blocks creation and explains the prerequisites when no templates exist', () => {
    render(
      <CreateCampaignDialog
        open
        onOpenChange={vi.fn()}
        templates={[]}
        groups={GROUPS}
        onCreated={vi.fn()}
      />,
    )
    expect(
      screen.getByText(/at least one template and one target group/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/No templates yet/i)).toBeInTheDocument()
    // No create form is offered.
    expect(
      screen.queryByRole('button', { name: /create campaign/i }),
    ).not.toBeInTheDocument()
  })

  it('blocks creation when no target groups exist', () => {
    render(
      <CreateCampaignDialog
        open
        onOpenChange={vi.fn()}
        templates={TEMPLATES}
        groups={[]}
        onCreated={vi.fn()}
      />,
    )
    expect(screen.getByText(/No target groups yet/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /create campaign/i }),
    ).not.toBeInTheDocument()
  })

  // 6.3 — with prereqs present, submit stays disabled until a name is entered
  it('requires a name; both selects default to the first option', async () => {
    const user = userEvent.setup()
    render(
      <CreateCampaignDialog
        open
        onOpenChange={vi.fn()}
        templates={TEMPLATES}
        groups={GROUPS}
        onCreated={vi.fn()}
      />,
    )
    const submit = screen.getByRole('button', { name: /create campaign/i })
    expect(submit).toBeDisabled()

    // Selects are pre-populated with the first template/group.
    expect((screen.getByLabelText('Template') as HTMLSelectElement).value).toBe('1')
    expect((screen.getByLabelText('Target group') as HTMLSelectElement).value).toBe('10')

    await user.type(screen.getByLabelText('Name'), 'Q3 Test')
    expect(submit).toBeEnabled()
  })

  // 6.2 — submits with the chosen template + group as numeric ids
  it('posts the campaign with numeric template_id and target_group_id', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <CreateCampaignDialog
        open
        onOpenChange={onOpenChange}
        templates={TEMPLATES}
        groups={GROUPS}
        onCreated={onCreated}
      />,
    )
    await user.type(screen.getByLabelText('Name'), '  Autumn Drill  ')
    await user.selectOptions(screen.getByLabelText('Template'), '2')
    await user.selectOptions(screen.getByLabelText('Target group'), '20')
    await user.click(screen.getByRole('button', { name: /create campaign/i }))

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(1))
    const [url, payload] = mockedApi.post.mock.calls[0]
    expect(url).toBe('/api/campaigns')
    expect(payload).toEqual({
      name: 'Autumn Drill',
      template_id: 2,
      target_group_id: 20,
    })
    expect(typeof payload.template_id).toBe('number')
    expect(typeof payload.target_group_id).toBe('number')
    expect(onCreated).toHaveBeenCalledWith({ id: 99 })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
