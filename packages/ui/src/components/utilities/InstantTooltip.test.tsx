import { describe, it, expect, afterEach } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'

import { InstantTooltip } from './InstantTooltip'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

// jsdom has no PointerEvent constructor and no innerText.
function pointer(type: string, target: Element, pointerType = 'mouse') {
  const event = new MouseEvent(type, { bubbles: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  act(() => {
    target.dispatchEvent(event)
  })
}

function button(attrs: Record<string, string>, text = '') {
  render(
    <>
      <InstantTooltip />
      <button data-testid='target' {...attrs}>
        {text}
      </button>
    </>
  )
  const el = screen.getByTestId('target')
  Object.defineProperty(el, 'innerText', { value: text })
  return el
}

const hint = () => screen.queryByRole('tooltip')

describe('InstantTooltip', () => {
  afterEach(cleanup)

  it('shows the aria-label immediately on hover', () => {
    pointer('pointerover', button({ 'aria-label': 'Editar' }))
    expect(hint()).toHaveTextContent('Editar')
  })

  it('takes the title off while hovering and restores it afterwards', () => {
    const el = button({ title: 'Excluir' })
    pointer('pointerover', el)
    expect(hint()).toHaveTextContent('Excluir')
    expect(el).not.toHaveAttribute('title')

    pointer('pointerout', el)
    expect(hint()).toBeNull()
    expect(el).toHaveAttribute('title', 'Excluir')
  })

  it('gives no hint to a button with visible text', () => {
    pointer('pointerover', button({ 'aria-label': 'Salvar' }, 'Salvar'))
    expect(hint()).toBeNull()
  })

  it('data-tooltip-text wins over visible text', () => {
    pointer(
      'pointerover',
      button({ 'data-tooltip-text': 'Envia o boleto' }, 'Enviar')
    )
    expect(hint()).toHaveTextContent('Envia o boleto')
  })

  it('data-tooltip-text that only repeats the label gives no hint', () => {
    pointer('pointerover', button({ 'data-tooltip-text': 'Enviar' }, 'Enviar'))
    expect(hint()).toBeNull()
  })

  it('respects data-tooltip="off"', () => {
    pointer(
      'pointerover',
      button({ 'aria-label': 'Editar', 'data-tooltip': 'off' })
    )
    expect(hint()).toBeNull()
  })

  it('ignores touch', () => {
    pointer('pointerover', button({ 'aria-label': 'Editar' }), 'touch')
    expect(hint()).toBeNull()
  })

  it('stays out of an element that has its own Radix tooltip', () => {
    render(
      <>
        <InstantTooltip />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button data-testid='trigger' aria-label='Ajuda' />
            </TooltipTrigger>
            <TooltipContent>Ajuda</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </>
    )
    const el = screen.getByTestId('trigger')
    expect(el).toHaveAttribute('data-tooltip', 'off')
    pointer('pointerover', el)
    expect(hint()).toBeNull()
  })

  it('also stays out when the button has both a tooltip and a dropdown', () => {
    render(
      <>
        <InstantTooltip />
        <TooltipProvider>
          <DropdownMenu.Root>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu.Trigger asChild>
                  <button data-testid='both' aria-label='Tema' />
                </DropdownMenu.Trigger>
              </TooltipTrigger>
              <TooltipContent>Tema</TooltipContent>
            </Tooltip>
          </DropdownMenu.Root>
        </TooltipProvider>
      </>
    )
    const el = screen.getByTestId('both')
    expect(el).toHaveAttribute('aria-haspopup', 'menu')
    expect(el).toHaveAttribute('data-tooltip', 'off')
    pointer('pointerover', el)
    expect(hint()).toBeNull()
  })
})
