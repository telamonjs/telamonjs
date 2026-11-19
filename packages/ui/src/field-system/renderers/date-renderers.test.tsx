import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createTranslator } from 'next-intl'
import { ptBR, enUS, es } from 'date-fns/locale'
import { renderWithProviders } from '../../test/test-utils'
import { telamonjsMessages } from '../../i18n/messages'
import { MaskedDateRenderer, MaskedDateTimeRenderer } from './date-renderers'
import type { TelamonjsLocale } from '../../i18n/locales'

// Mock the calendar popover pieces — irrelevant to the masked-typing behavior
// under test and Radix portals don't play well with jsdom here.
vi.mock('../../components/datetime/DateTimePicker', () => ({
  DateTimePicker: vi.fn(() => <div data-testid='datetime-picker' />),
  TimePicker: vi.fn(() => <div data-testid='time-picker' />),
}))

const translators = {
  'pt-BR': createTranslator({ locale: 'pt-BR', messages: telamonjsMessages['pt-BR'], namespace: 'telamonjs' }),
  en: createTranslator({ locale: 'en', messages: telamonjsMessages.en, namespace: 'telamonjs' }),
  es: createTranslator({ locale: 'es', messages: telamonjsMessages.es, namespace: 'telamonjs' }),
}

const dateFnsLocales = { 'pt-BR': ptBR, en: enUS, es }

// [locale, typed digits, expected display, expected ISO date (UTC noon)]
const DATE_CASES: Array<[TelamonjsLocale, string, string]> = [
  ['pt-BR', '25122025', '25/12/2025'],
  ['es', '25122025', '25/12/2025'],
  ['en', '12252025', '12/25/2025'],
]

function makeField(overrides: Record<string, unknown> = {}) {
  return {
    name: 'test-field',
    label: 'Test Field',
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: { current: null },
    placeholder: undefined,
    required: false,
    readOnly: false,
    focus: false,
    hasError: false,
    ...overrides,
  }
}

describe('date-renderers locale-aware masking', () => {
  describe('MaskedDateRenderer', () => {
    it.each(DATE_CASES)('%s: typing the locale-ordered date produces the same ISO date', async (locale, digits, expectedDisplay) => {
      const user = userEvent.setup()
      const field = makeField()
      const t = translators[locale]
      const dateFnsLocale = dateFnsLocales[locale]

      const TestComponent = () =>
        MaskedDateRenderer.render({ t, dateFnsLocale, field, value: '' })
      renderWithProviders(<TestComponent />)

      const input = screen.getByRole('textbox')
      await user.type(input, digits)

      expect(input).toHaveValue(expectedDisplay)
      expect(field.onChange).toHaveBeenCalledWith(
        expect.stringMatching(/^2025-12-25T/)
      )
    })

    it('en placeholder is MM/DD/YYYY, pt-BR/es are DD/MM/AAAA', () => {
      const cases: Array<[TelamonjsLocale, string]> = [
        ['pt-BR', 'DD/MM/AAAA'],
        ['es', 'DD/MM/AAAA'],
        ['en', 'MM/DD/YYYY'],
      ]
      for (const [locale, expected] of cases) {
        const field = makeField()
        const TestComponent = () =>
          MaskedDateRenderer.render({
            t: translators[locale],
            dateFnsLocale: dateFnsLocales[locale],
            field,
            value: '',
          })
        const { unmount } = renderWithProviders(<TestComponent />)
        expect(screen.getByPlaceholderText(expected)).toBeInTheDocument()
        unmount()
      }
    })

    it.each(DATE_CASES)('%s: an ISO value is displayed in the locale format', (locale, _digits, expectedDisplay) => {
      const field = makeField({ value: '2025-12-25T12:00:00.000Z' })
      const TestComponent = () =>
        MaskedDateRenderer.render({
          t: translators[locale],
          dateFnsLocale: dateFnsLocales[locale],
          field,
          value: field.value,
        })
      renderWithProviders(<TestComponent />)

      expect(screen.getByRole('textbox')).toHaveValue(expectedDisplay)
    })
  })

  describe('MaskedDateTimeRenderer', () => {
    it('en: typing MM/DD/YYYY HH:mm produces the same ISO instant as pt-BR typing DD/MM/AAAA HH:mm', async () => {
      const user = userEvent.setup()

      const fieldPtBR = makeField()
      const TestPtBR = () =>
        MaskedDateTimeRenderer.render({
          t: translators['pt-BR'],
          dateFnsLocale: dateFnsLocales['pt-BR'],
          field: fieldPtBR,
          value: '',
        })
      const { unmount } = renderWithProviders(<TestPtBR />)
      await user.type(screen.getByRole('textbox'), '251220251430')
      unmount()

      const fieldEn = makeField()
      const TestEn = () =>
        MaskedDateTimeRenderer.render({
          t: translators.en,
          dateFnsLocale: dateFnsLocales.en,
          field: fieldEn,
          value: '',
        })
      renderWithProviders(<TestEn />)
      await user.type(screen.getByRole('textbox'), '122520251430')

      expect(fieldPtBR.onChange).toHaveBeenCalled()
      expect(fieldEn.onChange).toHaveBeenCalled()
      const isoPtBR = fieldPtBR.onChange.mock.calls.at(-1)?.[0]
      const isoEn = fieldEn.onChange.mock.calls.at(-1)?.[0]
      expect(new Date(isoPtBR).getTime()).toBe(new Date(isoEn).getTime())
    })

    it('en placeholder is MM/DD/YYYY HH:mm, pt-BR/es are DD/MM/AAAA HH:mm', () => {
      const cases: Array<[TelamonjsLocale, string]> = [
        ['pt-BR', 'DD/MM/AAAA HH:mm'],
        ['es', 'DD/MM/AAAA HH:mm'],
        ['en', 'MM/DD/YYYY HH:mm'],
      ]
      for (const [locale, expected] of cases) {
        const field = makeField()
        const TestComponent = () =>
          MaskedDateTimeRenderer.render({
            t: translators[locale],
            dateFnsLocale: dateFnsLocales[locale],
            field,
            value: '',
          })
        const { unmount } = renderWithProviders(<TestComponent />)
        expect(screen.getByPlaceholderText(expected)).toBeInTheDocument()
        unmount()
      }
    })
  })
})
