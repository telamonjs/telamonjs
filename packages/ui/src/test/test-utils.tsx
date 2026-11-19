import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { vi } from 'vitest'

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialValues?: Record<string, any>
  schema?: z.ZodSchema
}

// Form wrapper for testing form components
// eslint-disable-next-line react-refresh/only-export-components -- test infra file, not subject to HMR
function FormTestWrapper({
  children,
  initialValues = {},
  schema = z.object({}),
}: {
  children: React.ReactNode
  initialValues?: Record<string, any>
  schema?: z.ZodSchema
}) {
  const methods = useForm({
    defaultValues: initialValues,
    resolver: zodResolver(schema),
  })

  return <FormProvider {...methods}>{children}</FormProvider>
}

export function renderWithForm(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { initialValues, schema, ...renderOptions } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <FormTestWrapper initialValues={initialValues} schema={schema}>
        {children}
      </FormTestWrapper>
    ),
    ...renderOptions,
  })
}

// Standard render with basic providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, options)
}

// Mock functions for common use cases
export const mockFormData = (data: Record<string, any>) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value?.toString() || '')
  })
  return formData
}

export const mockSubmitEvent = (data: Record<string, any>) => ({
  preventDefault: vi.fn(),
  target: {
    elements: Object.entries(data).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: { value },
      }),
      {}
    ),
  },
})

// Helper to create mock field configurations
export const createMockField = (overrides: Partial<any> = {}) => ({
  name: 'test-field',
  label: 'Test Field',
  type: 'text' as const,
  required: false,
  ...overrides,
})

// Helper to create mock form data
export const createMockFormData = (fields: Record<string, any>) => {
  return Object.entries(fields).reduce((formData, [key, value]) => {
    formData.append(key, value)
    return formData
  }, new FormData())
}

// Helper to wait for async operations
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

// Mock intersection observer for components that use it
export const mockIntersectionObserver = () => {
  const mockObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }

  window.IntersectionObserver = vi.fn(() => mockObserver)
  return mockObserver
}

// Mock resize observer
export const mockResizeObserver = () => {
  const mockObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }

  window.ResizeObserver = vi.fn(() => mockObserver)
  return mockObserver
}

// Re-export everything from testing-library
// eslint-disable-next-line react-refresh/only-export-components -- test infra file, not subject to HMR
export * from '@testing-library/react'
export { renderWithForm as render }
