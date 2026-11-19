import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/test-utils'
import { Textarea } from './textarea'

describe('Textarea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders textarea correctly', () => {
    renderWithProviders(
      <Textarea
        placeholder='Enter text'
        value='Sample text'
        onChange={() => {}}
      />
    )

    const textarea = screen.getByDisplayValue('Sample text')
    expect(textarea).toHaveAttribute('placeholder', 'Enter text')
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('handles text changes', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<Textarea onChange={handleChange} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'new text')

    expect(handleChange).toHaveBeenCalled()
  })
})
