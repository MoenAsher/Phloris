import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the API layer so component tests never hit the network (Section 12).
vi.mock('@/lib/api', () => ({
  api: { post: vi.fn(), put: vi.fn() },
}))

import { api } from '@/lib/api'
import { TemplateFormDialog } from '@/components/templates/TemplateFormDialog'
import type { Template } from '@/types'

const mockedApi = api as unknown as {
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

function renderCreate() {
  const onOpenChange = vi.fn()
  const onSaved = vi.fn()
  render(
    <TemplateFormDialog
      open
      onOpenChange={onOpenChange}
      template={null}
      onSaved={onSaved}
    />,
  )
  return { onOpenChange, onSaved }
}

describe('TemplateFormDialog', () => {
  beforeEach(() => {
    mockedApi.post.mockReset().mockResolvedValue({ data: { data: {} } })
    mockedApi.put.mockReset().mockResolvedValue({ data: { data: {} } })
  })

  // 4.4 — difficulty selector only allows easy/medium/hard
  it('offers exactly easy/medium/hard as difficulty options', () => {
    renderCreate()
    const select = screen.getByLabelText('Difficulty') as HTMLSelectElement
    const values = Array.from(select.options).map((o) => o.value)
    expect(values).toEqual(['easy', 'medium', 'hard'])
  })

  // 4.10 — submit disabled until required fields are present
  it('keeps the submit button disabled until name, subject and body are filled', async () => {
    const user = userEvent.setup()
    renderCreate()
    const submit = screen.getByRole('button', { name: /create template/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('Name'), 'Payroll notice')
    expect(submit).toBeDisabled() // subject + body still missing
    await user.type(screen.getByLabelText('Subject'), 'Your payslip is ready')
    expect(submit).toBeDisabled() // body still missing
    await user.type(
      screen.getByLabelText('Body (HTML)'),
      '<p>Hi {{first_name}}</p>',
    )
    expect(submit).toBeEnabled()
  })

  // 4.3 + 4.6 — create posts the template and preserves placeholders verbatim
  it('posts the new template with placeholder tokens preserved exactly', async () => {
    const user = userEvent.setup()
    const { onSaved, onOpenChange } = renderCreate()

    await user.type(screen.getByLabelText('Name'), '  Password reset  ')
    await user.type(screen.getByLabelText('Subject'), '  Reset now  ')
    const body =
      '<p>Hi {{first_name}} {{last_name}}, <a href="{{tracking_link}}">verify</a> or <a href="{{report_link}}">report</a>.</p>'
    // Set the body via fireEvent.change, NOT user.type: user-event treats "{{"
    // as the escape for a literal "{", which would mangle the placeholder
    // tokens. change() inserts the exact string, so the verbatim-preservation
    // assertion below tests the component, not the typing helper.
    fireEvent.change(screen.getByLabelText('Body (HTML)'), { target: { value: body } })
    await user.selectOptions(screen.getByLabelText('Difficulty'), 'hard')

    await user.click(screen.getByRole('button', { name: /create template/i }))

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(1))
    const [url, payload] = mockedApi.post.mock.calls[0]
    expect(url).toBe('/api/templates')
    // name/subject trimmed, body sent verbatim with all four placeholders intact
    expect(payload).toMatchObject({
      name: 'Password reset',
      subject: 'Reset now',
      body_html: body,
      difficulty_level: 'hard',
      feedback_notes: null,
    })
    expect(payload.body_html).toContain('{{first_name}}')
    expect(payload.body_html).toContain('{{last_name}}')
    expect(payload.body_html).toContain('{{tracking_link}}')
    expect(payload.body_html).toContain('{{report_link}}')

    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  // 4.7 — edit mode pre-fills existing values (placeholders intact) and PUTs
  it('pre-fills fields in edit mode and PUTs to the template id', async () => {
    const user = userEvent.setup()
    const existing: Template = {
      id: 42,
      name: 'IT Password Expiry',
      subject: 'Action required',
      body_html: '<p>Hi {{first_name}}, <a href="{{tracking_link}}">go</a></p>',
      difficulty_level: 'medium',
      feedback_notes: 'Watch the urgency.',
      created_at: '2026-01-01T00:00:00Z',
    }
    render(
      <TemplateFormDialog
        open
        onOpenChange={vi.fn()}
        template={existing}
        onSaved={vi.fn()}
      />,
    )

    // Placeholders are preserved in the loaded body (4.6)
    const bodyField = screen.getByLabelText('Body (HTML)') as HTMLTextAreaElement
    expect(bodyField.value).toContain('{{first_name}}')
    expect(bodyField.value).toContain('{{tracking_link}}')
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(
      'IT Password Expiry',
    )

    await user.clear(screen.getByLabelText('Subject'))
    await user.type(screen.getByLabelText('Subject'), 'Updated subject')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledTimes(1))
    const [url, payload] = mockedApi.put.mock.calls[0]
    expect(url).toBe('/api/templates/42')
    expect(payload.subject).toBe('Updated subject')
    expect(payload.body_html).toContain('{{tracking_link}}')
    expect(mockedApi.post).not.toHaveBeenCalled()
  })

  // 4.5 — HTML preview renders the entered body
  it('renders an HTML preview of the entered body', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.type(
      screen.getByLabelText('Body (HTML)'),
      '<strong>URGENT</strong>',
    )
    // The live-preview panel renders the HTML, so the bold text appears as an element.
    await waitFor(() => {
      const strong = document.querySelector('strong')
      expect(strong).not.toBeNull()
      expect(within(strong as HTMLElement).getByText('URGENT')).toBeInTheDocument()
    })
  })

  // 4.13 — a failing API surfaces an error message, no crash
  it('surfaces an error message when the API rejects', async () => {
    const user = userEvent.setup()
    mockedApi.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: 'name already used' } },
    })
    renderCreate()
    await user.type(screen.getByLabelText('Name'), 'Dupe')
    await user.type(screen.getByLabelText('Subject'), 'Subject')
    await user.type(screen.getByLabelText('Body (HTML)'), '<p>x</p>')
    await user.click(screen.getByRole('button', { name: /create template/i }))
    expect(await screen.findByText('name already used')).toBeInTheDocument()
  })
})
