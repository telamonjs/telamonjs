/**
 * "Filters" popover with the real Radix popover: it opens on hover and must not
 * close under the person working in it (typing in a field, a selector or
 * calendar popup open with the focus inside), while a plain hover-and-leave
 * still closes it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ListPageToolbar } from './ListPageToolbar'
import { RichSelector } from '../../components/selectors/RichSelector'
import type { ListConfig } from '../../types/crud'

vi.unmock('../../ui/popover')
vi.unmock('../../ui/button')
vi.unmock('../../ui/input')

const list = { searchPlaceholder: 'Buscar' } as ListConfig<unknown>

function renderToolbar(panel: React.ReactNode) {
  render(
    <ListPageToolbar
      list={list}
      localSearch=''
      onSearchChange={vi.fn()}
      toolbarFilters={{}}
      onFilterChange={vi.fn()}
      total={1}
      loading={false}
      isFetching={false}
      showAddButton={false}
      onAdd={vi.fn()}
      onRefresh={vi.fn(async () => undefined)}
      filtersPanel={<div data-testid='panel'>{panel}</div>}
    />
  )
}

const trigger = () => screen.getByTestId('list-filters-trigger')
const panelOpen = () => screen.queryByTestId('panel') !== null
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const open = () => fireEvent.mouseEnter(trigger())
const leave = async () => {
  fireEvent.mouseLeave(trigger())
  await wait(400)
}

describe('ListPageToolbar Filters popover (keepOpen)', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('hover then leave closes it, even when the opening focused a field', async () => {
    renderToolbar(<input aria-label='Número' />)
    open()
    expect(panelOpen()).toBe(true)
    await leave()
    expect(panelOpen()).toBe(false)
  })

  it('typing in a field keeps it open; it closes once the field lets go', async () => {
    renderToolbar(<input aria-label='Número' />)
    open()
    const input = screen.getByLabelText('Número')
    fireEvent.pointerDown(input)
    act(() => input.focus())
    fireEvent.keyDown(input, { key: '1' })
    await leave()
    expect(panelOpen()).toBe(true)
    await wait(1000)
    expect(panelOpen()).toBe(true)

    act(() => input.blur())
    await wait(400)
    expect(panelOpen()).toBe(false)
  })

  it('a click on a plain button inside still lets a leave close it', async () => {
    renderToolbar(<button type='button'>Opção</button>)
    open()
    const button = screen.getByRole('button', { name: 'Opção' })
    fireEvent.pointerDown(button)
    act(() => button.focus())
    await leave()
    expect(panelOpen()).toBe(false)
  })

  it('a selector opened from the panel (portal, outside its DOM) keeps it open', async () => {
    renderToolbar(
      <RichSelector
        aria-label='Status'
        openOnHover={false}
        items={[{ value: 'A', label: 'Aberta' }]}
        value={null}
        onChange={vi.fn()}
      />
    )
    open()
    const combobox = screen.getByRole('combobox', { name: 'Status' })
    fireEvent.pointerDown(combobox)
    fireEvent.click(combobox)
    await wait(50)
    const searchbox = screen.getByRole('searchbox')
    expect(screen.getByTestId('panel').contains(searchbox)).toBe(false)
    expect(document.activeElement).toBe(searchbox)

    await leave()
    expect(panelOpen()).toBe(true)
  })

  it('a popup closing under the pointer (a pick, Esc) does not leave the panel stuck open', async () => {
    renderToolbar(
      <RichSelector
        aria-label='Status'
        openOnHover={false}
        items={[{ value: 'A', label: 'Aberta' }]}
        value={null}
        onChange={vi.fn()}
      />
    )
    open()
    const combobox = screen.getByRole('combobox', { name: 'Status' })
    fireEvent.pointerDown(combobox)
    fireEvent.click(combobox)
    await wait(50)
    expect(document.activeElement).toBe(screen.getByRole('searchbox'))

    // No mouseleave: the pointer "stays" where the popup was
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    await wait(50)
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(document.activeElement).toBe(combobox)
    await wait(400)
    expect(panelOpen()).toBe(false)
  })
})
