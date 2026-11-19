/**
 * Characterization tests for AdminForm behaviors that the existing 4 test
 * files (`AdminForm.controller`, `AdminForm.integration`,
 * `AdminForm.nested-data`, `src/test/AdminForm.test.tsx`) don't exercise:
 *
 * - `handleInvalid`'s auto tab-jump to the section containing the first
 *   validation error (only relevant with `sections` + `useTabs`).
 * - The `onFieldChange` callback (field/value/values + its `setValue` helper).
 * - Row-structure (nested-array) `section.fields` layout, including its
 *   per-field error rendering.
 * - `hasCrudFields`'s row-structure branch (a section hidden in create mode
 *   because a row contains a `crud` field, even when nested inside rows).
 * - The standalone `useAdminForm(fieldsOrSections, action)` helper exported
 *   at the bottom of AdminForm.tsx (both the flat-`fields` and `sections`
 *   branches).
 *
 * WHY THIS EXISTS: plan 012 (decompose god modules) wants to extract hooks
 * (tab-nav, field-change wiring) out of this 1200-line file, gated on plan
 * 011. This file pins the current behavior of those specific slices so that
 * extraction has something to run "before/after" against. As with all
 * characterization tests: pin what exists, don't "fix" it here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { z } from 'zod'
import { AdminForm, useAdminForm } from './AdminForm'
import type { FormField, FormSection } from './AdminForm'

describe('AdminForm - behaviors (tab-jump, onFieldChange, row layout, useAdminForm)', () => {
  const mockAction = vi.fn()
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup()
  })

  describe('Interactions', () => {
    it('jumps to the tab containing the first validation error on submit', async () => {
      const schema = z.object({
        nome: z.string().min(3, 'Nome curto'),
        extra: z.string().min(3, 'Extra curto'),
      })
      const sections: FormSection[] = [
        {
          label: 'Um',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
        {
          label: 'Dois',
          fields: [{ name: 'extra', label: 'Extra', type: 'text' }],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          validation={schema}
          useTabs
        />
      )

      // Tab "Um" is active by default; fill it validly. "Dois" was never
      // mounted, so `extra` stays unset and fails validation.
      await user.type(screen.getByLabelText('Nome'), 'valid-name')

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /dois/i })).toHaveAttribute(
          'aria-selected',
          'true'
        )
      })
      expect(screen.getByLabelText('Extra')).toBeInTheDocument()
      expect(mockAction).not.toHaveBeenCalled()
    })

    it('jumps to the tab whose error is on a nested field (pessoa.cpf)', async () => {
      // regression: handleInvalid used Object.keys(errors), which for an error
      // on `pessoa.cpf` returns only 'pessoa' and never matches the field name
      const schema = z.object({
        email: z.string().email('E-mail inválido'),
        pessoa: z.object({ cpf: z.string().min(11, 'CPF inválido') }),
      })
      const sections: FormSection[] = [
        {
          label: 'Acesso',
          fields: [{ name: 'email', label: 'E-mail', type: 'text' }],
        },
        {
          label: 'Pessoais',
          fields: [{ name: 'pessoa.cpf', label: 'CPF', type: 'text' }],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          validation={schema}
          useTabs
        />
      )

      await user.type(screen.getByLabelText('E-mail'), 'valido@exemplo.com')
      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /pessoais/i })).toHaveAttribute(
          'aria-selected',
          'true'
        )
      })
      expect(mockAction).not.toHaveBeenCalled()
    })

    it('does not switch tabs when useTabs is not set (single active section only)', async () => {
      const schema = z.object({
        nome: z.string().min(3, 'Nome curto'),
      })
      const sections: FormSection[] = [
        {
          label: 'Um',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          validation={schema}
        />
      )

      // Without useTabs, sections>1 tab UI never mounts at all -- confirm no
      // 'tab' role exists and the form still renders/validates normally.
      expect(screen.queryByRole('tab')).not.toBeInTheDocument()

      await user.type(screen.getByLabelText('Nome'), 'ab')
      await user.click(screen.getByRole('button', { name: /salvar/i }))
      await waitFor(() => {
        expect(
          screen.getAllByText(/nome curto/i).length
        ).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('State Management', () => {
    it('without data (create), field renderers receive the form `id` — CrudField create passes the parent id (lacuna 8a)', () => {
      const Probe = ({ id }: { id: string }) => <span data-testid='probe-id'>{id}</span>
      const fields: FormField[] = [{ name: 'clienteId', label: '', type: 'component', Component: Probe }]
      render(<AdminForm fields={fields} id='parent-1' onSubmitValues={vi.fn()} />)
      expect(screen.getByTestId('probe-id')).toHaveTextContent('parent-1')
    })

    it('with data, field renderers keep receiving data.id', () => {
      const Probe = ({ id }: { id: string }) => <span data-testid='probe-id'>{id}</span>
      const fields: FormField[] = [{ name: 'x', label: '', type: 'component', Component: Probe }]
      render(<AdminForm fields={fields} id='form-id' data={{ id: 'item-9' }} onSubmitValues={vi.fn()} />)
      expect(screen.getByTestId('probe-id')).toHaveTextContent('item-9')
    })

    it('respeita o `default` de um campo boolean (antes era sempre false)', async () => {
      const onSubmitValues = vi.fn().mockResolvedValue({ success: true })
      const fields: FormField[] = [
        { name: 'ativo', label: 'Ativo', type: 'boolean', default: true },
        { name: 'arquivado', label: 'Arquivado', type: 'boolean' },
      ]

      render(<AdminForm fields={fields} onSubmitValues={onSubmitValues} />)

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(onSubmitValues).toHaveBeenCalledWith(
          expect.objectContaining({ ativo: true, arquivado: false })
        )
      })
    })

    it('calls onFieldChange with field, value, values and a working setValue helper', async () => {
      const onFieldChange = vi.fn()
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'nome', label: 'Nome', type: 'text' },
            { name: 'apelido', label: 'Apelido', type: 'text' },
          ],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          onFieldChange={onFieldChange}
        />
      )

      await user.type(screen.getByLabelText('Nome'), 'Ana')

      await waitFor(() => expect(onFieldChange).toHaveBeenCalled())
      const lastCall = onFieldChange.mock.calls.at(-1)![0]
      expect(lastCall.field).toBe('nome')
      expect(lastCall.value).toBe('Ana')
      expect(lastCall.values.nome).toBe('Ana')

      act(() => {
        lastCall.setValue('apelido', 'A.')
      })
      expect(screen.getByLabelText('Apelido')).toHaveValue('A.')
    })
  })

  describe('Edge Cases', () => {
    it('renders row-structure (nested-array) section.fields with labels and per-row error text', async () => {
      const schema = z.object({
        nome: z.string().min(3, 'Nome curto'),
      })
      const rowFields: FormField[][] = [
        [
          { name: 'nome', label: 'Nome', type: 'text' },
          { name: 'sobrenome', label: 'Sobrenome', type: 'text' },
        ],
        [{ name: 'email', label: 'Email', type: 'email' }],
      ]
      const sections: FormSection[] = [{ label: 'Dados', fields: rowFields }]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          validation={schema}
        />
      )

      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
      expect(screen.getByLabelText('Sobrenome')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()

      await user.type(screen.getByLabelText('Nome'), 'ab')
      await user.click(screen.getByRole('button', { name: /salvar/i }))
      await waitFor(() => {
        expect(
          screen.getAllByText(/nome curto/i).length
        ).toBeGreaterThanOrEqual(1)
      })
    })

    it('hides a row-structure section containing a crud field when there is no id (create mode)', () => {
      const rowFields: FormField[][] = [
        [{ name: 'nome', label: 'Nome', type: 'text' }],
        [{ name: 'itens', label: 'Itens', type: 'crud' } as FormField],
      ]
      const sections: FormSection[] = [{ label: 'Dados', fields: rowFields }]

      // No `id` prop -> create mode -> the whole section is hidden because
      // hasCrudFields() checks the WHOLE row structure, not just the row
      // that has the crud field.
      render(<AdminForm sections={sections} action={mockAction} />)

      expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
      expect(screen.queryByRole('group')).not.toBeInTheDocument()
    })
  })

  describe('useAdminForm helper', () => {
    it('builds a FormComponent bound to `fields` when given a flat FormField[]', async () => {
      const fields: FormField[] = [
        { name: 'nome', label: 'Nome', type: 'text' },
      ]
      const { result } = renderHook(() => useAdminForm(fields, mockAction))
      const { FormComponent } = result.current

      render(<FormComponent />)

      await user.type(screen.getByLabelText('Nome'), 'Ana')
      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => expect(mockAction).toHaveBeenCalledTimes(1))
      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('nome')).toBe('Ana')
    })

    it('builds a FormComponent bound to `sections` when given FormSection[]', () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]
      const { result } = renderHook(() => useAdminForm(sections, mockAction))
      const { FormComponent, sections: returnedSections } = result.current

      expect(returnedSections).toBe(sections)
      render(<FormComponent />)
      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    })
  })
})
