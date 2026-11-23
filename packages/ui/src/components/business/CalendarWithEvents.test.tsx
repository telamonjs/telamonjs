import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import { startOfMonth } from 'date-fns'
import { CalendarWithEvents } from './CalendarWithEvents'

expect.extend(axeMatchers)

const jan15 = new Date(2026, 0, 15)

function navButtons() {
  // [today, prev, next] — prev/next are the icon buttons with an aria-label
  const [, prev, next] = screen.getAllByRole('button')
  return { prev, next, today: screen.getByTestId('calendar-today-button') }
}

describe('CalendarWithEvents', () => {
  describe('Rendering', () => {
    it('renders the defaultDate month with its events', () => {
      render(
        <CalendarWithEvents
          defaultDate={jan15}
          events={[{ id: '1', title: 'Kickoff', date: jan15 }]}
        />
      )
      expect(screen.getByText('Kickoff')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('onMonthChange gets the first day of the next/previous month', async () => {
      const user = userEvent.setup()
      const onMonthChange = vi.fn()
      render(
        <CalendarWithEvents
          defaultDate={jan15}
          events={[]}
          onMonthChange={onMonthChange}
        />
      )

      await user.click(navButtons().next)
      expect(onMonthChange).toHaveBeenLastCalledWith(new Date(2026, 1, 1))

      await user.click(navButtons().prev)
      await user.click(navButtons().prev)
      expect(onMonthChange).toHaveBeenLastCalledWith(new Date(2025, 11, 1))
      expect(onMonthChange).toHaveBeenCalledTimes(3)
    })

    it('"today" reports the current month only when it changes the view', async () => {
      const user = userEvent.setup()
      const onMonthChange = vi.fn()
      render(<CalendarWithEvents events={[]} onMonthChange={onMonthChange} />)

      await user.click(navButtons().today)
      expect(onMonthChange).not.toHaveBeenCalled()

      await user.click(navButtons().next)
      await user.click(navButtons().today)
      expect(onMonthChange).toHaveBeenLastCalledWith(startOfMonth(new Date()))
      expect(onMonthChange).toHaveBeenCalledTimes(2)
    })
  })

  describe('Edge Cases', () => {
    it('is not called on mount and navigation works without it', async () => {
      const user = userEvent.setup()
      const onMonthChange = vi.fn()
      const { unmount } = render(
        <CalendarWithEvents defaultDate={jan15} events={[]} onMonthChange={onMonthChange} />
      )
      expect(onMonthChange).not.toHaveBeenCalled()
      unmount()

      render(<CalendarWithEvents defaultDate={jan15} events={[]} />)
      await user.click(navButtons().next)
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations', async () => {
      const { container } = render(
        <CalendarWithEvents
          defaultDate={jan15}
          events={[{ id: '1', title: 'Kickoff', date: jan15 }]}
        />
      )
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
