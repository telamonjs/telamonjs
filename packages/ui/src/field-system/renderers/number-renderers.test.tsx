import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { ptBR as dateFnsLocale } from 'date-fns/locale'
import { t } from '../../test/i18n'
import { withAppMessages } from '../../test/intl'
import {
  NumberRenderer,
  FloatRenderer,
  CurrencyRenderer,
  parseLocaleNumber,
} from './number-renderers'
import type { FieldRenderer } from './types'

/** Stateful harness: behaves like RHF's Controller (value flows back into the field). */
function Harness({
  renderer,
  initial,
  onValue,
}: {
  renderer: FieldRenderer
  initial?: unknown
  onValue: (v: unknown) => void
}) {
  const [value, setValue] = React.useState<unknown>(initial)
  const field = {
    name: 'valor',
    label: 'Valor',
    value,
    placeholder: 'valor',
    onChange: (v: unknown) => {
      setValue(v)
      onValue(v)
    },
    onBlur: vi.fn(),
  }
  return renderer.render({ t, dateFnsLocale, field, value })
}

const last = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0]

describe('number renderers', () => {
  describe('parseLocaleNumber', () => {
    it('accepts comma and dot decimal separators', () => {
      expect(parseLocaleNumber('7,5')).toBe(7.5)
      expect(parseLocaleNumber('12.50')).toBe(12.5)
      expect(parseLocaleNumber('0.8')).toBe(0.8)
      expect(parseLocaleNumber('12,')).toBe(12)
    })
    it('returns undefined for empty/partial-without-digits', () => {
      expect(parseLocaleNumber('')).toBeUndefined()
      expect(parseLocaleNumber('-')).toBeUndefined()
      expect(parseLocaleNumber(',')).toBeUndefined()
    })
  })

  describe('NumberRenderer', () => {
    it.each([
      ['42', 42],
      ['-3', -3],
      ['007', 7],
    ])('typing %s emits the integer %s', async (typed, expected) => {
      const onValue = vi.fn()
      render(<Harness renderer={NumberRenderer} onValue={onValue} />)
      const input = screen.getByPlaceholderText('valor')
      await userEvent.type(input, typed)
      expect(input).toHaveValue(typed)
      expect(last(onValue)).toBe(expected)
    })

    it('is an integer field: separators and letters are ignored (legacy parseInt contract)', async () => {
      const onValue = vi.fn()
      render(<Harness renderer={NumberRenderer} onValue={onValue} />)
      const input = screen.getByPlaceholderText('valor')
      await userEvent.type(input, '1a2.5')
      expect(input).toHaveValue('125')
      expect(last(onValue)).toBe(125)
    })

    it('emits null when cleared (not NaN, not undefined)', async () => {
      const onValue = vi.fn()
      render(
        <Harness renderer={NumberRenderer} initial={5} onValue={onValue} />
      )
      const input = screen.getByPlaceholderText('valor')
      await userEvent.clear(input)
      expect(last(onValue)).toBeNull()
    })

    it('clearing an edit form with real react-hook-form keeps it cleared (no fallback to the default value)', async () => {
      function RhfHarness() {
        const { control } = useForm<{ valor: number | null }>({
          defaultValues: { valor: 5 },
        })
        const valor = useWatch({ control, name: 'valor' })
        return (
          <>
            <output data-testid='form-value'>{JSON.stringify(valor)}</output>
            <Controller
              control={control}
              name='valor'
              render={({ field }) =>
                NumberRenderer.render({
                  t,
                  dateFnsLocale,
                  field: { ...field, placeholder: 'valor' },
                  value: field.value,
                })
              }
            />
          </>
        )
      }
      render(<RhfHarness />)
      const input = screen.getByPlaceholderText('valor')
      expect(input).toHaveValue('5')
      await userEvent.clear(input)
      fireEvent.blur(input)
      expect(input).toHaveValue('')
      expect(screen.getByTestId('form-value')).toHaveTextContent('null')
    })

    it('shows the locale decimal separator when not editing', () => {
      render(
        <Harness renderer={NumberRenderer} initial={0.033} onValue={vi.fn()} />
      )
      expect(screen.getByPlaceholderText('valor')).toHaveValue('0,033')
    })
  })

  describe('FloatRenderer', () => {
    it('typing 12.50 emits the dot-decimal string 12.5', async () => {
      const onValue = vi.fn()
      render(<Harness renderer={FloatRenderer} onValue={onValue} />)
      const input = screen.getByPlaceholderText('valor')
      await userEvent.type(input, '12,50')
      expect(input).toHaveValue('12,50')
      expect(last(onValue)).toBe('12.5')
    })

    it('formats the stored value with the locale on blur', async () => {
      render(
        <Harness renderer={FloatRenderer} initial='12.34' onValue={vi.fn()} />
      )
      const input = screen.getByPlaceholderText('valor')
      expect(input).toHaveValue('12,34')
      fireEvent.focus(input)
      fireEvent.blur(input)
      expect(input).toHaveValue('12,34')
    })

    it('uses the dot in en', () => {
      render(
        <Harness renderer={FloatRenderer} initial='12.34' onValue={vi.fn()} />,
        { wrapper: withAppMessages({}) }
      )
      expect(screen.getByPlaceholderText('valor')).toHaveValue('12.34')
    })
  })

  describe('CurrencyRenderer', () => {
    it('displays with the locale separator', () => {
      render(
        <Harness
          renderer={CurrencyRenderer}
          initial='1234.5'
          onValue={vi.fn()}
        />
      )
      expect(screen.getByRole('textbox')).toHaveValue('1.234,50')
    })
    it('cents mask: typing 1250 emits 12.50', async () => {
      const onValue = vi.fn()
      render(<Harness renderer={CurrencyRenderer} onValue={onValue} />)
      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      await userEvent.type(input, '1250')
      expect(last(onValue)).toBe('12.50')
    })
  })
})
