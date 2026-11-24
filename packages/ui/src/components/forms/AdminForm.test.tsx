import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { z } from 'zod'
import { AdminForm } from './AdminForm'
import { hasDirtyField } from './dirty-fields'
import { renderWithProviders, createMockField } from '../../test/test-utils'

// Mock the field registry to avoid complex dependencies
vi.mock('../../field-system/field-registry', () => ({
  getFieldRenderer: vi.fn(type => ({
    render: ({ field, value }) => (
      <input
        data-testid={`field-${field.name}`}
        value={field.value || ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
        placeholder={field.placeholder}
        required={field.required}
      />
    ),
  })),
}))

describe('AdminForm', () => {
  const mockAction = vi.fn()
  const defaultFields = [
    createMockField({ name: 'name', label: 'Name', required: true }),
    createMockField({ name: 'email', label: 'Email', type: 'email' }),
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders form with fields', () => {
      renderWithProviders(
        <AdminForm fields={defaultFields} action={mockAction} />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-email')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('renders with custom submit text', () => {
      renderWithProviders(
        <AdminForm
          fields={defaultFields}
          action={mockAction}
          submitText='Create User'
        />
      )

      // Submit button keeps a fixed aria-label ('Salvar formulário');
      // the custom submit text is rendered as the button content
      const submitButton = screen.getByRole('button', {
        name: /salvar formulário/i,
      })
      expect(submitButton).toHaveTextContent('Create User')
    })

    it('renders cancel button when cancelAction is provided', () => {
      const mockCancel = vi.fn()
      renderWithProviders(
        <AdminForm
          fields={defaultFields}
          action={mockAction}
          cancelAction={mockCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('pre-populates fields with data prop', () => {
      const initialData = { name: 'John Doe', email: 'john@example.com' }

      renderWithProviders(
        <AdminForm
          fields={defaultFields}
          action={mockAction}
          data={initialData}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('John Doe')
      expect(screen.getByTestId('field-email')).toHaveValue('john@example.com')
    })
  })

  describe('Form Sections', () => {
    it('renders sectioned form', () => {
      const sectionsFields = [
        {
          label: 'Personal',
          fields: [
            createMockField({ name: 'name', label: 'Name' }),
            createMockField({ name: 'email', label: 'Email' }),
          ],
        },
        {
          label: 'Details',
          fields: [createMockField({ name: 'phone', label: 'Phone' })],
        },
      ]

      renderWithProviders(
        <AdminForm sections={sectionsFields} action={mockAction} />
      )

      // Form renders with fields from first section
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-email')).toBeInTheDocument()
    })

    it('renders multiple sections without tabs by default', () => {
      const sectionsFields = [
        {
          label: 'Personal',
          fields: [createMockField({ name: 'name', label: 'Name' })],
        },
        {
          label: 'Details',
          fields: [createMockField({ name: 'phone', label: 'Phone' })],
        },
      ]

      renderWithProviders(
        <AdminForm sections={sectionsFields} action={mockAction} />
      )

      // In default mode (no tabs), first section's fields should be visible
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })
  })

  describe('Section spacing', () => {
    const twoSections = [
      { label: 'Personal', fields: [createMockField({ name: 'name', label: 'Name' })] },
      { label: 'Details', fields: [createMockField({ name: 'phone', label: 'Phone' })] },
    ]
    // group (field grid) → section block → container that spaces the sections
    const sectionsContainer = (label: string) =>
      screen.getByRole('group', { name: label }).parentElement?.parentElement

    it.each([
      ['non-flush', false],
      ['flush', true],
    ])('separates sections with space-y-6 (%s)', (_mode, flush) => {
      renderWithProviders(
        <AdminForm sections={twoSections} action={mockAction} flush={flush} />
      )

      const container = sectionsContainer('Personal')
      expect(container).toBe(sectionsContainer('Details'))
      // a `display: contents` wrapper swallowed the form's space-y-6 (Meritux)
      expect(container).toHaveClass('space-y-6')
      expect(container).not.toHaveClass('contents')
    })
  })

  describe('Form Submission', () => {
    it('calls action with form data on submit', async () => {
      const user = userEvent.setup()
      mockAction.mockResolvedValue({ success: true })

      renderWithProviders(
        <AdminForm fields={defaultFields} action={mockAction} />
      )

      const nameInput = screen.getByTestId('field-name')
      const emailInput = screen.getByTestId('field-email')
      const submitButton = screen.getByRole('button', { name: /salvar/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledWith(expect.any(FormData))
      })
    })

    it('renders submit button', () => {
      renderWithProviders(
        <AdminForm fields={defaultFields} action={mockAction} />
      )

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).not.toBeDisabled()
    })

    it('accepts id prop for edit mode', () => {
      renderWithProviders(
        <AdminForm fields={defaultFields} action={mockAction} id='123' />
      )

      // Form renders in edit mode
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })

    it('accepts onSuccess callback prop', () => {
      const mockOnSuccess = vi.fn()

      renderWithProviders(
        <AdminForm
          fields={defaultFields}
          action={mockAction}
          onSuccess={mockOnSuccess}
        />
      )

      // Component renders with onSuccess prop
      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('accepts Zod validation schema prop', () => {
      const schema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email'),
      })

      renderWithProviders(
        <AdminForm
          fields={defaultFields}
          action={mockAction}
          validation={schema}
        />
      )

      // Form renders with validation schema
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-email')).toBeInTheDocument()
    })

    it('renders without validation schema', () => {
      renderWithProviders(
        <AdminForm fields={defaultFields} action={mockAction} />
      )

      // Form renders without errors when no validation provided
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })
  })

  describe('Cancel Action', () => {
    it('calls cancelAction when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const mockCancel = vi.fn()

      renderWithProviders(
        <AdminForm
          fields={defaultFields}
          action={mockAction}
          cancelAction={mockCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockCancel).toHaveBeenCalled()
    })
  })

  describe('Field Interactions', () => {
    it('updates field values on user input', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <AdminForm fields={defaultFields} action={mockAction} />
      )

      const nameInput = screen.getByTestId('field-name')
      await user.type(nameInput, 'John Doe')

      expect(nameInput).toHaveValue('John Doe')
    })

    it('handles required field indicators', () => {
      const requiredField = createMockField({
        name: 'required-field',
        label: 'Required Field',
        required: true,
      })

      renderWithProviders(
        <AdminForm fields={[requiredField]} action={mockAction} />
      )

      expect(screen.getByTestId('field-required-field')).toHaveAttribute(
        'required'
      )
    })
  })

  describe('hasDirtyField', () => {
    it('only counts fields actually marked dirty (nested and arrays)', () => {
      expect(hasDirtyField({})).toBe(false)
      expect(hasDirtyField({ pessoa: {} })).toBe(false)
      expect(hasDirtyField({ pessoa: { nome: false } })).toBe(false)
      expect(hasDirtyField({ pessoa: { nome: true } })).toBe(true)
      expect(hasDirtyField({ itens: [undefined, { valor: true }] })).toBe(true)
      expect(hasDirtyField({ itens: [] })).toBe(false)
    })
  })

  describe('onDirtyChange', () => {
    it('fires with true after a field is edited, then false after reverting it', async () => {
      const user = userEvent.setup()
      const onDirtyChange = vi.fn()

      renderWithProviders(
        <AdminForm
          fields={[createMockField({ name: 'name', label: 'Name' })]}
          data={{ name: 'Original' }}
          action={mockAction}
          onDirtyChange={onDirtyChange}
        />
      )

      // Mount: not dirty
      expect(onDirtyChange).toHaveBeenLastCalledWith(false)

      const input = screen.getByTestId('field-name')
      await user.clear(input)
      await user.type(input, 'Changed')

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenLastCalledWith(true)
      })

      await user.clear(input)
      await user.type(input, 'Original')

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenLastCalledWith(false)
      })
    })

    it('a create form (no defaults, nested field) is NOT dirty on mount', async () => {
      // RHF recomputes isDirty on mount by deep-comparing current values with
      // defaultValues; registering fields without a default (and nested ones,
      // e.g. `pessoa.nome`) changes the key count, so isDirty became true with
      // empty dirtyFields — every CreateDialog asked "Descartar alterações?".
      const user = userEvent.setup()
      const onDirtyChange = vi.fn()

      renderWithProviders(
        <AdminForm
          fields={[
            createMockField({ name: 'active', label: 'Ativo', type: 'boolean', default: true }),
            createMockField({ name: 'name', label: 'Name' }),
            createMockField({ name: 'pessoa.nome', label: 'Nome' }),
            createMockField({ name: 'pessoa.cpf', label: 'CPF' }),
          ]}
          data={{ active: true }}
          action={mockAction}
          onDirtyChange={onDirtyChange}
        />
      )

      await waitFor(() => expect(onDirtyChange).toHaveBeenCalled())
      expect(onDirtyChange).not.toHaveBeenCalledWith(true)

      await user.type(screen.getByTestId('field-name'), 'x')
      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenLastCalledWith(true)
      })
    })

    it('is not required — AdminForm works without it', () => {
      renderWithProviders(
        <AdminForm fields={defaultFields} action={mockAction} />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })
  })

  describe('data arriving after mount', () => {
    it('applies data that arrives asynchronously (same instance, still pristine)', () => {
      const { rerender } = renderWithProviders(
        <AdminForm
          fields={[createMockField({ name: 'name', label: 'Name' })]}
          action={mockAction}
          data={undefined}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('')

      rerender(
        <AdminForm
          fields={[createMockField({ name: 'name', label: 'Name' })]}
          action={mockAction}
          data={{ name: 'Alice' }}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('Alice')
    })

    it('does not clobber a field the user already typed into when data arrives late', async () => {
      const user = userEvent.setup()
      const { rerender } = renderWithProviders(
        <AdminForm
          fields={[createMockField({ name: 'name', label: 'Name' })]}
          action={mockAction}
          data={undefined}
        />
      )

      const input = screen.getByTestId('field-name')
      await user.type(input, 'Typed by user')
      expect(input).toHaveValue('Typed by user')

      rerender(
        <AdminForm
          fields={[createMockField({ name: 'name', label: 'Name' })]}
          action={mockAction}
          data={{ name: 'Server value' }}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('Typed by user')
    })
  })

  describe('Field Description (help text)', () => {
    it('renders field.description as help text in the default grid layout', () => {
      renderWithProviders(
        <AdminForm
          fields={[
            createMockField({
              name: 'name',
              label: 'Name',
              description: 'Full legal name',
            }),
          ]}
          action={mockAction}
        />
      )

      expect(screen.getByText('Full legal name')).toBeInTheDocument()
    })

    it('renders field.description as help text in a flush, grid="1" section (regression: previously silently dropped)', () => {
      const sections = [
        {
          label: 'Dados',
          grid: '1',
          fields: [
            createMockField({
              name: 'name',
              label: 'Name',
              description: 'Full legal name',
            }),
          ],
        },
      ]

      renderWithProviders(
        <AdminForm sections={sections} action={mockAction} flush />
      )

      expect(screen.getByText('Full legal name')).toBeInTheDocument()
    })

    it('does not render an empty help text node when field.description is absent', () => {
      renderWithProviders(
        <AdminForm fields={defaultFields} action={mockAction} />
      )

      // defaultFields carry no description — nothing extra to find
      expect(screen.queryByText(/./, { selector: 'p' })).not.toBeInTheDocument()
    })

    it('skips the shared help text for boolean/checkbox fields (they render their own, inline)', () => {
      renderWithProviders(
        <AdminForm
          fields={[
            createMockField({
              name: 'active',
              label: 'Active',
              type: 'boolean',
              description: 'Whether the record is active',
            }),
          ]}
          action={mockAction}
        />
      )

      // The mocked field renderer doesn't render description itself here —
      // this only proves field-group.tsx doesn't ALSO render it (which
      // would duplicate the boolean renderer's own inline description).
      expect(
        screen.queryByText('Whether the record is active')
      ).not.toBeInTheDocument()
    })
  })

  describe('API error message (consumer QA 7.3.1)', () => {
    it('shows the API messages (NestJS array) instead of the generic text', async () => {
      const user = userEvent.setup()
      const err = new Error('x') as Error & { message: unknown }
      err.message = ['property id should not exist', 'nome must be a string']
      const onSubmitValues = vi.fn().mockRejectedValue(err)
      renderWithProviders(
        <AdminForm fields={[createMockField({ name: 'nome' })]} onSubmitValues={onSubmitValues} />
      )
      await user.click(screen.getByRole('button', { name: /salvar/i }))
      expect(await screen.findByText(/property id should not exist/)).toBeInTheDocument()
      expect(screen.queryByText('Erro ao processar formulário')).not.toBeInTheDocument()
    })

    it('uses field errors of a { success: false } result before the generic text', async () => {
      const user = userEvent.setup()
      const onSubmitValues = vi.fn().mockResolvedValue({ success: false, errors: { nome: ['Nome já existe'] } })
      renderWithProviders(
        <AdminForm fields={[createMockField({ name: 'nome' })]} onSubmitValues={onSubmitValues} />
      )
      await user.click(screen.getByRole('button', { name: /salvar/i }))
      expect(await screen.findByText('Nome já existe')).toBeInTheDocument()
    })
  })

  describe('Conditional visibility (visibleWhen)', () => {
    it('does not render a field whose visibleWhen returns false initially', () => {
      renderWithProviders(
        <AdminForm
          fields={[
            createMockField({ name: 'flag' }),
            createMockField({
              name: 'secret',
              visibleWhen: values => values.flag === 'show',
            }),
          ]}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-flag')).toBeInTheDocument()
      expect(screen.queryByTestId('field-secret')).not.toBeInTheDocument()
    })

    it('shows/hides reactively as the field it depends on changes, without unmounting sibling fields', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <AdminForm
          fields={[
            createMockField({ name: 'flag' }),
            createMockField({ name: 'always' }),
            createMockField({
              name: 'secret',
              visibleWhen: values => values.flag === 'show',
            }),
          ]}
          action={mockAction}
        />
      )

      expect(screen.queryByTestId('field-secret')).not.toBeInTheDocument()

      await user.type(screen.getByTestId('field-flag'), 'show')
      expect(await screen.findByTestId('field-secret')).toBeInTheDocument()

      // A sibling field with no visibleWhen never unmounts/remounts while
      // the conditional field toggles.
      const alwaysInput = screen.getByTestId('field-always')
      await user.type(alwaysInput, 'kept')
      expect(alwaysInput).toHaveValue('kept')

      await user.clear(screen.getByTestId('field-flag'))
      await waitFor(() =>
        expect(screen.queryByTestId('field-secret')).not.toBeInTheDocument()
      )
      expect(screen.getByTestId('field-always')).toHaveValue('kept')
    })

    it('hides every field of a section whose own visibleWhen returns false', () => {
      renderWithProviders(
        <AdminForm
          sections={[
            {
              label: 'Flag',
              fields: [createMockField({ name: 'aplicarCotas' })],
            },
            {
              label: 'Cotas',
              visibleWhen: values => values.aplicarCotas === 'true',
              fields: [
                createMockField({ name: 'percentualPPI' }),
                createMockField({ name: 'percentualPCD' }),
              ],
            },
          ]}
          action={mockAction}
        />
      )

      expect(
        screen.queryByTestId('field-percentualPPI')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('field-percentualPCD')
      ).not.toBeInTheDocument()
    })

    it('omits a hidden field from the submitted values (onSubmitValues/JSON mode)', async () => {
      const user = userEvent.setup()
      const onSubmitValues = vi.fn().mockResolvedValue({ success: true })

      renderWithProviders(
        <AdminForm
          fields={[
            createMockField({ name: 'flag' }),
            createMockField({
              name: 'secret',
              visibleWhen: values => values.flag === 'show',
            }),
          ]}
          onSubmitValues={onSubmitValues}
        />
      )

      // Type into `secret` while visible, then hide it again — its stale
      // value must not reach the consumer.
      await user.type(screen.getByTestId('field-flag'), 'show')
      await user.type(
        await screen.findByTestId('field-secret'),
        'sensitive value'
      )
      await user.clear(screen.getByTestId('field-flag'))
      await waitFor(() =>
        expect(screen.queryByTestId('field-secret')).not.toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => expect(onSubmitValues).toHaveBeenCalled())
      const submitted = onSubmitValues.mock.calls[0][0]
      expect(submitted).not.toHaveProperty('secret')
    })

    it('visibleWhen sees the whole record, not just the section schema output (portal onSaveSection, 7.3.1)', async () => {
      const user = userEvent.setup()
      const onSubmitValues = vi.fn().mockResolvedValue({ success: true })
      // Section schema has only `limite` — zod strips `tipoEvento` from its output,
      // which used to make `limite` look hidden at submit and drop the edit.
      const schema = z.object({ limite: z.string() })

      renderWithProviders(
        <AdminForm
          id='r1'
          data={{ id: 'r1', tipoEvento: 'OVERSPEED', limite: '80' }}
          fields={[
            createMockField({
              name: 'limite',
              visibleWhen: values => values.tipoEvento === 'OVERSPEED',
            }),
          ]}
          validation={schema}
          onSubmitValues={onSubmitValues}
        />
      )

      const input = await screen.findByTestId('field-limite')
      await user.clear(input)
      await user.type(input, '90')
      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => expect(onSubmitValues).toHaveBeenCalled())
      expect(onSubmitValues.mock.calls[0][0]).toMatchObject({ limite: '90' })
    })

    it('does not block submission when a hidden field fails required Zod validation', async () => {
      const user = userEvent.setup()
      const onSubmitValues = vi.fn().mockResolvedValue({ success: true })
      const schema = z.object({
        flag: z.string(),
        secret: z.string().min(1, 'Obrigatório'),
      })

      renderWithProviders(
        <AdminForm
          fields={[
            createMockField({ name: 'flag' }),
            createMockField({
              name: 'secret',
              visibleWhen: values => values.flag === 'show',
            }),
          ]}
          data={{ flag: 'no' }}
          validation={schema}
          onSubmitValues={onSubmitValues}
        />
      )

      // `secret` is hidden (flag never set to 'show') and empty — a
      // required-field violation the consumer's schema would normally
      // block on, but the field never rendered so it must never validate.
      expect(screen.queryByTestId('field-secret')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => expect(onSubmitValues).toHaveBeenCalled())
      const submitted = onSubmitValues.mock.calls[0][0]
      expect(submitted).not.toHaveProperty('secret')
    })

    it('does not tab-jump to a section whose only error belongs to a hidden field', async () => {
      const user = userEvent.setup()
      const onSubmitValues = vi.fn().mockResolvedValue({ success: true })
      const schema = z.object({
        aplicarCotas: z.string(),
        percentual: z.string().min(1, 'Obrigatório'),
      })

      renderWithProviders(
        <AdminForm
          sections={[
            {
              label: 'Geral',
              fields: [createMockField({ name: 'aplicarCotas' })],
            },
            {
              label: 'Cotas',
              fields: [
                createMockField({
                  name: 'percentual',
                  visibleWhen: values => values.aplicarCotas === 'true',
                }),
              ],
            },
          ]}
          data={{ aplicarCotas: 'false' }}
          validation={schema}
          onSubmitValues={onSubmitValues}
          useTabs
          activeTab='0'
        />
      )

      // percentual is hidden and empty (violates schema), aplicarCotas is
      // untouched but satisfies the schema (any string, including '') —
      // the only would-be error is on the hidden field.
      expect(screen.getByTestId('field-aplicarCotas')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      // Stays on section 0 (no error left to jump to) and submits.
      await waitFor(() => expect(onSubmitValues).toHaveBeenCalled())
      expect(screen.getByTestId('field-aplicarCotas')).toBeInTheDocument()
      expect(screen.queryByTestId('field-percentual')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty fields array', () => {
      renderWithProviders(<AdminForm fields={[]} action={mockAction} />)

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('handles missing action prop gracefully', () => {
      expect(() => {
        renderWithProviders(
          <AdminForm fields={defaultFields} action={undefined as any} />
        )
      }).not.toThrow()
    })

    it('handles field without name', () => {
      const invalidField = { ...createMockField(), name: '' }

      expect(() => {
        renderWithProviders(
          <AdminForm fields={[invalidField]} action={mockAction} />
        )
      }).not.toThrow()
    })
  })
})
