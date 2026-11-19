import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/test-utils'
import { Switch } from './switch'

describe('Switch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders switch correctly', () => {
    renderWithProviders(<Switch checked={false} onCheckedChange={() => {}} />)

    const switchElement = screen.getByRole('switch')
    expect(switchElement).not.toBeChecked()
  })

  it('handles state changes', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <Switch checked={false} onCheckedChange={handleChange} />
    )

    const switchElement = screen.getByRole('switch')
    await user.click(switchElement)

    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('can be disabled', () => {
    renderWithProviders(
      <Switch disabled checked={false} onCheckedChange={() => {}} />
    )

    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeDisabled()
  })
})
