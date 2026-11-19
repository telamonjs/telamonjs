import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import { z } from 'zod'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BaseForm } from '../forms/BaseForm'
import { RichSelector, type RichSelectorItem } from './RichSelector'
import { RichSelectorField } from './RichSelectorField'

expect.extend(axeMatchers)

// The global mocks keep popover content always in the DOM and never move focus:
// opening, closing and focus need the real components.
vi.unmock('../../ui/popover')
vi.unmock('../../ui/button')
vi.unmock('../../ui/input')

const ITEMS: RichSelectorItem<number>[] = [
  { value: 1, label: 'Ação Rápida' },
  { value: 2, label: 'Beta Ltda' },
]

const trigger = () => screen.getByRole('combobox')
const panelOpen = () => screen.queryByRole('listbox') !== null

describe('RichSelector with the real popover', () => {
  describe('focus', () => {
    it('click: focus lands on the search', async () => {
      const user = userEvent.setup()
      render(<RichSelector items={ITEMS} value={null} onChange={vi.fn()} />)
      await user.click(trigger())
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('searchbox'))
      )
    })

    it('hover leaves the caret in the field being typed in, opening and closing', async () => {
      const user = userEvent.setup()
      render(
        <>
          <input aria-label='outro' />
          <RichSelector items={ITEMS} value={null} onChange={vi.fn()} />
        </>
      )
      const other = screen.getByLabelText('outro')
      await user.click(other)
      await user.hover(trigger())
      await waitFor(() => expect(panelOpen()).toBe(true))
      expect(document.activeElement).toBe(other)

      await user.unhover(trigger())
      await waitFor(() => expect(panelOpen()).toBe(false))
      await act(() => new Promise(resolve => setTimeout(resolve, 20)))
      expect(document.activeElement).toBe(other)
    })
  })

  describe('hover close', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
    afterEach(() => vi.useRealTimers())

    const leaveAndWait = async () => {
      fireEvent.mouseLeave(trigger())
      await act(() => vi.advanceTimersByTimeAsync(400))
    }

    it('closes when the pointer leaves with an empty search', async () => {
      render(<RichSelector items={ITEMS} value={null} onChange={vi.fn()} />)
      fireEvent.mouseEnter(trigger())
      expect(panelOpen()).toBe(true)
      await leaveAndWait()
      expect(panelOpen()).toBe(false)
    })

    it('stays open with text in the search, keeping the text', async () => {
      render(<RichSelector items={ITEMS} value={null} onChange={vi.fn()} />)
      fireEvent.mouseEnter(trigger())
      fireEvent.change(screen.getByRole('searchbox'), {
        target: { value: 'be' },
      })
      await leaveAndWait()
      expect(panelOpen()).toBe(true)
      expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe(
        'be'
      )
    })

    it('stays open when typing starts inside the close delay', async () => {
      render(<RichSelector items={ITEMS} value={null} onChange={vi.fn()} />)
      fireEvent.mouseEnter(trigger())
      fireEvent.mouseLeave(trigger())
      fireEvent.change(screen.getByRole('searchbox'), {
        target: { value: 'be' },
      })
      await act(() => vi.advanceTimersByTimeAsync(400))
      expect(panelOpen()).toBe(true)
    })
  })

  describe('keyboard', () => {
    it('ArrowDown on the closed trigger opens it', async () => {
      const user = userEvent.setup()
      render(
        <RichSelector
          items={ITEMS}
          value={null}
          onChange={vi.fn()}
          openOnHover={false}
        />
      )
      trigger().focus()
      await user.keyboard('{ArrowDown}')
      await waitFor(() => expect(panelOpen()).toBe(true))
    })

    it('searchable={false} still moves with the arrows and picks with Enter or Space', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <RichSelector
          items={ITEMS}
          value={null}
          onChange={onChange}
          searchable={false}
          openOnHover={false}
        />
      )
      await user.click(trigger())
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('listbox'))
      )
      await user.keyboard('{ArrowDown}{Enter}')
      expect(onChange).toHaveBeenLastCalledWith(2, ITEMS[1])

      await user.click(trigger())
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('listbox'))
      )
      await user.keyboard(' ')
      expect(onChange).toHaveBeenLastCalledWith(1, ITEMS[0])
    })

    it('a reopened panel forgets the option highlighted before', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <RichSelector
          items={ITEMS}
          value={null}
          onChange={onChange}
          openOnHover={false}
        />
      )
      await user.click(trigger())
      await user.keyboard('{ArrowDown}{Escape}')
      await waitFor(() => expect(panelOpen()).toBe(false))
      await user.click(trigger())
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('searchbox'))
      )
      await user.keyboard('{Enter}')
      expect(onChange).toHaveBeenCalledWith(1, ITEMS[0])
    })
  })

  describe('accessibility', () => {
    // jsdom has no layout, and a lone component has no page landmarks.
    const noViolations = async () =>
      expect(
        await axe(document.body, {
          rules: {
            'color-contrast': { enabled: false },
            region: { enabled: false },
          },
        })
      ).toHaveNoViolations()

    it('open list with groups and the clearing row', async () => {
      const user = userEvent.setup()
      render(
        <RichSelector
          aria-label='Cliente'
          items={[
            { value: 1, label: 'A', group: 'Um' },
            { value: 2, label: 'B', group: 'Dois', description: 'detalhe' },
            { value: 3, label: 'C', disabled: true },
          ]}
          value={1}
          onChange={vi.fn()}
          openOnHover={false}
          footer={<a href='/novo'>Novo</a>}
        />
      )
      await user.click(trigger())
      await waitFor(() => expect(panelOpen()).toBe(true))
      await noViolations()
    })

    it('failed load: error and retry sit outside any listbox', async () => {
      const user = userEvent.setup()
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      render(
        <QueryClientProvider client={client}>
          <RichSelector<number>
            aria-label='Cliente'
            load={() => Promise.reject(new Error('down'))}
            queryKey={['failed']}
            value={null}
            onChange={vi.fn()}
            openOnHover={false}
          />
        </QueryClientProvider>
      )
      await user.click(trigger())
      await screen.findByRole('alert')
      expect(screen.queryByRole('listbox')).toBeNull()
      await noViolations()
    })

    it('empty list renders no listbox', async () => {
      const user = userEvent.setup()
      render(
        <RichSelector
          aria-label='Cliente'
          items={[]}
          value={null}
          onChange={vi.fn()}
          openOnHover={false}
        />
      )
      await user.click(trigger())
      await screen.findByRole('searchbox')
      expect(screen.queryByRole('listbox')).toBeNull()
      await noViolations()
    })
  })

  describe('in a BaseForm', () => {
    const Client = (props: Record<string, unknown>) => (
      <RichSelectorField<number> {...props} items={ITEMS} />
    )

    it('a failed submit focuses the trigger and links the error', async () => {
      render(
        <BaseForm
          sections={[
            {
              label: 'Info',
              fields: [
                {
                  name: 'clienteId',
                  label: 'Cliente',
                  type: 'component',
                  Component: Client,
                  required: true,
                },
              ],
            },
          ]}
          initialValues={{ clienteId: null }}
          validation={z.object({
            clienteId: z.number({ message: 'Obrigatório' }),
          })}
          onSubmit={vi.fn()}
          actionsConfig={{ standard: { submit: true } }}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
      await waitFor(() =>
        expect(trigger().getAttribute('aria-invalid')).toBe('true')
      )
      expect(trigger().getAttribute('aria-describedby')).toBe('clienteId-error')
      expect(trigger().getAttribute('aria-required')).toBe('true')
      expect(trigger().id).toBe('clienteId')
      expect(document.activeElement).toBe(trigger())
    })
  })

  it('reports blur when the panel closes, not when focus enters it', async () => {
    const user = userEvent.setup()
    const onBlur = vi.fn()
    render(
      <RichSelectorField items={ITEMS} onBlur={onBlur} openOnHover={false} />
    )
    await user.click(trigger())
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('searchbox'))
    )
    expect(onBlur).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(onBlur).toHaveBeenCalledTimes(1))
  })
})
