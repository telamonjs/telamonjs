/**
 * Characterization tests for ListPageToolbar layout below `lg`.
 *
 * TabToolbar root is `grid grid-cols-2` below `lg` (TabToolbar.tsx). A bare
 * Refresh/Add button placed directly in that grid becomes a stretched grid
 * cell (half the toolbar wide, see consumer audit at 900px). The trailing
 * controls (Spacer, Counter, Add, Refresh) must therefore live in a single
 * `col-span-2 lg:contents` flex group, same pattern as the filters row.
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ListPageToolbar } from './ListPageToolbar'
import { msg } from '../../i18n/msg'
import { withAppMessages } from '../../test/intl'
import type { ListConfig } from '../../types/crud'

const list = { searchPlaceholder: 'Buscar' } as ListConfig<unknown>

function renderToolbar(showAddButton = true, l: ListConfig<unknown> = list, wrapper?: ReturnType<typeof withAppMessages>) {
  return render(
    <ListPageToolbar
      list={l}
      localSearch=''
      onSearchChange={vi.fn()}
      toolbarFilters={{}}
      onFilterChange={vi.fn()}
      total={18}
      loading={false}
      isFetching={false}
      showAddButton={showAddButton}
      onAdd={vi.fn()}
      onRefresh={vi.fn(async () => undefined)}
    />,
    { wrapper }
  )
}

describe('ListPageToolbar (search)', () => {
  it('shows the search by default', () => {
    renderToolbar()
    expect(screen.getByPlaceholderText('Buscar')).toBeInTheDocument()
  })

  it('hides the search with toolbar.showSearch false, for lists filtered by selectors', () => {
    renderToolbar(true, { ...list, toolbar: { showSearch: false } })
    expect(screen.queryByPlaceholderText('Buscar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument()
  })
})

describe('ListPageToolbar (trailing controls group)', () => {
  it('groups counter, add and refresh in one col-span-2 lg:contents flex row', () => {
    renderToolbar()

    const refresh = screen.getByRole('button', { name: 'Atualizar' })
    const add = screen.getByTestId('toolbar-add-button')
    const counter = screen.getByText(/18 resultados/)

    const group = refresh.parentElement!
    expect(group.className).toContain('col-span-2')
    expect(group.className).toContain('lg:contents')
    expect(group.className).toContain('flex')
    expect(add.parentElement).toBe(group)
    expect(counter.parentElement).toBe(group)
    // Refresh must never be a direct grid cell of the toolbar root
    expect(group.className).not.toContain('grid')
  })

  it('keeps the group when add button is hidden', () => {
    renderToolbar(false)
    const refresh = screen.getByRole('button', { name: 'Atualizar' })
    expect(refresh.parentElement!.className).toContain('lg:contents')
  })
})

describe('ListPageToolbar counterLabel', () => {
  const app = {
    produtos: {
      counter: '{count, plural, one {# asset} other {# assets}}',
      plain: 'assets',
    },
  }
  const withCounter = (counterLabel: NonNullable<ListConfig<unknown>['toolbar']>['counterLabel']) =>
    ({ ...list, toolbar: { counterLabel } }) as ListConfig<unknown>

  it('string literal keeps the "{count} label" prefix (legacy)', () => {
    renderToolbar(false, withCounter('produtos'))
    expect(screen.getByText('18 produtos')).toBeInTheDocument()
  })

  it('function keeps the "{count} label" prefix (legacy)', () => {
    renderToolbar(false, withCounter(n => (n === 1 ? 'produto' : 'produtos')))
    expect(screen.getByText('18 produtos')).toBeInTheDocument()
  })

  it('MessageRef with ICU {count} gets count injected and no prefix', () => {
    renderToolbar(false, withCounter(msg('produtos.counter')), withAppMessages(app))
    expect(screen.getByText('18 assets')).toBeInTheDocument()
  })

  it('MessageRef without {count} keeps the prefix (refs that predate the injection)', () => {
    renderToolbar(false, withCounter(msg('produtos.plain')), withAppMessages(app))
    expect(screen.getByText('18 assets')).toBeInTheDocument()
  })
})

describe('ListPageToolbar export (consumer QA 7.3.1: Export missing in the 7.x toolbar)', () => {
  it('renders the Export menu when list.enableExport', () => {
    renderToolbar(false, { ...list, enableExport: true, columns: [] } as ListConfig<unknown>)
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument()
  })

  it('no Export without enableExport', () => {
    renderToolbar(false)
    expect(screen.queryByRole('button', { name: /exportar/i })).not.toBeInTheDocument()
  })
})

describe('ListPageToolbar levels (7.14)', () => {
  const statusList = {
    searchPlaceholder: 'Buscar',
    toolbar: {
      filters: [
        {
          key: 'status',
          label: 'Status',
          options: [
            { value: 'todos', label: 'Todas' },
            { value: 'ABERTA', label: 'Em aberto' },
            { value: 'PENDENTE', label: 'A vencer', more: true },
          ],
        },
      ],
    },
  } as unknown as ListConfig<unknown>

  function renderLevels(
    props: Partial<React.ComponentProps<typeof ListPageToolbar>> = {}
  ) {
    const onFilterChange = vi.fn()
    render(
      <ListPageToolbar
        list={statusList}
        localSearch=''
        onSearchChange={vi.fn()}
        toolbarFilters={{}}
        onFilterChange={onFilterChange}
        total={3}
        loading={false}
        isFetching={false}
        showAddButton={false}
        onAdd={vi.fn()}
        onRefresh={vi.fn(async () => undefined)}
        {...props}
      />
    )
    return onFilterChange
  }

  it('`more` options stay out of the buttons; Filters button appears', () => {
    renderLevels()
    expect(screen.getByTestId('filter-button-ABERTA')).toBeInTheDocument()
    expect(screen.queryByTestId('filter-button-PENDENTE')).toBeNull()
    expect(screen.getByTestId('list-filters-trigger')).toBeInTheDocument()
  })

  it('active `more` option and activeFilters become removable chips', () => {
    const onClearFilters = vi.fn()
    const onRemove = vi.fn()
    const onFilterChange = renderLevels({
      toolbarFilters: { status: 'PENDENTE' },
      activeFilters: [{ key: 'cliente', label: 'Cliente: ACME', onRemove }],
      onClearFilters,
    })
    const chips = screen.getByTestId('list-active-filters')
    expect(chips).toHaveTextContent('Status: A vencer')
    expect(chips).toHaveTextContent('Cliente: ACME')
    expect(screen.getByTestId('list-filters-trigger')).toHaveTextContent('2')
    screen.getByRole('button', { name: /Limpar filtros$/ }).click()
    expect(onFilterChange).toHaveBeenCalledWith('status', 'todos')
    expect(onClearFilters).toHaveBeenCalled()
  })

  it('actionsMenu: one "⋯" button instead of export + refresh', () => {
    renderLevels({
      list: {
        ...statusList,
        columns: [],
        enableExport: true,
        toolbar: { ...statusList.toolbar, actionsMenu: true },
      } as ListConfig<unknown>,
    })
    expect(screen.getByTestId('list-actions-menu')).toBeInTheDocument()
    expect(screen.queryByTestId('export-menu-trigger')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Atualizar' })).toBeNull()
  })
})
