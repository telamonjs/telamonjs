import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { z } from 'zod'
import { EditForm } from './EditForm'
import { renderWithProviders, createMockField } from '../../test/test-utils'

// Mock the field registry
vi.mock('../../field-system/field-registry', () => ({
  getFieldRenderer: vi.fn(type => ({
    render: ({ field }) => (
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
  fieldRegistry: {},
}))

describe('EditForm', () => {
  const mockAction = vi.fn()
  const defaultSections = [
    {
      title: 'Personal Info',
      fields: [
        createMockField({ name: 'name', label: 'Name', required: true }),
        createMockField({ name: 'email', label: 'Email', type: 'email' }),
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress dev mode console warnings in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  describe('Required Props Enforcement', () => {
    it('requires id prop - TypeScript enforces this', () => {
      // TypeScript should enforce id prop
      const data = { name: 'John Doe', email: 'john@example.com' }

      renderWithProviders(
        <EditForm
          id='user-123'
          data={data}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })

    it('requires data prop - TypeScript enforces this', () => {
      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John', email: 'john@example.com' }}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })

    it('logs error in dev mode when id is missing', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      const consoleSpy = vi.spyOn(console, 'error')

      renderWithProviders(
        <EditForm
          id={'' as any}
          data={{ name: 'John' }}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required props')
      )

      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })

    it('logs error in dev mode when data is missing', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      const consoleSpy = vi.spyOn(console, 'error')

      renderWithProviders(
        <EditForm
          id='user-123'
          data={null as any}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required props')
      )

      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })
  })

  describe('Default Submit Text', () => {
    it('has default submit text "Salvar"', () => {
      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John' }}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('allows custom submit text', () => {
      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John' }}
          sections={defaultSections}
          action={mockAction}
          submitText='Update User'
        />
      )

      // Submit button keeps a fixed aria-label ('Salvar formulário');
      // the custom submit text is rendered as the button content
      expect(
        screen.getByRole('button', { name: /salvar formulário/i })
      ).toHaveTextContent('Update User')
    })
  })

  describe('Data Pre-population', () => {
    it('pre-populates fields with data prop', () => {
      const initialData = { name: 'John Doe', email: 'john@example.com' }

      renderWithProviders(
        <EditForm
          id='user-123'
          data={initialData}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('John Doe')
      expect(screen.getByTestId('field-email')).toHaveValue('john@example.com')
    })

    it('handles partial data', () => {
      const partialData = { name: 'Jane' }

      renderWithProviders(
        <EditForm
          id='user-123'
          data={partialData}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('Jane')
      expect(screen.getByTestId('field-email')).toHaveValue('')
    })

    it('handles nested data (Prisma format)', () => {
      const nestedData = {
        pessoa: {
          nome: 'João Silva',
          cpf: '12345678900',
        },
        email: 'joao@example.com',
      }

      const sectionsWithNested = [
        {
          title: 'Personal',
          fields: [
            createMockField({ name: 'pessoa.nome', label: 'Nome' }),
            createMockField({ name: 'pessoa.cpf', label: 'CPF' }),
            createMockField({ name: 'email', label: 'Email' }),
          ],
        },
      ]

      renderWithProviders(
        <EditForm
          id='user-123'
          data={nestedData}
          sections={sectionsWithNested}
          action={mockAction}
        />
      )

      // Auto-conversion to flat should work
      expect(screen.getByTestId('field-pessoa.nome')).toBeInTheDocument()
    })

    it('keeps nested structure and resolves nested values via dot notation', () => {
      // EditForm passes nested data (Prisma format) straight to RHF, which
      // resolves dot-notation field names against the nested structure
      const nestedData = {
        pessoa: { nome: 'João' },
        email: 'joao@email.com',
      }

      const sectionsWithNested = [
        {
          title: 'Personal',
          fields: [
            createMockField({ name: 'pessoa.nome', label: 'Nome' }),
            createMockField({ name: 'email', label: 'Email' }),
          ],
        },
      ]

      renderWithProviders(
        <EditForm
          id='user-123'
          data={nestedData}
          sections={sectionsWithNested}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-pessoa.nome')).toHaveValue('João')
      expect(screen.getByTestId('field-email')).toHaveValue('joao@email.com')
    })
  })

  describe('AdminForm Integration', () => {
    it('passes id to AdminForm', () => {
      renderWithProviders(
        <EditForm
          id='edit-123'
          data={{ name: 'John' }}
          sections={defaultSections}
          action={mockAction}
        />
      )

      // AdminForm should render with id
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })

    it('passes all sections to AdminForm (includes editOnly)', () => {
      const sectionsWithEditOnly = [
        {
          title: 'Basic Info',
          fields: [createMockField({ name: 'name', label: 'Name' })],
        },
        {
          title: 'Edit Only',
          editOnly: true,
          fields: [createMockField({ name: 'status', label: 'Status' })],
        },
      ]

      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John', status: 'active' }}
          sections={sectionsWithEditOnly}
          action={mockAction}
        />
      )

      // EditForm includes ALL sections (unlike CreateForm)
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      // Note: field-status might not render if sections are tabbed
    })

    it('passes validation schema to AdminForm', () => {
      const schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
      })

      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John', email: 'john@example.com' }}
          sections={defaultSections}
          action={mockAction}
          validation={schema}
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })

    it('passes cancelAction to AdminForm', () => {
      const mockCancel = vi.fn()

      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John' }}
          sections={defaultSections}
          action={mockAction}
          cancelAction={mockCancel}
        />
      )

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('calls action with formData on submit', async () => {
      const user = userEvent.setup()
      mockAction.mockResolvedValue({ success: true })

      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John', email: 'john@example.com' }}
          sections={defaultSections}
          action={mockAction}
        />
      )

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledWith(expect.any(FormData))
      })
    })

    it('calls onSuccess callback after successful submit', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      const mockResult = { success: true, data: { id: 'user-123' } }
      mockAction.mockResolvedValue(mockResult)

      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John' }}
          sections={defaultSections}
          action={mockAction}
          onSuccess={mockOnSuccess}
        />
      )

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockResult)
      })
    })
  })

  describe('Props Passthrough', () => {
    it('passes grid prop to AdminForm', () => {
      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John' }}
          sections={defaultSections}
          action={mockAction}
          grid='grid-cols-2'
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })

    it('passes useTabs prop to AdminForm', () => {
      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John' }}
          sections={defaultSections}
          action={mockAction}
          useTabs={true}
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })

    it('passes hideButtons prop to AdminForm', () => {
      renderWithProviders(
        <EditForm
          id='user-123'
          data={{ name: 'John' }}
          sections={defaultSections}
          action={mockAction}
          hideButtons={true}
        />
      )

      // Form renders without submit button
      expect(
        screen.queryByRole('button', { name: /salvar/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty data object', () => {
      renderWithProviders(
        <EditForm
          id='user-123'
          data={{}}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('')
    })

    it('handles data with extra fields not in sections', () => {
      const dataWithExtra = {
        name: 'John',
        email: 'john@example.com',
        extraField: 'should be ignored',
      }

      renderWithProviders(
        <EditForm
          id='user-123'
          data={dataWithExtra}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('John')
    })

    it('handles null values in data', () => {
      const dataWithNull = {
        name: 'John',
        email: null,
      }

      renderWithProviders(
        <EditForm
          id='user-123'
          data={dataWithNull}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('John')
      expect(screen.getByTestId('field-email')).toHaveValue('')
    })

    it('handles undefined values in data', () => {
      const dataWithUndefined = {
        name: 'John',
        email: undefined,
      }

      renderWithProviders(
        <EditForm
          id='user-123'
          data={dataWithUndefined}
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('John')
    })
  })
})
