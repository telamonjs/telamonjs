import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import { ptBR } from 'date-fns/locale'
import { renderWithProviders } from '../../test/test-utils'
import { telamonjsMessages } from '../../i18n/messages'
import { MaskedDateRenderer } from './date-renderers'

vi.unmock('../../ui/popover')
vi.unmock('../../ui/calendar')

const t = createTranslator({ locale: 'pt-BR', messages: telamonjsMessages['pt-BR'], namespace: 'telamonjs' })

afterEach(() => vi.useRealTimers())

describe('MaskedDate maxDate (7.14)', () => {
  it("maxDate 'today': days after today are disabled in the calendar", () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 15, 15, 0, 0))
    const field = {
      name: 'd', label: 'D', value: '', onChange: vi.fn(), onBlur: vi.fn(), ref: { current: null },
      required: false, readOnly: false, focus: false, hasError: false, maxDate: 'today',
    }
    renderWithProviders(<>{MaskedDateRenderer.render({ t, dateFnsLocale: ptBR, field, value: '' })}</>)
    fireEvent.click(screen.getByTestId('calendar-trigger'))

    const day = (n: number) =>
      screen.getAllByRole('button').find(b => b.textContent === String(n) && b.closest('[role="grid"]'))!
    expect(day(15)).not.toBeDisabled()
    expect(day(16)).toBeDisabled()
  })

  it('minDate disables the days before it', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 15, 15, 0, 0))
    const field = {
      name: 'd', label: 'D', value: '', onChange: vi.fn(), onBlur: vi.fn(), ref: { current: null },
      required: false, readOnly: false, focus: false, hasError: false,
      minDate: new Date(2026, 9, 10, 12).toISOString(),
    }
    renderWithProviders(<>{MaskedDateRenderer.render({ t, dateFnsLocale: ptBR, field, value: '' })}</>)
    fireEvent.click(screen.getByTestId('calendar-trigger'))
    const day = (n: number) =>
      screen.getAllByRole('button').find(b => b.textContent === String(n) && b.closest('[role="grid"]'))!
    expect(day(9)).toBeDisabled()
    expect(day(10)).not.toBeDisabled()
  })
})
