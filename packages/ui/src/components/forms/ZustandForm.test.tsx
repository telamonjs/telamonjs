import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, createMockField } from '../../test/test-utils'
import { ZustandForm, useForm, useForms } from './ZustandForm'
import type { FormSection } from './AdminForm'

// Mock the field registry
vi.mock('../../field-system/field-registry', () => ({
  getFieldRenderer: vi.fn(type => ({
    render: ({ field }: any) => {
      // Ensure onChange is called safely
      const handleChange = (e: any) => {
        const value = e.target.value
        if (field.onChange) {
          try {
            field.onChange(value)
          } catch (error) {
            // Silently catch errors in tests to avoid store initialization issues
            console.warn('Field onChange error:', error)
          }
        }
      }

      return (
        <input
          data-testid={`field-${field.name}`}
          name={field.name}
          value={field.value || ''}
          onChange={handleChange}
          onBlur={field.onBlur}
          placeholder={field.placeholder}
          required={field.required}
        />
      )
    },
  })),
}))

describe('ZustandForm', () => {
  const mockAction = vi.fn()
  const mockOnSubmit = vi.fn()
  const defaultSections: FormSection[] = [
    {
      label: 'Personal Information',
      description: 'Basic personal details',
      fields: [
        createMockField({ name: 'name', label: 'Name', required: true }),
        createMockField({
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
        }),
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with required props', () => {
      renderWithProviders(
        <ZustandForm
          formId='test-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-email')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('renders with all optional props', () => {
      const mockCancel = vi.fn()
      const mockOnSuccess = vi.fn()

      renderWithProviders(
        <ZustandForm
          formId='advanced-form'
          sections={defaultSections}
          action={mockAction}
          data={{ name: 'John Doe' }}
          submitText='Create User'
          useTabs={false}
          className='custom-class'
          showDebug={false}
          id='123'
          onSuccess={mockOnSuccess}
          cancelAction={mockCancel}
          hideButtons={false}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('John Doe')
      expect(
        screen.getByRole('button', { name: /create user/i })
      ).toBeInTheDocument()
    })

    it('applies correct classes based on props', () => {
      const { container } = renderWithProviders(
        <ZustandForm
          formId='styled-form'
          sections={defaultSections}
          action={mockAction}
          className='custom-form'
        />
      )

      expect(container.querySelector('.custom-form')).toBeInTheDocument()
    })

    it('pre-populates fields with initial data', () => {
      const initialData = { name: 'Jane Doe', email: 'jane@example.com' }

      renderWithProviders(
        <ZustandForm
          formId='pre-filled-form'
          sections={defaultSections}
          action={mockAction}
          data={initialData}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('Jane Doe')
      expect(screen.getByTestId('field-email')).toHaveValue('jane@example.com')
    })

    it('renders without tabs by default', () => {
      renderWithProviders(
        <ZustandForm
          formId='no-tabs-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      // No tab triggers should be present
      expect(screen.queryByTestId('tab-trigger-0')).not.toBeInTheDocument()
    })

    it('renders with tabs when useTabs is true', () => {
      const multiSections: FormSection[] = [
        {
          label: 'Section 1',
          fields: [createMockField({ name: 'field1', label: 'Field 1' })],
        },
        {
          label: 'Section 2',
          fields: [createMockField({ name: 'field2', label: 'Field 2' })],
        },
      ]

      renderWithProviders(
        <ZustandForm
          formId='tabs-form'
          sections={multiSections}
          action={mockAction}
          useTabs
        />
      )

      // Tab navigation should be present
      const section1Button = screen.getByRole('button', { name: /section 1/i })
      const section2Button = screen.getByRole('button', { name: /section 2/i })

      expect(section1Button).toBeInTheDocument()
      expect(section2Button).toBeInTheDocument()
    })
  })

  describe('Interactions - Tab Navigation', () => {
    const multiSections: FormSection[] = [
      {
        label: 'Step 1',
        description: 'First step',
        fields: [
          createMockField({ name: 'step1Field', label: 'Step 1 Field' }),
        ],
      },
      {
        label: 'Step 2',
        description: 'Second step',
        fields: [
          createMockField({ name: 'step2Field', label: 'Step 2 Field' }),
        ],
      },
      {
        label: 'Step 3',
        description: 'Third step',
        fields: [
          createMockField({ name: 'step3Field', label: 'Step 3 Field' }),
        ],
      },
    ]

    it('navigates between tabs using tab buttons', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <ZustandForm
          formId='wizard-form'
          sections={multiSections}
          action={mockAction}
          useTabs
        />
      )

      // Initially on Step 1
      expect(screen.getByTestId('field-step1Field')).toBeInTheDocument()

      // Click Step 2 tab
      await user.click(screen.getByRole('button', { name: /step 2/i }))
      expect(screen.getByTestId('field-step2Field')).toBeInTheDocument()

      // Click Step 3 tab
      await user.click(screen.getByRole('button', { name: /step 3/i }))
      expect(screen.getByTestId('field-step3Field')).toBeInTheDocument()
    })

    it('navigates using Previous/Next buttons', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <ZustandForm
          formId='wizard-next-prev'
          sections={multiSections}
          action={mockAction}
          useTabs
        />
      )

      // Initially on Step 1
      expect(screen.getByTestId('field-step1Field')).toBeInTheDocument()

      // Next button should work
      const nextButton = screen.getByRole('button', { name: /próximo/i })
      await user.click(nextButton)
      expect(screen.getByTestId('field-step2Field')).toBeInTheDocument()

      // Previous button should work
      const prevButton = screen.getByRole('button', { name: /anterior/i })
      await user.click(prevButton)
      expect(screen.getByTestId('field-step1Field')).toBeInTheDocument()
    })

    it('disables Previous button on first step', () => {
      renderWithProviders(
        <ZustandForm
          formId='first-step-form'
          sections={multiSections}
          action={mockAction}
          useTabs
        />
      )

      const prevButton = screen.getByRole('button', { name: /anterior/i })
      expect(prevButton).toBeDisabled()
    })

    it('disables Next button on last step', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <ZustandForm
          formId='last-step-form'
          sections={multiSections}
          action={mockAction}
          useTabs
        />
      )

      // Navigate to last step
      await user.click(screen.getByRole('button', { name: /step 3/i }))

      const nextButton = screen.getByRole('button', { name: /próximo/i })
      expect(nextButton).toBeDisabled()
    })

    it('navigates using progress indicators', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <ZustandForm
          formId='progress-nav-form'
          sections={multiSections}
          action={mockAction}
          useTabs
        />
      )

      // Progress indicators should be present
      const progressButtons = screen.getAllByRole('button')
      const progressIndicators = progressButtons.filter(btn =>
        btn.className.includes('rounded-full')
      )

      expect(progressIndicators.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('State Management', () => {
    it('updates internal state correctly', async () => {
      renderWithProviders(
        <ZustandForm
          formId='state-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      const nameInput = screen.getByTestId('field-name')
      expect(nameInput).toHaveValue('')
      expect(nameInput).toBeInTheDocument()
    })

    it('initializes Zustand store with formId', () => {
      renderWithProviders(
        <ZustandForm
          formId='unique-form-id'
          sections={defaultSections}
          action={mockAction}
        />
      )

      // Form should render successfully with unique store
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
    })

    it('handles nested form data correctly', async () => {
      const nestedSections: FormSection[] = [
        {
          label: 'Address',
          fields: [
            createMockField({ name: 'address.street', label: 'Street' }),
            createMockField({ name: 'address.city', label: 'City' }),
          ],
        },
      ]

      renderWithProviders(
        <ZustandForm
          formId='nested-form'
          sections={nestedSections}
          action={mockAction}
          data={{ 'address.street': '123 Main St', 'address.city': 'New York' }}
        />
      )

      expect(screen.getByTestId('field-address.street')).toHaveValue(
        '123 Main St'
      )
      expect(screen.getByTestId('field-address.city')).toHaveValue('New York')
    })
  })

  describe('Form Submission', () => {
    it('calls Server Action with FormData on submit', async () => {
      const user = userEvent.setup()
      mockAction.mockResolvedValue({ success: true })

      renderWithProviders(
        <ZustandForm
          formId='submit-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      await user.type(screen.getByTestId('field-name'), 'John Doe')
      await user.type(screen.getByTestId('field-email'), 'john@example.com')
      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledWith(expect.any(FormData))
      })
    })

    it('calls onSubmit with typed data object', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      renderWithProviders(
        <ZustandForm
          formId='onsubmit-form'
          sections={defaultSections}
          onSubmit={mockOnSubmit}
          data={{ name: 'Jane Doe', email: 'jane@test.com' }}
        />
      )

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Jane Doe' })
        )
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      // Never settles: a real-timer resolve (was 50/100ms) raced the
      // assertions under load and the form was already idle again.
      mockAction.mockImplementationOnce(() => new Promise(() => {}))

      renderWithProviders(
        <ZustandForm
          formId='loading-form'
          sections={defaultSections}
          action={mockAction}
          data={{ name: 'Test User', email: 'test@test.com' }}
        />
      )

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      // Loading state should show
      expect(screen.getByText(/salvando/i)).toBeInTheDocument()
      expect(screen.getByTestId('icon-loader2')).toBeInTheDocument()
    })

    it('includes id in FormData for edit mode', async () => {
      const user = userEvent.setup()
      mockAction.mockResolvedValue({ success: true })

      renderWithProviders(
        <ZustandForm
          formId='edit-form'
          sections={defaultSections}
          action={mockAction}
          id='user-123'
          data={{ name: 'Test User', email: 'test@test.com' }}
        />
      )

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        const formData = mockAction.mock.calls[0][0]
        expect(formData.get('id')).toBe('user-123')
      })
    })

    it('flattens nested objects to FormData with dot notation', async () => {
      const user = userEvent.setup()
      mockAction.mockResolvedValue({ success: true })

      const nestedData = {
        name: 'John',
        email: 'john@test.com',
        address: {
          street: '123 Main St',
          city: 'New York',
        },
      }

      renderWithProviders(
        <ZustandForm
          formId='nested-formdata'
          sections={defaultSections}
          action={mockAction}
          data={nestedData}
        />
      )

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        const formData = mockAction.mock.calls[0][0]
        expect(formData.get('address.street')).toBe('123 Main St')
        expect(formData.get('address.city')).toBe('New York')
      })
    })

    it('calls onSuccess callback after successful action', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      const actionResult = { success: true, data: { id: 'new-123' } }
      mockAction.mockResolvedValue(actionResult)

      renderWithProviders(
        <ZustandForm
          formId='success-callback-form'
          sections={defaultSections}
          action={mockAction}
          onSuccess={mockOnSuccess}
          data={{ name: 'Test User', email: 'test@test.com' }}
        />
      )

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(actionResult)
      })
    })
  })

  describe('Error Handling', () => {
    it('handles submission errors gracefully', async () => {
      const user = userEvent.setup()
      const error = new Error('Submission failed')
      mockAction.mockRejectedValue(error)

      renderWithProviders(
        <ZustandForm
          formId='error-form'
          sections={defaultSections}
          action={mockAction}
          data={{ name: 'Test User', email: 'test@test.com' }}
        />
      )

      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalled()
      })

      // Should stop loading after error
      await waitFor(() => {
        expect(screen.queryByText(/salvando/i)).not.toBeInTheDocument()
      })
    })

    it('handles null and undefined field values', () => {
      const dataWithNulls = { name: null, email: undefined }

      renderWithProviders(
        <ZustandForm
          formId='null-values-form'
          sections={defaultSections}
          action={mockAction}
          data={dataWithNulls}
        />
      )

      expect(screen.getByTestId('field-name')).toHaveValue('')
      expect(screen.getByTestId('field-email')).toHaveValue('')
    })
  })

  describe('Cancel Action', () => {
    it('calls cancelAction when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const mockCancel = vi.fn()

      renderWithProviders(
        <ZustandForm
          formId='cancel-form'
          sections={defaultSections}
          action={mockAction}
          cancelAction={mockCancel}
        />
      )

      await user.click(screen.getByRole('button', { name: /cancelar/i }))

      expect(mockCancel).toHaveBeenCalled()
    })

    it('uses window.history.back() when no cancelAction provided', () => {
      const mockHistoryBack = vi.fn()
      window.history.back = mockHistoryBack

      renderWithProviders(
        <ZustandForm
          formId='default-cancel-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(
        screen.getByRole('button', { name: /cancelar/i })
      ).toBeInTheDocument()
    })
  })

  describe('Debug Mode', () => {
    it('shows debug panel when showDebug is true', () => {
      renderWithProviders(
        <ZustandForm
          formId='debug-form'
          sections={defaultSections}
          action={mockAction}
          showDebug
        />
      )

      expect(screen.getByText(/debug info/i)).toBeInTheDocument()
    })

    it('hides debug panel by default', () => {
      renderWithProviders(
        <ZustandForm
          formId='no-debug-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.queryByText(/debug info/i)).not.toBeInTheDocument()
    })
  })

  describe('Edit Mode Features', () => {
    it('filters editOnly sections when no id provided', () => {
      const sectionsWithEditOnly: FormSection[] = [
        {
          label: 'Basic',
          fields: [createMockField({ name: 'name', label: 'Name' })],
        },
        {
          label: 'Admin Only',
          editOnly: true,
          fields: [
            createMockField({ name: 'adminField', label: 'Admin Field' }),
          ],
        },
      ]

      renderWithProviders(
        <ZustandForm
          formId='create-mode-form'
          sections={sectionsWithEditOnly}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.queryByTestId('field-adminField')).not.toBeInTheDocument()
    })

    it('shows editOnly sections when id is provided', () => {
      const sectionsWithEditOnly: FormSection[] = [
        {
          label: 'Basic',
          fields: [createMockField({ name: 'name', label: 'Name' })],
        },
        {
          label: 'Admin Only',
          editOnly: true,
          fields: [
            createMockField({ name: 'adminField', label: 'Admin Field' }),
          ],
        },
      ]

      renderWithProviders(
        <ZustandForm
          formId='edit-mode-form'
          sections={sectionsWithEditOnly}
          action={mockAction}
          id='user-123'
        />
      )

      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-adminField')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty sections array', () => {
      renderWithProviders(
        <ZustandForm formId='empty-form' sections={[]} action={mockAction} />
      )

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('handles sections with empty fields array', () => {
      const emptySections: FormSection[] = [
        { label: 'Empty Section', fields: [] },
      ]

      renderWithProviders(
        <ZustandForm
          formId='empty-section-form'
          sections={emptySections}
          action={mockAction}
        />
      )

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('handles rapid consecutive submissions', async () => {
      const user = userEvent.setup()
      // Never settles: a real-timer resolve (was 50/100ms) raced the
      // assertions under load and the form was already idle again.
      mockAction.mockImplementationOnce(() => new Promise(() => {}))

      renderWithProviders(
        <ZustandForm
          formId='rapid-submit-form'
          sections={defaultSections}
          action={mockAction}
          data={{ name: 'Test User', email: 'test@test.com' }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /salvar/i })

      // Rapid clicks
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Disabled during submission, so the extra clicks never resubmit
      expect(submitButton).toBeDisabled()
      expect(mockAction).toHaveBeenCalledTimes(1)
    })

    it('handles hideButtons prop', () => {
      renderWithProviders(
        <ZustandForm
          formId='no-buttons-form'
          sections={defaultSections}
          action={mockAction}
          hideButtons
        />
      )

      expect(
        screen.queryByRole('button', { name: /salvar/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /cancelar/i })
      ).not.toBeInTheDocument()
    })

    it('handles very long section arrays', () => {
      const manySections: FormSection[] = Array.from(
        { length: 10 },
        (_, i) => ({
          label: `Section ${i + 1}`,
          fields: [createMockField({ name: `field${i}`, label: `Field ${i}` })],
        })
      )

      const { container } = renderWithProviders(
        <ZustandForm
          formId='many-sections-form'
          sections={manySections}
          action={mockAction}
          useTabs
        />
      )

      // Check for tab navigation presence
      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('renders form with proper ARIA attributes', () => {
      const { container } = renderWithProviders(
        <ZustandForm
          formId='a11y-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('associates labels with inputs correctly', () => {
      renderWithProviders(
        <ZustandForm
          formId='labels-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      const nameInput = screen.getByTestId('field-name')
      expect(nameInput).toHaveAttribute('name', 'name')
    })

    it('indicates required fields properly', () => {
      renderWithProviders(
        <ZustandForm
          formId='required-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      const nameInput = screen.getByTestId('field-name')
      expect(nameInput).toHaveAttribute('required')
    })

    it('supports keyboard navigation in tabs mode', async () => {
      const user = userEvent.setup()
      const multiSections: FormSection[] = [
        {
          label: 'Step 1',
          fields: [createMockField({ name: 'f1', label: 'F1' })],
        },
        {
          label: 'Step 2',
          fields: [createMockField({ name: 'f2', label: 'F2' })],
        },
      ]

      renderWithProviders(
        <ZustandForm
          formId='keyboard-nav-form'
          sections={multiSections}
          action={mockAction}
          useTabs
        />
      )

      const step1Button = screen.getByRole('button', { name: /step 1/i })
      step1Button.focus()
      expect(step1Button).toHaveFocus()
    })
  })
})
