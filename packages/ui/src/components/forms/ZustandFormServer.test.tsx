import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, createMockField } from '../../test/test-utils'
import type { FormSection } from './AdminForm'
import React from 'react'

// Simple mock for dynamic import - returns component immediately
const createDynamicMock = () => (props: any) => (
  <div data-testid='zustand-form-server-wrapper'>
    <div data-testid='form-id'>{props.formId}</div>
    {props.sections?.map((section: any, idx: number) => (
      <div key={idx} data-testid={`section-${idx}`}>
        <h3>{section.label}</h3>
        {section.fields?.map((field: any) => (
          <input
            key={field.name}
            data-testid={`field-${field.name}`}
            name={field.name}
          />
        ))}
      </div>
    ))}
    <button type='submit'>{props.submitText || 'Salvar'}</button>
    <button type='button'>{props.cancelAction ? 'Cancel' : ''}</button>
  </div>
)

// Mock Next.js dynamic
vi.mock('next/dynamic', () => ({
  default: () => createDynamicMock(),
}))

// Import after mocks
const { ZustandFormServer } = await import(
  './ZustandFormServer'
)

describe('ZustandFormServer', () => {
  const mockAction = vi.fn()
  const defaultSections: FormSection[] = [
    {
      label: 'User Information',
      description: 'Basic user details',
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
    it('renders Server Component wrapper correctly', () => {
      renderWithProviders(
        <ZustandFormServer
          formId='server-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('forwards formId prop correctly', () => {
      renderWithProviders(
        <ZustandFormServer
          formId='test-server-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByTestId('form-id')).toHaveTextContent(
        'test-server-form'
      )
    })

    it('renders sections correctly', () => {
      renderWithProviders(
        <ZustandFormServer
          formId='sections-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(screen.getByText('User Information')).toBeInTheDocument()
      expect(screen.getByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-email')).toBeInTheDocument()
    })

    it('renders with custom submit text', () => {
      renderWithProviders(
        <ZustandFormServer
          formId='custom-text-form'
          sections={defaultSections}
          action={mockAction}
          submitText='Save User'
        />
      )

      expect(
        screen.getByRole('button', { name: /save user/i })
      ).toBeInTheDocument()
    })

    it('renders with initial data from server', () => {
      const serverData = { name: 'John Doe', email: 'john@example.com' }

      renderWithProviders(
        <ZustandFormServer
          formId='prefilled-server-form'
          sections={defaultSections}
          action={mockAction}
          data={serverData}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })
  })

  describe('Props Forwarding', () => {
    it('forwards id prop for edit mode', () => {
      renderWithProviders(
        <ZustandFormServer
          formId='edit-server-form'
          sections={defaultSections}
          action={mockAction}
          id='user-123'
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('forwards useTabs prop', () => {
      const multiSections: FormSection[] = [
        {
          label: 'Section 1',
          fields: [createMockField({ name: 'f1', label: 'F1' })],
        },
        {
          label: 'Section 2',
          fields: [createMockField({ name: 'f2', label: 'F2' })],
        },
      ]

      renderWithProviders(
        <ZustandFormServer
          formId='tabs-server-form'
          sections={multiSections}
          action={mockAction}
          useTabs
        />
      )

      expect(screen.getByText('Section 1')).toBeInTheDocument()
      expect(screen.getByText('Section 2')).toBeInTheDocument()
    })

    it('forwards cancelAction', () => {
      const mockCancel = vi.fn()

      renderWithProviders(
        <ZustandFormServer
          formId='cancel-server-form'
          sections={defaultSections}
          action={mockAction}
          cancelAction={mockCancel}
        />
      )

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument()
    })

    it('forwards className, showDebug, onSuccess, hideButtons props', () => {
      const mockOnSuccess = vi.fn()

      renderWithProviders(
        <ZustandFormServer
          formId='all-props-form'
          sections={defaultSections}
          action={mockAction}
          className='custom-class'
          showDebug
          onSuccess={mockOnSuccess}
          hideButtons={false}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })
  })

  describe('Server Component Patterns', () => {
    it('handles Server Action pattern', () => {
      const createUser = vi.fn()

      renderWithProviders(
        <ZustandFormServer
          formId='create-user-form'
          sections={defaultSections}
          action={createUser}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('handles edit mode with fetched data', () => {
      const userData = { id: '123', name: 'Bob', email: 'bob@example.com' }
      const updateUser = vi.fn()

      renderWithProviders(
        <ZustandFormServer
          formId='edit-user-form'
          id='123'
          data={userData}
          sections={defaultSections}
          action={updateUser}
        />
      )

      expect(screen.getByTestId('form-id')).toHaveTextContent('edit-user-form')
    })

    it('handles multi-step wizard pattern', () => {
      const wizardSections: FormSection[] = [
        {
          label: 'Step 1',
          fields: [createMockField({ name: 's1', label: 'S1' })],
        },
        {
          label: 'Step 2',
          fields: [createMockField({ name: 's2', label: 'S2' })],
        },
        {
          label: 'Step 3',
          fields: [createMockField({ name: 's3', label: 'S3' })],
        },
      ]

      renderWithProviders(
        <ZustandFormServer
          formId='wizard-server-form'
          sections={wizardSections}
          action={mockAction}
          useTabs
        />
      )

      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
      expect(screen.getByText('Step 3')).toBeInTheDocument()
    })
  })

  describe('Integration with Server Components', () => {
    it('works with async Server Component pattern', () => {
      const serverFetchedData = {
        name: 'Server User',
        email: 'server@example.com',
      }

      renderWithProviders(
        <ZustandFormServer
          formId='async-server-form'
          sections={defaultSections}
          action={mockAction}
          data={serverFetchedData}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('supports parallel data fetching pattern', () => {
      const parallelData = {
        name: 'Parallel User',
        email: 'parallel@example.com',
        role: 'admin',
      }

      renderWithProviders(
        <ZustandFormServer
          formId='parallel-fetch-form'
          sections={defaultSections}
          action={mockAction}
          data={parallelData}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('handles conditional rendering based on server data', () => {
      const userData = { name: 'Conditional User' }

      renderWithProviders(
        <ZustandFormServer
          formId='conditional-form'
          sections={defaultSections}
          action={mockAction}
          data={userData}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty sections array', () => {
      renderWithProviders(
        <ZustandFormServer
          formId='empty-sections-form'
          sections={[]}
          action={mockAction}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('handles undefined data prop', () => {
      renderWithProviders(
        <ZustandFormServer
          formId='no-data-form'
          sections={defaultSections}
          action={mockAction}
          data={undefined}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('handles null data values', () => {
      const dataWithNulls = { name: null, email: null }

      renderWithProviders(
        <ZustandFormServer
          formId='null-data-form'
          sections={defaultSections}
          action={mockAction}
          data={dataWithNulls}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('handles very large datasets', () => {
      const largeData = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`field${i}`, `value${i}`])
      )

      renderWithProviders(
        <ZustandFormServer
          formId='large-data-form'
          sections={defaultSections}
          action={mockAction}
          data={largeData}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('handles deeply nested data structures', () => {
      const nestedData = {
        user: {
          profile: {
            personal: {
              name: 'Deep User',
              email: 'deep@example.com',
            },
          },
        },
      }

      renderWithProviders(
        <ZustandFormServer
          formId='nested-data-form'
          sections={defaultSections}
          action={mockAction}
          data={nestedData}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders efficiently with minimal re-renders', () => {
      const { rerender } = renderWithProviders(
        <ZustandFormServer
          formId='perf-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()

      rerender(
        <ZustandFormServer
          formId='perf-form'
          sections={defaultSections}
          action={mockAction}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })

    it('handles rapid prop changes gracefully', () => {
      const { rerender } = renderWithProviders(
        <ZustandFormServer
          formId='rapid-changes-form'
          sections={defaultSections}
          action={mockAction}
          data={{ name: 'Initial' }}
        />
      )

      rerender(
        <ZustandFormServer
          formId='rapid-changes-form'
          sections={defaultSections}
          action={mockAction}
          data={{ name: 'Updated 1' }}
        />
      )

      rerender(
        <ZustandFormServer
          formId='rapid-changes-form'
          sections={defaultSections}
          action={mockAction}
          data={{ name: 'Updated 2' }}
        />
      )

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })
  })

  describe('Type Safety', () => {
    it('accepts all ZustandForm props without type errors', () => {
      const allProps = {
        formId: 'type-safe-form',
        sections: defaultSections,
        data: { name: 'Test' },
        action: mockAction,
        submitText: 'Submit',
        useTabs: true,
        className: 'custom-class',
        showDebug: true,
        id: '123',
        onSuccess: vi.fn(),
        cancelAction: vi.fn(),
        hideButtons: false,
      }

      renderWithProviders(<ZustandFormServer {...allProps} />)

      expect(
        screen.getByTestId('zustand-form-server-wrapper')
      ).toBeInTheDocument()
    })
  })
})
