import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { BaseForm } from './BaseForm'
import type { FormSection } from '../../types/forms/admin-form'
import { logger } from '../../utils/logger'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Save: () => <svg data-testid='mock-save-icon' />,
  X: () => <svg data-testid='mock-x-icon' />,
  Loader2: () => <svg data-testid='mock-loader-icon' />,
  ChevronLeft: () => <svg data-testid='mock-chevron-left-icon' />,
  ChevronRight: () => <svg data-testid='mock-chevron-right-icon' />,
  FileText: () => <svg data-testid='mock-file-text-icon' />,
}))

describe('BaseForm', () => {
  // Test data
  const validationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    age: z.number().min(18, 'Must be 18+'),
  })

  const mockSections: FormSection[] = [
    {
      label: 'Personal Info',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'age', label: 'Age', type: 'number', required: true },
      ],
    },
  ]

  const mockInitialValues = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 25,
  }

  // 1. Rendering tests
  describe('Rendering', () => {
    it('renders form with required sections', () => {
      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
        />
      )

      expect(screen.getByText('Personal Info')).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Age')).toBeInTheDocument()
    })

    it('renders with initial values', () => {
      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
        />
      )

      const nameInput = screen.getByDisplayValue('John Doe')
      const emailInput = screen.getByDisplayValue('john@example.com')
      const ageInput = screen.getByDisplayValue('25')

      expect(nameInput).toBeInTheDocument()
      expect(emailInput).toBeInTheDocument()
      expect(ageInput).toBeInTheDocument()
    })

    it('renders submit and cancel buttons by default', () => {
      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          actionsConfig={{
            standard: {
              submit: true,
              cancel: true,
            },
          }}
        />
      )

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /cancelar/i })
      ).toBeInTheDocument()
    })

    it('hides buttons when hideDefaultButtons is true', () => {
      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          hideDefaultButtons={true}
        />
      )

      expect(
        screen.queryByRole('button', { name: /salvar/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /cancelar/i })
      ).not.toBeInTheDocument()
    })

    it('renders with custom grid layout', () => {
      const { container } = render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          grid='3'
        />
      )

      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
      const gridContainer = form!.querySelector('.grid-cols-1.sm\\:grid-cols-3')
      expect(gridContainer).toBeInTheDocument()
    })

    it('renders tabs when useTabs is true', () => {
      const sectionsWithTabs: FormSection[] = [
        {
          label: 'Section 1',
          fields: [{ name: 'field1', label: 'Field 1', type: 'text' }],
        },
        {
          label: 'Section 2',
          fields: [{ name: 'field2', label: 'Field 2', type: 'text' }],
        },
      ]

      render(
        <BaseForm
          sections={sectionsWithTabs}
          validation={z.object({
            field1: z.string(),
            field2: z.string(),
          })}
          initialValues={{ field1: '', field2: '' }}
          useTabs={true}
        />
      )

      expect(
        screen.getByRole('tab', { name: /section 1/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('tab', { name: /section 2/i })
      ).toBeInTheDocument()
    })
  })

  // 2. Interaction tests
  describe('Interactions', () => {
    it('calls onSubmit when form is submitted', async () => {
      const onSubmit = vi.fn()

      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          onSubmit={onSubmit}
          actionsConfig={{
            standard: {
              submit: true,
            },
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })

    it('calls onStateChange when form values change', async () => {
      const onStateChange = vi.fn()

      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          onStateChange={onStateChange}
          onStateChangeDebounce={0}
        />
      )

      const nameInput = screen.getByLabelText('Name')
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } })

      await waitFor(
        () => {
          expect(onStateChange).toHaveBeenCalled()
        },
        { timeout: 100 }
      )
    })

    it('handles cancel button click', async () => {
      const onCancel = vi.fn()

      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          actionsConfig={{
            standard: {
              cancel: {
                onClick: onCancel,
              },
            },
          }}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(onCancel).toHaveBeenCalled()
      })
    })

    it('switches tabs when useTabs is true', async () => {
      const sectionsWithTabs: FormSection[] = [
        {
          label: 'Section 1',
          fields: [{ name: 'field1', label: 'Field 1', type: 'text' }],
        },
        {
          label: 'Section 2',
          fields: [{ name: 'field2', label: 'Field 2', type: 'text' }],
        },
      ]

      render(
        <BaseForm
          sections={sectionsWithTabs}
          validation={z.object({
            field1: z.string(),
            field2: z.string(),
          })}
          initialValues={{ field1: '', field2: '' }}
          useTabs={true}
        />
      )

      // Initially Section 1 content should be visible
      expect(screen.getByLabelText('Field 1')).toBeInTheDocument()
      expect(screen.queryByLabelText('Field 2')).not.toBeInTheDocument()

      // Click Section 2 tab
      const section2Tab = screen.getByRole('tab', { name: /section 2/i })
      fireEvent.click(section2Tab)

      await waitFor(() => {
        expect(screen.getByLabelText('Field 2')).toBeInTheDocument()
        expect(screen.queryByLabelText('Field 1')).not.toBeInTheDocument()
      })
    })

    it('navigates between tabs using navigation buttons', async () => {
      const sectionsWithTabs: FormSection[] = [
        {
          label: 'Section 1',
          fields: [{ name: 'field1', label: 'Field 1', type: 'text' }],
        },
        {
          label: 'Section 2',
          fields: [{ name: 'field2', label: 'Field 2', type: 'text' }],
        },
      ]

      render(
        <BaseForm
          sections={sectionsWithTabs}
          validation={z.object({
            field1: z.string(),
            field2: z.string(),
          })}
          initialValues={{ field1: '', field2: '' }}
          useTabs={true}
        />
      )

      // Click "Next" button
      const nextButton = screen.getByRole('button', { name: /próximo/i })
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Field 2')).toBeInTheDocument()
      })

      // Click "Previous" button
      const prevButton = screen.getByRole('button', { name: /anterior/i })
      fireEvent.click(prevButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Field 1')).toBeInTheDocument()
      })
    })
  })

  // 3. State management
  describe('State Management', () => {
    it('updates form state correctly', async () => {
      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
        />
      )

      const nameInput = screen.getByLabelText('Name')
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } })

      await waitFor(() => {
        expect((nameInput as HTMLInputElement).value).toBe('Jane Doe')
      })
    })

    it('tracks form validity state', async () => {
      const onStateChange = vi.fn()

      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          onStateChange={onStateChange}
          onStateChangeDebounce={0}
        />
      )

      const emailInput = screen.getByLabelText('Email')
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

      await waitFor(
        () => {
          const lastCall =
            onStateChange.mock.calls[onStateChange.mock.calls.length - 1]
          expect(lastCall[1].isValid).toBe(false)
        },
        { timeout: 100 }
      )
    })
  })

  // 4. Edge cases
  describe('Edge Cases', () => {
    it('handles empty sections array', () => {
      const { container } = render(
        <BaseForm
          sections={[]}
          validation={validationSchema}
          initialValues={mockInitialValues}
        />
      )

      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('handles missing initialValues', () => {
      render(<BaseForm sections={mockSections} validation={validationSchema} />)

      const nameInput = screen.getByLabelText('Name')
      expect((nameInput as HTMLInputElement).value).toBe('')
    })

    it('filters editOnly fields when no id is provided', () => {
      const sectionsWithEditOnly: FormSection[] = [
        {
          label: 'Info',
          fields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'secret', label: 'Secret', type: 'text', editOnly: true },
          ],
        },
      ]

      render(
        <BaseForm
          sections={sectionsWithEditOnly}
          validation={z.object({
            name: z.string(),
            secret: z.string(),
          })}
          initialValues={{ name: '', secret: '' }}
        />
      )

      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.queryByLabelText('Secret')).not.toBeInTheDocument()
    })

    it('shows editOnly fields when id is provided', () => {
      const sectionsWithEditOnly: FormSection[] = [
        {
          label: 'Info',
          fields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'secret', label: 'Secret', type: 'text', editOnly: true },
          ],
        },
      ]

      render(
        <BaseForm
          id='123'
          sections={sectionsWithEditOnly}
          validation={z.object({
            name: z.string(),
            secret: z.string(),
          })}
          initialValues={{ name: '', secret: '' }}
        />
      )

      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Secret')).toBeInTheDocument()
    })

    it('blocks submit and shows errors when validation fails', async () => {
      // The actionsConfig submit goes through form.handleSubmit: with invalid
      // data the Zod resolver populates formState.errors and onSubmit never runs
      const onSubmit = vi.fn()

      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={{ name: '', email: 'invalid', age: 10 }}
          onSubmit={onSubmit}
          actionsConfig={{
            standard: {
              submit: true,
            },
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      fireEvent.click(submitButton)

      // summary + the field's sr-only alert
      await waitFor(() => {
        expect(screen.getAllByText('Name is required').length).toBeGreaterThan(
          0
        )
      })
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('submits with current values when validation passes', async () => {
      const onSubmit = vi.fn()

      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          onSubmit={onSubmit}
          actionsConfig={{
            standard: {
              submit: true,
            },
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining(mockInitialValues),
          expect.any(Object)
        )
      })
    })

    it('handles unknown field types gracefully', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      const sectionsWithUnknownType: FormSection[] = [
        {
          label: 'Info',
          fields: [
            { name: 'unknown', label: 'Unknown', type: 'invalid-type' as any },
          ],
        },
      ]

      render(
        <BaseForm
          sections={sectionsWithUnknownType}
          validation={z.object({ unknown: z.string() })}
          initialValues={{ unknown: '' }}
        />
      )

      // Registry falls back to the text renderer and warns
      expect(screen.getByLabelText('Unknown')).toBeInTheDocument()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'No renderer found for field type: invalid-type'
        )
      )

      warnSpy.mockRestore()
    })
  })

  // 5. Accessibility
  describe('Accessibility', () => {
    it('has proper form structure', () => {
      const { container } = render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
        />
      )

      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
      expect(form).toHaveAttribute('novalidate')
    })

    it('labels are associated with inputs', () => {
      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
        />
      )

      const nameInput = screen.getByLabelText('Name')
      expect(nameInput).toHaveAttribute('id')
    })

    it('submit button has proper aria-label', () => {
      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          actionsConfig={{
            standard: {
              submit: true,
            },
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('displays loading state with proper aria attributes', () => {
      render(
        <BaseForm
          sections={mockSections}
          validation={validationSchema}
          initialValues={mockInitialValues}
          actionsConfig={{
            standard: {
              submit: {
                loading: true,
              },
            },
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      expect(submitButton).toBeDisabled()
    })

    it('tab navigation buttons are keyboard accessible', () => {
      const sectionsWithTabs: FormSection[] = [
        {
          label: 'Section 1',
          fields: [{ name: 'field1', label: 'Field 1', type: 'text' }],
        },
        {
          label: 'Section 2',
          fields: [{ name: 'field2', label: 'Field 2', type: 'text' }],
        },
      ]

      render(
        <BaseForm
          sections={sectionsWithTabs}
          validation={z.object({
            field1: z.string(),
            field2: z.string(),
          })}
          initialValues={{ field1: '', field2: '' }}
          useTabs={true}
        />
      )

      const nextButton = screen.getByRole('button', { name: /próximo/i })
      expect(nextButton).toHaveAttribute('type', 'button')
    })
  })

  // 6. Grid layout and span
  describe('Grid Layout', () => {
    it('applies span to fields correctly', () => {
      const sectionsWithSpan: FormSection[] = [
        {
          label: 'Info',
          grid: '2',
          fields: [
            { name: 'fullWidth', label: 'Full Width', type: 'text', span: '2' },
            { name: 'halfWidth', label: 'Half Width', type: 'text' },
          ],
        },
      ]

      const { container } = render(
        <BaseForm
          sections={sectionsWithSpan}
          validation={z.object({
            fullWidth: z.string(),
            halfWidth: z.string(),
          })}
          initialValues={{ fullWidth: '', halfWidth: '' }}
        />
      )

      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
      const spanElement = form!.querySelector('.sm\\:col-span-2')
      expect(spanElement).toBeInTheDocument()
    })
  })
})
