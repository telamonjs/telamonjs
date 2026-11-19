/**
 * Characterization test for lacuna 11 (see docs/plans catalog): the
 * relationship popover (`PopoverContent`) hardcoded `bg-slate-200` instead
 * of the `bg-popover` design token. Reported symptom: transparent/broken
 * background when this popover renders inside a nested dialog
 * (SplitFormDialog over ViewDialog). `bg-popover` is the token every other
 * popover in the design system relies on (and the class the app's Tailwind
 * build is guaranteed to keep, unlike an ad-hoc `bg-slate-200`), so it's the
 * minimal fix — verified here against the REAL Popover (the global
 * ui-mocks.tsx replacement strips className and would hide this).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ControllerRenderProps } from 'react-hook-form'
import { Combobox, type IOption } from './combobox'

vi.unmock('../../ui/popover')

const loadOptions = vi.fn(async (): Promise<IOption[]> => [
  { value: '1', label: 'Opção 1' },
])

const field: ControllerRenderProps = {
  name: 'relacao',
  value: '',
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
}

describe('Combobox popover background (lacuna 11)', () => {
  it('uses the bg-popover token, not a hardcoded color', async () => {
    const user = userEvent.setup()
    render(<Combobox field={field} loadOptions={loadOptions} />)

    await user.click(screen.getByRole('combobox'))

    const content = document.querySelector('[data-radix-popper-content-wrapper] > *')
    expect(content).not.toBeNull()
    expect(content).toHaveClass('bg-popover')
    expect(content).not.toHaveClass('bg-slate-200')
  })
})

describe('Combobox closing inside a Dialog (modal popover)', () => {
  it('does not reopen when the list closes with the field still empty', async () => {
    const { ModalContext } = await import('../../ui/modal-context')
    const user = userEvent.setup()
    render(
      <ModalContext.Provider value={true}>
        <Combobox field={field} loadOptions={loadOptions} />
      </ModalContext.Provider>
    )
    const trigger = screen.getByRole('combobox')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Escape closes; Radix returns focus to the trigger (modal popover)
    await user.keyboard('{Escape}')
    await new Promise(r => setTimeout(r, 20))
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('still opens on keyboard focus when empty (Tab into the field)', async () => {
    const user = userEvent.setup()
    render(<Combobox field={field} loadOptions={loadOptions} />)
    await user.tab()
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
  })
})
