import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { BaseForm } from './BaseForm'
import type { FormSection } from '../../types/forms/admin-form'

const sections: FormSection[] = [
  {
    label: 'Info',
    fields: [{ name: 'name', label: 'Name', type: 'text', required: true }],
  },
]

describe('BaseForm ARIA error state', () => {
  // Regression: FieldRenderer is memoized and read form.formState.errors
  // outside the Controller, so aria-invalid never followed validation.
  it('sets aria-invalid on a failed submit and clears it once fixed', async () => {
    render(
      <BaseForm
        sections={sections}
        initialValues={{ name: '' }}
        validation={z.object({ name: z.string().min(1, 'Name is required') })}
        onSubmit={vi.fn()}
        actionsConfig={{ standard: { submit: true } }}
      />
    )
    const input = screen.getByLabelText(/Name/)
    expect(input).not.toHaveAttribute('aria-invalid', 'true')

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required')

    fireEvent.change(input, { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() =>
      expect(input).not.toHaveAttribute('aria-invalid', 'true')
    )
  })
})
