import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/test-utils'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders checkbox correctly', () => {
    renderWithProviders(
      <Checkbox checked={false} onCheckedChange={() => {}} />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('handles state changes', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <Checkbox checked={false} onCheckedChange={handleChange} />
    )

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('supports indeterminate state', () => {
    renderWithProviders(
      <Checkbox checked='indeterminate' onCheckedChange={() => {}} />
    )

    const checkbox = screen.getByRole('checkbox')
    // Indeterminate state is neither checked nor unchecked
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toHaveAttribute('data-state', 'indeterminate')
  })

  it('can be disabled', () => {
    renderWithProviders(
      <Checkbox disabled checked={false} onCheckedChange={() => {}} />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })
})
