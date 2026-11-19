/**
 * Characterization tests for DateTimePicker (the shadcn/DayPicker-based picker
 * at src/components/DateTimePicker.tsx, 958 LOC).
 *
 * NOTE on the plan: this component's public API is granularity-based
 * ('day' | 'hour' | 'minute' | 'second') + hourCycle (12 | 24) + locale, NOT
 * a `type` enum (date/time/datetime/daterange/month/week). Those variants live
 * in a different component; here we pin the ACTUAL behavior of THIS file.
 *
 * Mocks: the GLOBAL ui-mocks apply. Popover/PopoverContent render their
 * children ALWAYS-visible, so the inner Calendar (real react-day-picker) and
 * the TimePicker inputs are in the DOM without opening a popover. Input is the
 * simple mock (id/value/onKeyDown pass through). The trigger Button is the
 * simple mock and shows the formatted date (or placeholder). There is NO
 * global mock of DateTimePicker itself, so the real component is exercised.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ptBR, enUS } from 'date-fns/locale'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'

import { DateTimePicker } from './DateTimePicker'

expect.extend(axeMatchers)

declare module 'vitest' {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

beforeEach(() => {
  vi.clearAllMocks()
})

// A fixed reference date: 2024-03-15 14:30:45 (local).
const refDate = new Date(2024, 2, 15, 14, 30, 45)

describe('DateTimePicker', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================
  describe('Rendering', () => {
    it('shows the placeholder when no value is provided', () => {
      render(<DateTimePicker placeholder='Escolha uma data' />)
      expect(screen.getByText('Escolha uma data')).toBeInTheDocument()
    })

    it('shows the formatted value (24h, second granularity) in the trigger', () => {
      render(<DateTimePicker value={refDate} hourCycle={24} />)
      // Default format: dd/MM/yyyy HH:mm:ss
      expect(screen.getByText('15/03/2024 14:30:45')).toBeInTheDocument()
    })

    it('renders hour/minute/second time inputs for granularity="second"', () => {
      const { container } = render(
        <DateTimePicker value={refDate} granularity='second' />
      )
      expect(
        container.querySelector('#datetime-picker-hour-input')
      ).toBeTruthy()
      expect(container.querySelector('#minutes')).toBeTruthy()
      expect(container.querySelector('#seconds')).toBeTruthy()
    })

    it('omits the seconds input for granularity="minute"', () => {
      const { container } = render(
        <DateTimePicker value={refDate} granularity='minute' />
      )
      expect(
        container.querySelector('#datetime-picker-hour-input')
      ).toBeTruthy()
      expect(container.querySelector('#minutes')).toBeTruthy()
      expect(container.querySelector('#seconds')).toBeFalsy()
    })

    it('omits ALL time inputs for granularity="day"', () => {
      const { container } = render(
        <DateTimePicker value={refDate} granularity='day' />
      )
      expect(container.querySelector('#datetime-picker-hour-input')).toBeFalsy()
      expect(container.querySelector('#minutes')).toBeFalsy()
      expect(container.querySelector('#seconds')).toBeFalsy()
    })
  })

  // =========================================================================
  // STATE MANAGEMENT (value display + boundary times)
  // =========================================================================
  describe('State Management', () => {
    it('displays boundary time 00:00:00 correctly', () => {
      const midnight = new Date(2024, 2, 15, 0, 0, 0)
      const { container } = render(
        <DateTimePicker value={midnight} hourCycle={24} />
      )
      expect(screen.getByText('15/03/2024 00:00:00')).toBeInTheDocument()
      expect(
        (
          container.querySelector(
            '#datetime-picker-hour-input'
          ) as HTMLInputElement
        ).value
      ).toBe('00')
    })

    it('displays boundary time 23:59:59 correctly', () => {
      const endOfDay = new Date(2024, 2, 15, 23, 59, 59)
      render(<DateTimePicker value={endOfDay} hourCycle={24} />)
      expect(screen.getByText('15/03/2024 23:59:59')).toBeInTheDocument()
    })

    it('hour input reflects the value for 24h cycle', () => {
      const { container } = render(
        <DateTimePicker value={refDate} hourCycle={24} />
      )
      expect(
        (
          container.querySelector(
            '#datetime-picker-hour-input'
          ) as HTMLInputElement
        ).value
      ).toBe('14')
    })

    it('12h cycle renders a 12-hour value and an AM/PM period selector', () => {
      const { container } = render(
        <DateTimePicker value={refDate} hourCycle={12} />
      )
      // 14h -> 02 in 12-hour display.
      expect(
        (
          container.querySelector(
            '#datetime-picker-hour-input'
          ) as HTMLInputElement
        ).value
      ).toBe('02')
      // Period selector renders AM/PM options (Select mock exposes item text).
      expect(screen.getByText('AM')).toBeInTheDocument()
      expect(screen.getByText('PM')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // INTERACTIONS (keyboard increment / numeric entry)
  // =========================================================================
  describe('Interactions', () => {
    it('ArrowUp on the hour input increments the hour via onChange', () => {
      const onChange = vi.fn()
      const { container } = render(
        <DateTimePicker
          value={refDate}
          granularity='second'
          onChange={onChange}
        />
      )
      const hour = container.querySelector(
        '#datetime-picker-hour-input'
      ) as HTMLInputElement
      fireEvent.keyDown(hour, { key: 'ArrowUp' })
      expect(onChange).toHaveBeenCalled()
      const updated = onChange.mock.calls[0][0] as Date
      expect(updated.getHours()).toBe(15) // 14 -> 15
    })

    it('ArrowDown on the hour input decrements the hour via onChange', () => {
      const onChange = vi.fn()
      const { container } = render(
        <DateTimePicker
          value={refDate}
          granularity='second'
          onChange={onChange}
        />
      )
      const hour = container.querySelector(
        '#datetime-picker-hour-input'
      ) as HTMLInputElement
      fireEvent.keyDown(hour, { key: 'ArrowDown' })
      const updated = onChange.mock.calls[0][0] as Date
      expect(updated.getHours()).toBe(13) // 14 -> 13
    })

    it('ArrowUp on minutes increments the minute', () => {
      const onChange = vi.fn()
      const { container } = render(
        <DateTimePicker value={refDate} onChange={onChange} />
      )
      const minutes = container.querySelector('#minutes') as HTMLInputElement
      fireEvent.keyDown(minutes, { key: 'ArrowUp' })
      const updated = onChange.mock.calls[0][0] as Date
      expect(updated.getMinutes()).toBe(31) // 30 -> 31
    })

    it('typing a digit on the hour input updates the date via onDateChange', () => {
      const onChange = vi.fn()
      const { container } = render(
        <DateTimePicker value={refDate} onChange={onChange} />
      )
      const hour = container.querySelector(
        '#datetime-picker-hour-input'
      ) as HTMLInputElement
      // First digit press sets "0X"; pressing '9' -> hours becomes 09.
      fireEvent.keyDown(hour, { key: '9' })
      expect(onChange).toHaveBeenCalled()
      const updated = onChange.mock.calls[0][0] as Date
      expect(updated.getHours()).toBe(9)
    })
  })

  // =========================================================================
  // EDGE CASES (clamping / locale)
  // =========================================================================
  describe('Edge Cases', () => {
    it('ArrowUp wraps hours from 23 back to 00 (loop)', () => {
      const onChange = vi.fn()
      const lateNight = new Date(2024, 2, 15, 23, 0, 0)
      const { container } = render(
        <DateTimePicker value={lateNight} onChange={onChange} />
      )
      const hour = container.querySelector(
        '#datetime-picker-hour-input'
      ) as HTMLInputElement
      fireEvent.keyDown(hour, { key: 'ArrowUp' })
      const updated = onChange.mock.calls[0][0] as Date
      expect(updated.getHours()).toBe(0) // 23 -> 00 (loop)
    })

    it('ArrowUp wraps minutes from 59 back to 00 (loop)', () => {
      const onChange = vi.fn()
      const lastMinute = new Date(2024, 2, 15, 10, 59, 0)
      const { container } = render(
        <DateTimePicker value={lastMinute} onChange={onChange} />
      )
      const minutes = container.querySelector('#minutes') as HTMLInputElement
      fireEvent.keyDown(minutes, { key: 'ArrowUp' })
      const updated = onChange.mock.calls[0][0] as Date
      expect(updated.getMinutes()).toBe(0) // 59 -> 00 (loop)
    })

    it('renders with pt-BR locale without crashing and shows the date', () => {
      render(<DateTimePicker value={refDate} hourCycle={24} locale={ptBR} />)
      // Format string is locale-independent for dd/MM/yyyy HH:mm:ss.
      expect(screen.getByText('15/03/2024 14:30:45')).toBeInTheDocument()
    })

    it('renders with en-US locale and 12h period marker in the trigger', () => {
      render(<DateTimePicker value={refDate} hourCycle={12} locale={enUS} />)
      // 12h format includes the AM/PM marker (b) -> "PM" for 14:30.
      expect(screen.getByText(/02:30:45\s?PM/i)).toBeInTheDocument()
    })

    it('does not call onChange when no interaction occurs', () => {
      const onChange = vi.fn()
      render(<DateTimePicker value={refDate} onChange={onChange} />)
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================
  describe('Accessibility', () => {
    it('the hour input has an associated clickable label (htmlFor)', () => {
      const { container } = render(<DateTimePicker value={refDate} />)
      const label = container.querySelector(
        'label[for="datetime-picker-hour-input"]'
      )
      expect(label).toBeTruthy()
    })

    it('the trigger is a button element', () => {
      render(<DateTimePicker value={refDate} />)
      expect(
        screen.getByText('15/03/2024 14:30:45').closest('button')
      ).toBeTruthy()
    })

    it('axe smoke (AS-IS): the time inputs currently have a known "label" gap', async () => {
      // Characterization, not a quality gate: the hour/minute/second inputs
      // render without an associated <label>, which axe flags as a "label"
      // violation. We PIN this current state so a future a11y fix is a
      // deliberate, visible change (do NOT edit production source here).
      const { container } = render(<DateTimePicker value={refDate} />)
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      })
      const violationIds = (results.violations ?? []).map(v => v.id)
      expect(violationIds).toContain('label')
    })
  })
})
