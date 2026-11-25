import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { createTranslator } from 'next-intl'
import { ptBR } from 'date-fns/locale'
import { renderWithProviders } from '../../test/test-utils'
import { telamonjsMessages } from '../../i18n/messages'
import { MaskedDateRenderer } from './date-renderers'

vi.unmock('../../ui/popover')
vi.unmock('../../ui/calendar')

const t = createTranslator({ locale: 'pt-BR', messages: telamonjsMessages['pt-BR'], namespace: 'telamonjs' })

afterEach(() => vi.useRealTimers())

const endField = {
  name: 'end', label: 'End', value: '', onChange: vi.fn(), onBlur: vi.fn(), ref: { current: null },
  required: false, readOnly: false, focus: false, hasError: false,
  minDate: { field: 'start', offsetDays: 1 },
}

function Harness() {
  const form = useForm<Record<string, unknown>>({
    defaultValues: { start: new Date(2026, 9, 10, 12).toISOString(), end: '' },
  })
  return (
    <FormProvider {...form}>
      <button
        type='button'
        data-testid='move-start'
        onClick={() => form.setValue('start', new Date(2026, 9, 20, 12).toISOString())}
      >
        move start
      </button>
      <EndField />
    </FormProvider>
  )
}

// Separate component: a change to `start` must re-render the date field by
// itself (the harness above does not re-render on setValue).
function EndField() {
  return <>{MaskedDateRenderer.render({ t, dateFnsLocale: ptBR, field: endField, value: '' })}</>
}

const day = (n: number) =>
  screen.getAllByRole('button').find(b => b.textContent === String(n) && b.closest('[role="grid"]'))!

describe('MaskedDate minDate from another field', () => {
  it('disables the days before the other field + offsetDays, and follows it when it changes', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 15, 15, 0, 0))
    renderWithProviders(<Harness />)
    fireEvent.click(screen.getByTestId('calendar-trigger'))

    expect(day(10)).toBeDisabled()
    expect(day(11)).not.toBeDisabled()

    fireEvent.click(screen.getByTestId('move-start'))
    expect(day(20)).toBeDisabled()
    expect(day(21)).not.toBeDisabled()
  })
})
