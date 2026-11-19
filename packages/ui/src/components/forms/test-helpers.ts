import { screen } from '@testing-library/react'
import { expect, type Mock } from 'vitest'

/**
 * Test Helpers for AdminForm Tests
 *
 * These helpers work around the fact that AdminForm doesn't set `id` attribute
 * on inputs to match the `for` attribute on labels, so we need to use different
 * query strategies.
 */

/**
 * Get input by label text using placeholder fallback
 *
 * AdminForm sets placeholder as "Digite {label.toLowerCase()}", so we can use that
 * to find inputs when getByLabelText fails.
 */
export function getInputByLabel(labelText: string): HTMLInputElement {
  try {
    // Try getByLabelText first (works if label has correct htmlFor)
    return screen.getByLabelText(labelText) as HTMLInputElement
  } catch {
    // Fallback: find by placeholder
    const placeholder = `Digite ${labelText.toLowerCase()}`
    return screen.getByPlaceholderText(placeholder) as HTMLInputElement
  }
}

/**
 * Get input by field name attribute
 *
 * Most reliable way to get input in AdminForm tests
 */
export function getInputByName(name: string): HTMLInputElement {
  const input = document.querySelector(`input[name="${name}"]`)
  if (!input) {
    throw new Error(`Input with name="${name}" not found`)
  }
  return input as HTMLInputElement
}

/**
 * Get all inputs in the form
 */
export function getAllInputs(): HTMLInputElement[] {
  return screen.getAllByRole('textbox') as HTMLInputElement[]
}

/**
 * Get switch (boolean field) by name
 */
export function getSwitchByName(name: string): HTMLInputElement {
  const switches = screen.getAllByRole('switch')
  return switches.find(s => s.getAttribute('name') === name) as HTMLInputElement
}

/**
 * Get textarea by label
 */
export function getTextareaByLabel(labelText: string): HTMLTextAreaElement {
  try {
    return screen.getByLabelText(labelText) as HTMLTextAreaElement
  } catch {
    // Fallback: find by role
    return screen.getByRole('textbox', {
      name: labelText,
    }) as HTMLTextAreaElement
  }
}

/**
 * Helper to extract FormData entries as object
 */
export function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    obj[key] = value as string
  }
  return obj
}

/**
 * Helper to wait for form submission
 */
export async function waitForFormSubmission(
  mockAction: Mock,
  expectedCalls: number = 1
): Promise<FormData> {
  const { waitFor } = await import('@testing-library/react')

  await waitFor(() => {
    expect(mockAction).toHaveBeenCalledTimes(expectedCalls)
  })

  return mockAction.mock.calls[expectedCalls - 1][0] as FormData
}

/**
 * Assert FormData contains expected values
 */
export function assertFormDataContains(
  formData: FormData,
  expected: Record<string, string | null>
) {
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = formData.get(key)
    if (expectedValue === null) {
      expect(actualValue).toBeNull()
    } else {
      expect(actualValue).toBe(expectedValue)
    }
  }
}
