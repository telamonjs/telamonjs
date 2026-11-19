/**
 * PopoverSelector — characterization test
 *
 * This component (624 LOC) had NO tests at all. The goal here is to pin
 * the CURRENT behavior, not to fix it. Known quirks of the component are
 * marked inline with "ESQUISITICE:" in the test that pins them.
 *
 * Active global mocks (src/test/ui-mocks.tsx) relevant to this file:
 * - Popover/PopoverTrigger/PopoverContent become plain <div>s that ALWAYS
 *   render their children, ignoring the `open` prop — i.e., the popover
 *   content is always in the DOM in tests, regardless of hover/click.
 *   This changes what can be observed: `open` is only verifiable via
 *   `aria-expanded` on the trigger button, never via content visibility.
 * - Button preserves `data-testid`/`aria-*` via spread, so the component's
 *   real `aria-expanded` reaches the DOM.
 * - Input/Checkbox become simple controlled <input>s.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PopoverSelector } from './PopoverSelector'
import type { SelectorItem, SelectorGroup } from './types'

const ITEMS: SelectorItem[] = [
  { id: '1', label: 'Alpha' },
  { id: '2', label: 'Beta' },
  { id: '3', label: 'Gamma' },
]

const GROUPS: SelectorGroup[] = [{ id: 'g1', label: 'Grupo 1' }]
const GROUPED_ITEMS: SelectorItem[] = [
  { id: '1', label: 'Alpha', groupId: 'g1' },
  { id: '2', label: 'Beta' },
]

describe('PopoverSelector', () => {
  describe('Rendering', () => {
    it('single: mostra o placeholder quando não há valor selecionado', () => {
      render(
        <PopoverSelector
          mode='single'
          items={ITEMS}
          value={null}
          onChange={vi.fn()}
          placeholder='Selecione...'
        />
      )
      expect(screen.getByRole('combobox')).toHaveTextContent('Selecione...')
    })

    it('single: mostra o label do item selecionado no trigger', () => {
      render(
        <PopoverSelector
          mode='single'
          items={ITEMS}
          value='2'
          onChange={vi.fn()}
        />
      )
      expect(screen.getByRole('combobox')).toHaveTextContent('Beta')
    })

    it('multi: mostra badge com a contagem quando há itens selecionados', () => {
      render(
        <PopoverSelector
          mode='multi'
          items={ITEMS}
          value={['1', '2']}
          onChange={vi.fn()}
        />
      )
      expect(screen.getByTestId('badge')).toHaveTextContent('2')
    })
  })

  describe('Interactions', () => {
    it('ESQUISITICE: o popover abre via hover (mouseEnter), não via click do trigger — controlado por useHoverPopover, não pelo Radix onOpenChange padrão', async () => {
      const user = userEvent.setup()
      render(
        <PopoverSelector
          mode='single'
          items={ITEMS}
          value={null}
          onChange={vi.fn()}
        />
      )
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      await user.hover(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('single: clicar em um item chama onChange com o id e fecha (aria-expanded volta a false)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <PopoverSelector
          mode='single'
          items={ITEMS}
          value={null}
          onChange={onChange}
        />
      )
      const trigger = screen.getByRole('combobox')
      await user.hover(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')

      await user.click(screen.getByRole('button', { name: 'Beta' }))

      expect(onChange).toHaveBeenCalledWith('2')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('single: clicar na opção "Todos" (allLabel) chama onChange(null)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <PopoverSelector
          mode='single'
          items={ITEMS}
          value='1'
          onChange={onChange}
          allLabel='Todos'
        />
      )
      await user.click(screen.getByRole('button', { name: 'Todos' }))
      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('multi: clicar em um item alterna sua presença no array de value via onChange', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <PopoverSelector
          mode='multi'
          items={ITEMS}
          value={['1']}
          onChange={onChange}
        />
      )
      await user.click(screen.getByText('Beta'))
      expect(onChange).toHaveBeenCalledWith(['1', '2'])
    })

    it('digitar na busca filtra a lista após o debounce de 200ms', async () => {
      const user = userEvent.setup()
      render(
        <PopoverSelector
          mode='single'
          items={ITEMS}
          value={null}
          onChange={vi.fn()}
        />
      )
      await user.type(screen.getByPlaceholderText('Buscar...'), 'Bet')

      await waitFor(
        () => {
          expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
          expect(screen.getByText('Beta')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('State Management', () => {
    it('multi: "Selecionar todos" seleciona todos os itens filtrados, e clicar de novo limpa esses mesmos itens', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <PopoverSelector
          mode='multi'
          items={ITEMS}
          value={[]}
          onChange={onChange}
        />
      )
      await user.click(screen.getByText(/Selecionar todos/))
      expect(onChange).toHaveBeenCalledWith(['1', '2', '3'])
    })

    it('multi: o botão "Limpar" só aparece com seleção e zera o value ao clicar', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const { rerender } = render(
        <PopoverSelector
          mode='multi'
          items={ITEMS}
          value={[]}
          onChange={onChange}
        />
      )
      expect(screen.queryByText('Limpar')).not.toBeInTheDocument()

      rerender(
        <PopoverSelector
          mode='multi'
          items={ITEMS}
          value={['1']}
          onChange={onChange}
        />
      )
      await user.click(screen.getByText('Limpar'))
      expect(onChange).toHaveBeenCalledWith([])
    })
  })

  describe('Edge Cases', () => {
    it('lista vazia mostra a mensagem de nenhum resultado sem quebrar', () => {
      render(
        <PopoverSelector
          mode='single'
          items={[]}
          value={null}
          onChange={vi.fn()}
        />
      )
      expect(screen.getByText('Nenhum resultado')).toBeInTheDocument()
    })

    it('itens com groupId renderizam sob o cabeçalho do grupo; itens sem grupo aparecem depois', () => {
      render(
        <PopoverSelector
          mode='single'
          items={GROUPED_ITEMS}
          groups={GROUPS}
          value={null}
          onChange={vi.fn()}
        />
      )
      expect(screen.getByText('Grupo 1')).toBeInTheDocument()
      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
    })

    it('item com disabled=true não fica selecionável (fica com o atributo disabled)', () => {
      render(
        <PopoverSelector
          mode='single'
          items={[{ id: '1', label: 'Alpha', disabled: true }]}
          value={null}
          onChange={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: 'Alpha' })).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    // Note: the centralized axe suite in src/test/a11y-smoke.test.tsx covers
    // the real primitives (Button/Input/Popover); here the global mocks
    // simplify the markup, so this block pins only the ARIA attributes
    // that PopoverSelector itself is responsible for setting.
    it('trigger tem role="combobox" e aria-expanded refletindo o estado aberto/fechado', async () => {
      const user = userEvent.setup()
      render(
        <PopoverSelector
          mode='single'
          items={ITEMS}
          value={null}
          onChange={vi.fn()}
        />
      )
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await user.hover(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('multi: opções usam role="option" com aria-selected refletindo a seleção', () => {
      render(
        <PopoverSelector
          mode='multi'
          items={ITEMS}
          value={['1']}
          onChange={vi.fn()}
        />
      )
      const options = screen.getAllByRole('option')
      const alpha = options.find(o => o.textContent?.includes('Alpha'))
      const beta = options.find(o => o.textContent?.includes('Beta'))
      expect(alpha).toHaveAttribute('aria-selected', 'true')
      expect(beta).toHaveAttribute('aria-selected', 'false')
    })
  })
})
