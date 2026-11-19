/**
 * 7.14: `minDate`/`maxDate` of a date field are enforced on submit by the
 * AdminForm resolver — a typed value outside the limit blocks the save with the
 * library message, with or without a zod schema.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { z } from 'zod'
import { AdminForm } from './AdminForm'
import type { FormField } from './AdminForm'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const amanha = new Date(Date.now() + 2 * 86_400_000).toISOString()
const fields: FormField[] = [
  { name: 'pago', label: 'Pago em', type: 'date', maxDate: 'today' },
]

describe('AdminForm date limits', () => {
  it('blocks a future date on submit (no schema)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<AdminForm fields={fields} data={{ pago: amanha }} onSubmitValues={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(screen.getAllByText(/A data deve ser até/).length).toBeGreaterThan(0))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks it with a schema too, and a valid day submits', async () => {
    const onSubmit = vi.fn(async () => ({ success: true }))
    const user = userEvent.setup()
    const { unmount } = render(
      <AdminForm
        fields={fields}
        validation={z.object({ pago: z.string() })}
        data={{ pago: amanha }}
        onSubmitValues={onSubmit}
      />
    )
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(screen.getAllByText(/A data deve ser até/).length).toBeGreaterThan(0))
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()

    render(
      <AdminForm
        fields={fields}
        validation={z.object({ pago: z.string() })}
        data={{ pago: new Date().toISOString() }}
        onSubmitValues={onSubmit}
      />
    )
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })
})
