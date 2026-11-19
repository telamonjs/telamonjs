import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { within } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import { ptBR } from 'date-fns/locale'
import { renderWithProviders } from '../../test/test-utils'
import { telamonjsMessages } from '../../i18n/messages'
import { MaskedDateRenderer } from './date-renderers'

vi.mock('../../components/datetime/DateTimePicker', () => ({
  DateTimePicker: vi.fn(() => <div />),
  TimePicker: vi.fn(() => <div />),
}))

const t = createTranslator({ locale: 'pt-BR', messages: telamonjsMessages['pt-BR'], namespace: 'telamonjs' })

const originalTZ = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'America/Sao_Paulo'
})
afterAll(() => {
  if (originalTZ === undefined) delete process.env.TZ
  else process.env.TZ = originalTZ
})

function show(value: unknown) {
  const onChange = vi.fn()
  const field = {
    name: 'd', label: 'D', value, onChange, onBlur: vi.fn(), ref: { current: null },
    required: false, readOnly: false, focus: false, hasError: false,
  }
  const { container } = renderWithProviders(<>{MaskedDateRenderer.render({ t, dateFnsLocale: ptBR, field, value })}</>)
  return { input: within(container).getByRole('textbox'), onChange }
}

describe('MaskedDate date-only values (UTC-negative browser)', () => {
  it('runs in a UTC-negative zone', () => {
    expect(new Date('1995-11-24T00:00:00.000Z').getDate()).toBe(23)
  })

  it('midnight-UTC string shows the stored day, not the previous one', () => {
    expect(show('1995-11-24T00:00:00.000Z').input).toHaveValue('24/11/1995')
  })

  it('midnight-UTC Date instance shows the stored day', () => {
    expect(show(new Date('1995-11-24T00:00:00.000Z')).input).toHaveValue('24/11/1995')
  })

  it('a non-midnight instant keeps local semantics', () => {
    // 01:00Z is still the 23rd in Sao Paulo (UTC-3)
    expect(show('1995-11-24T01:00:00.000Z').input).toHaveValue('23/11/1995')
    expect(show('2025-12-25T15:00:00.000Z').input).toHaveValue('25/12/2025')
  })

  it('does not change the form value on mount', () => {
    expect(show('1995-11-24T00:00:00.000Z').onChange).not.toHaveBeenCalled()
  })
})
