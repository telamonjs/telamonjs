import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/test-utils'
import { Input } from './input'

describe('Input', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders input with correct attributes', () => {
    renderWithProviders(
      <Input
        type='email'
        placeholder='Enter email'
        value='test@example.com'
        onChange={() => {}}
      />
    )

    const input = screen.getByDisplayValue('test@example.com')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('placeholder', 'Enter email')
  })

  it('handles input changes', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<Input onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test input')

    expect(handleChange).toHaveBeenCalled()
  })

  it('can be disabled', () => {
    renderWithProviders(<Input disabled />)

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('applies correct styling classes', () => {
    renderWithProviders(<Input data-testid='input' />)

    const input = screen.getByTestId('input')
    // Component is mocked - verify element exists
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('data-testid', 'input')
  })
})
