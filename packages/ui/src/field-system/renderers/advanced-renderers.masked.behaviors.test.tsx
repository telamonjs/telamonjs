/**
 * Characterization tests for the `masked` field (PRD 068 item 5).
 *
 * `@react-input/core` rejects every `input` event that arrives before its
 * selection-polling `setTimeout` ticked again ("The input selection has not
 * been updated") — a burst of keystrokes faster than one timer tick (Playwright
 * `type`/`pressSequentially` without delay, a barcode scanner, a fast typist on
 * a loaded machine) silently loses every key but the first. `delay: null`
 * reproduces that burst in jsdom.
 *
 * Driven through a real react-hook-form Controller, like the field system does.
 */
import { describe, it, expect, afterEach } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { MaskedRenderer } from './advanced-renderers'
import { t } from '../../test/i18n'
import { ptBR as dateFnsLocale } from 'date-fns/locale'

const CPF = '___.___.___-__'

function Harness({
  mask,
  maskType,
  initial = '',
}: {
  mask?: string
  maskType?: 'tel'
  initial?: string
}) {
  const { control } = useForm({ defaultValues: { doc: initial } })
  const emitted = useWatch({ control, name: 'doc' })
  return (
    <>
      <Controller
        name='doc'
        control={control}
        render={({ field }) =>
          MaskedRenderer.render({
            field: { ...field, mask, maskType },
            value: field.value,
            t,
            dateFnsLocale,
          }) as ReactElement
        }
      />
      <output data-testid='emitted'>{emitted}</output>
    </>
  )
}

const input = () => screen.getByRole('textbox') as HTMLInputElement
const emitted = () => screen.getByTestId('emitted').textContent

describe('MaskedRenderer (PRD 068 item 5)', () => {
  // Leave the field before unmount (a focused @react-input field keeps a
  // timer alive past the jsdom teardown).
  afterEach(async () => {
    await userEvent.click(document.body)
  })

  describe('Interactions', () => {
    it('keeps every key of a burst (no render between keystrokes)', async () => {
      const user = userEvent.setup({ delay: null })
      render(<Harness mask={CPF} />)

      await user.type(input(), '12345678901')

      expect(input()).toHaveValue('123.456.789-01')
      expect(emitted()).toBe('123.456.789-01')
    })

    it('keeps every key of a burst on maskType tel (11-digit mobile)', async () => {
      const user = userEvent.setup({ delay: null })
      render(<Harness maskType='tel' />)

      await user.type(input(), '84999998888')

      expect(input()).toHaveValue('(84) 99999-8888')
      expect(emitted()).toBe('(84) 99999-8888')
    })

    it('typing sequentially (with a render per key) still works', async () => {
      const user = userEvent.setup()
      render(<Harness maskType='tel' />)

      await user.type(input(), '8433334444')

      expect(input()).toHaveValue('(84) 3333-4444')
    })

    it('pasting raw digits formats them', async () => {
      const user = userEvent.setup()
      render(<Harness mask={CPF} />)

      await user.click(input())
      await user.paste('12345678901')

      expect(emitted()).toBe('123.456.789-01')
    })

    it('a whole-value change (fill) formats it', () => {
      render(<Harness mask={CPF} />)

      fireEvent.change(input(), { target: { value: '12345678901' } })

      expect(input()).toHaveValue('123.456.789-01')
      expect(emitted()).toBe('123.456.789-01')
    })

    it('backspace in the middle removes that digit and keeps the caret there', async () => {
      const user = userEvent.setup()
      render(<Harness mask={CPF} />)
      await user.type(input(), '12345678901')

      // caret right after the 3rd digit, then backspace + retype it
      input().setSelectionRange(3, 3)
      await user.keyboard('{Backspace}')
      expect(emitted()).toBe('124.567.890-1')

      await user.keyboard('3')
      expect(emitted()).toBe('123.456.789-01')
    })
  })

  describe('State Management', () => {
    it('emits the formatted value without the placeholder slots', async () => {
      const user = userEvent.setup()
      render(<Harness mask={CPF} />)

      await user.type(input(), '123')

      expect(emitted()).toBe('123')
      await user.type(input(), '4')
      expect(emitted()).toBe('123.4')
    })

    it('shows only the typed part, without the trailing slots (current look)', async () => {
      const user = userEvent.setup()
      render(<Harness mask={CPF} />)

      await user.type(input(), '1234')

      expect(input()).toHaveValue('123.4')
    })
  })

  describe('Edge Cases', () => {
    it('formats an unformatted initial value (raw digits from the API)', () => {
      render(<Harness mask={CPF} initial='12345678901' />)

      expect(input()).toHaveValue('123.456.789-01')
    })

    it('ignores non-digit keys', async () => {
      const user = userEvent.setup()
      render(<Harness mask={CPF} />)

      await user.type(input(), '1a2')

      expect(emitted()).toBe('12')
    })

    it('drops digits beyond the mask capacity', async () => {
      const user = userEvent.setup()
      render(<Harness mask={CPF} />)

      await user.type(input(), '123456789012345')

      expect(emitted()).toBe('123.456.789-01')
    })
  })
})
