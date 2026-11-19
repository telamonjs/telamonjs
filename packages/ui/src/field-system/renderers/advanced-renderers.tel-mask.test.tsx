/**
 * Characterization test for lacuna 13 (see docs/plans catalog): `maskType:
 * 'tel'` picked the 10 vs 11-digit mask off `field.value.length` — the
 * length of the ALREADY FORMATTED string ("(84) 9999-8888"), not the raw
 * digit count. Formatted length crosses 10 chars well before all digits are
 * typed, so the mask flips mid-keystroke and swallows trailing digits.
 *
 * Real `@react-input/mask` is used here on purpose (unlike
 * field-renderers.test.tsx, which mocks it and would hide this bug) so the
 * masking behaves exactly like the browser.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MaskedRenderer } from './advanced-renderers'
import { t } from '../../test/i18n'
import { ptBR as dateFnsLocale } from 'date-fns/locale'

function TelField() {
  const [value, setValue] = useState('')
  return MaskedRenderer.render({
    field: {
      name: 'telefone',
      maskType: 'tel',
      value,
      onChange: (v: string) => setValue(v),
      onBlur: () => {},
      ref: null,
    },
    value,
    t,
    dateFnsLocale,
  })
}

describe('MaskedRenderer tel maskType (lacuna 13)', () => {
  // @react-input/core starts a self-rescheduling window.setTimeout poll on
  // focus (to track selection) and only clears it on blur. RTL's global
  // afterEach unmounts without blurring first, so a still-focused input
  // leaks that timeout past the jsdom teardown ("window is not defined").
  // Blurring here is the real fix, not a test-only workaround: it's the
  // same cleanup a user tabbing away from the field triggers naturally.
  afterEach(async () => {
    await userEvent.click(document.body)
  })

  it('keeps every digit when typing an 11-digit mobile number sequentially', async () => {
    const user = userEvent.setup()
    render(<TelField />)

    const input = screen.getByRole('textbox')
    await user.type(input, '84999998888')

    expect(input).toHaveValue('(84) 99999-8888')
  })

  it('keeps every digit when typing a 10-digit landline number sequentially', async () => {
    const user = userEvent.setup()
    render(<TelField />)

    const input = screen.getByRole('textbox')
    await user.type(input, '8433334444')

    expect(input).toHaveValue('(84) 3333-4444')
  })

  it('deleting a digit off an 11-digit number back to 10 keeps the remaining digits correct', async () => {
    const user = userEvent.setup()
    render(<TelField />)

    const input = screen.getByRole('textbox')
    await user.type(input, '84999998888')
    await user.type(input, '{Backspace}')

    expect(input).toHaveValue('(84) 9999-9888')
  })
})
