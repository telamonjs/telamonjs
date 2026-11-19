import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/test-utils'
import { TimePicker } from './TimePicker'

describe('TimePicker', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('Rendering', () => {
    it('renders with placeholder', () => {
      render(<TimePicker value='' onChange={mockOnChange} />)

      expect(screen.getByText('Selecione o horário...')).toBeInTheDocument()
    })

    it('renders with custom placeholder', () => {
      render(
        <TimePicker
          value=''
          onChange={mockOnChange}
          placeholder='Select time...'
        />
      )

      expect(screen.getByText('Select time...')).toBeInTheDocument()
    })

    it('shows error message', () => {
      render(
        <TimePicker value='' onChange={mockOnChange} error='Invalid time' />
      )

      expect(screen.getByText('Invalid time')).toBeInTheDocument()
    })
  })
})
