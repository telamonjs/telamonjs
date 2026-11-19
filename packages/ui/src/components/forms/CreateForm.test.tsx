import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { z } from 'zod'
import { CreateForm } from './CreateForm'
import { renderWithProviders, createMockField } from '../../test/test-utils'
import type { FormField, FormSection } from './AdminForm'

// Mock config validator
vi.mock('./validators/config-validator', () => ({
  logValidationResult: vi.fn(),
  validateFormSections: vi.fn(() => true),
}))

// Mock useToast hook
vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock field registry to simplify rendering
vi.mock('../../field-system/field-registry', () => ({
  getFieldRenderer: vi.fn(() => ({
    render: ({ field }: any) => (
      <input
        data-testid={`field-${field.name}`}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
      />
    ),
  })),
  FieldType: {} as any, // Export FieldType type to prevent import errors
}))

describe('CreateForm', () => {
  const mockAction = vi.fn()
  const mockCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders with default submit text "Criar"', () => {
      renderWithProviders(
        <CreateForm
          fields={[createMockField({ name: 'name' })]}
          action={mockAction}
        />
      )

      // Submit button keeps a fixed aria-label ('Salvar formulário');
      // the submit text is rendered as the button content
      expect(
        screen.getByRole('button', { name: /salvar formulário/i })
      ).toHaveTextContent('Criar')
    })

    it('renders with custom submit text', () => {
      renderWithProviders(
        <CreateForm
          fields={[createMockField({ name: 'name' })]}
          action={mockAction}
          submitText='Cadastrar Novo'
        />
      )

      expect(
        screen.getByRole('button', { name: /salvar formulário/i })
      ).toHaveTextContent('Cadastrar Novo')
    })

    it('renders all non-editOnly fields', () => {
      const fields = [
        createMockField({ name: 'name', editOnly: false }),
        createMockField({ name: 'email', editOnly: false }),
        createMockField({ name: 'password', editOnly: true }), // Should be filtered
      ]

      renderWithProviders(<CreateForm fields={fields} action={mockAction} />)

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-email')).toBeInTheDocument()
      expect(screen.queryByTestId('field-password')).not.toBeInTheDocument()
    })

    it('renders cancel button when cancelAction provided', () => {
      renderWithProviders(
        <CreateForm
          fields={[createMockField({ name: 'name' })]}
          action={mockAction}
          cancelAction={mockCancel}
        />
      )

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument()
    })
  })

  describe('Section Filtering', () => {
    it('filters out sections with editOnly: true', () => {
      const sections: FormSection[] = [
        {
          label: 'Basic Info',
          fields: [createMockField({ name: 'name' })],
          editOnly: false,
        },
        {
          label: 'Edit Only Section',
          fields: [createMockField({ name: 'password' })],
          editOnly: true,
        },
      ]

      renderWithProviders(
        <CreateForm sections={sections} action={mockAction} />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.queryByTestId('field-password')).not.toBeInTheDocument()
    })

    it('filters editOnly fields within sections', () => {
      const sections: FormSection[] = [
        {
          label: 'User Info',
          fields: [
            createMockField({ name: 'name', editOnly: false }),
            createMockField({ name: 'email', editOnly: false }),
            createMockField({ name: 'password', editOnly: true }),
          ],
        },
      ]

      renderWithProviders(
        <CreateForm sections={sections} action={mockAction} />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-email')).toBeInTheDocument()
      expect(screen.queryByTestId('field-password')).not.toBeInTheDocument()
    })

    it('handles nested array structure in sections', () => {
      const sections: FormSection[] = [
        {
          label: 'User Info',
          fields: [
            [
              createMockField({ name: 'firstName', editOnly: false }),
              createMockField({ name: 'lastName', editOnly: false }),
            ],
            [createMockField({ name: 'password', editOnly: true })],
          ] as FormField[][],
        },
      ]

      renderWithProviders(
        <CreateForm sections={sections} action={mockAction} />
      )

      expect(screen.getByTestId('field-firstName')).toBeInTheDocument()
      expect(screen.getByTestId('field-lastName')).toBeInTheDocument()
      expect(screen.queryByTestId('field-password')).not.toBeInTheDocument()
    })
  })

  describe('Default Values', () => {
    it('accepts defaultValues prop instead of data', () => {
      const defaultValues = { name: 'John', active: true }

      renderWithProviders(
        <CreateForm
          fields={[
            createMockField({ name: 'name' }),
            createMockField({ name: 'active', type: 'boolean' }),
          ]}
          action={mockAction}
          defaultValues={defaultValues}
        />
      )

      // Form renders without error - actual value checking requires form state
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-active')).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('accepts Zod validation schema', () => {
      const validationSchema = z.object({
        name: z.string().min(3, 'Name must be at least 3 characters'),
        email: z.string().email('Invalid email'),
      })

      renderWithProviders(
        <CreateForm
          fields={[
            createMockField({ name: 'name' }),
            createMockField({ name: 'email' }),
          ]}
          action={mockAction}
          validation={validationSchema}
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-email')).toBeInTheDocument()
    })
  })

  describe('Grid and Layout', () => {
    it('accepts grid prop', () => {
      renderWithProviders(
        <CreateForm
          fields={[createMockField({ name: 'name' })]}
          action={mockAction}
          grid='grid-cols-3'
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })

    it('accepts useTabs prop', () => {
      renderWithProviders(
        <CreateForm
          sections={[
            {
              label: 'Section 1',
              fields: [createMockField({ name: 'field1' })],
            },
            {
              label: 'Section 2',
              fields: [createMockField({ name: 'field2' })],
            },
          ]}
          action={mockAction}
          useTabs={true}
        />
      )

      // With useTabs, tabs navigation (tablist with one tab per section)
      // should be rendered
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(
        screen.getByRole('tab', { name: /section 1/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('tab', { name: /section 2/i })
      ).toBeInTheDocument()
      expect(screen.getByTestId('field-field1')).toBeInTheDocument()
    })

    it('accepts hideButtons prop', () => {
      renderWithProviders(
        <CreateForm
          fields={[createMockField({ name: 'name' })]}
          action={mockAction}
          hideButtons={true}
        />
      )

      expect(
        screen.queryByRole('button', { name: /criar/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Action Handling', () => {
    it('calls action on form submit', async () => {
      const user = userEvent.setup()
      mockAction.mockResolvedValue({ success: true })

      renderWithProviders(
        <CreateForm
          fields={[createMockField({ name: 'name' })]}
          action={mockAction}
        />
      )

      const submitButton = screen.getByRole('button', {
        name: /salvar formulário/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalled()
      })
    })

    it('calls onSuccess when action succeeds', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      mockAction.mockResolvedValue({ success: true, data: { id: '123' } })

      renderWithProviders(
        <CreateForm
          fields={[createMockField({ name: 'name' })]}
          action={mockAction}
          onSuccess={onSuccess}
        />
      )

      const submitButton = screen.getByRole('button', {
        name: /salvar formulário/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          success: true,
          data: { id: '123' },
        })
      })
    })
  })

  describe('Cancel Action', () => {
    it('calls cancelAction when cancel button clicked', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <CreateForm
          fields={[createMockField({ name: 'name' })]}
          action={mockAction}
          cancelAction={mockCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockCancel).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty fields array', () => {
      renderWithProviders(<CreateForm fields={[]} action={mockAction} />)

      expect(
        screen.getByRole('button', { name: /salvar formulário/i })
      ).toHaveTextContent('Criar')
    })

    it('handles empty sections array', () => {
      renderWithProviders(<CreateForm sections={[]} action={mockAction} />)

      expect(
        screen.getByRole('button', { name: /salvar formulário/i })
      ).toHaveTextContent('Criar')
    })

    it('handles all fields being editOnly (filters all)', () => {
      const fields = [
        createMockField({ name: 'field1', editOnly: true }),
        createMockField({ name: 'field2', editOnly: true }),
      ]

      renderWithProviders(<CreateForm fields={fields} action={mockAction} />)

      expect(screen.queryByTestId('field-field1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('field-field2')).not.toBeInTheDocument()
    })

    it('handles all sections being editOnly', () => {
      const sections: FormSection[] = [
        {
          label: 'Section 1',
          fields: [createMockField({ name: 'field1' })],
          editOnly: true,
        },
        {
          label: 'Section 2',
          fields: [createMockField({ name: 'field2' })],
          editOnly: true,
        },
      ]

      renderWithProviders(
        <CreateForm sections={sections} action={mockAction} />
      )

      expect(screen.queryByTestId('field-field1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('field-field2')).not.toBeInTheDocument()
    })
  })
})
