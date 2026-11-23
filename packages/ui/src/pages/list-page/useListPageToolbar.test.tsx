import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useListPageToolbar, toolbarQueryFilters } from './useListPageToolbar'
import type { ListConfig } from '../../types/crud'

const list = {
  toolbar: {
    filters: [
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'todos', label: 'Todos' },
          { value: 'ativo', label: 'Ativo' },
          { value: 'inativo', label: 'Inativo' },
        ],
        defaultValue: 'todos',
      },
    ],
  },
} as unknown as ListConfig<unknown>

function render(initialFilters?: Record<string, string>) {
  return renderHook(() =>
    useListPageToolbar({
      list,
      search: '',
      setStoreGlobalFilter: vi.fn(),
      setStorePage: vi.fn(),
      initialFilters,
    })
  )
}

describe('useListPageToolbar — initialFilters (7.11)', () => {
  it('starts empty when nothing comes from the URL and defaultValue is the first option', () => {
    const { result } = render()
    expect(result.current.toolbarFilters).toEqual({})
  })

  it('seeds the toolbar select from the URL value', () => {
    const { result } = render({ status: 'ativo' })
    expect(result.current.toolbarFilters).toEqual({ status: 'ativo' })
  })

  it('ignores URL keys that are not declared toolbar filters', () => {
    const { result } = render({ clienteId: 'abc' })
    expect(result.current.toolbarFilters).toEqual({})
  })

  it('clearing the select removes the seeded value', () => {
    const { result } = render({ status: 'ativo' })
    act(() => result.current.handleToolbarFilterChange('status', 'todos'))
    expect(result.current.toolbarFilters).toEqual({})
  })
})

describe('useListPageToolbar — defaultValue other than the first option (7.14)', () => {
  const comPadrao = {
    toolbar: {
      filters: [
        {
          key: 'ativo',
          label: 'Status',
          options: [
            { value: 'todos', label: 'Todos' },
            { value: 'true', label: 'Ativos' },
            { value: 'false', label: 'Inativos' },
          ],
          defaultValue: 'true',
        },
      ],
    },
  } as unknown as ListConfig<unknown>

  it('starts on the default and the reset keeps "todos" (not the default again)', () => {
    const { result } = renderHook(() =>
      useListPageToolbar({
        list: comPadrao,
        search: '',
        setStoreGlobalFilter: vi.fn(),
        setStorePage: vi.fn(),
      })
    )
    expect(result.current.toolbarFilters).toEqual({ ativo: 'true' })
    act(() => result.current.handleToolbarFilterChange('ativo', 'todos'))
    expect(result.current.toolbarFilters).toEqual({ ativo: 'todos' })
    expect(toolbarQueryFilters(result.current.toolbarFilters)).toEqual({})
  })
})

describe('useListPageToolbar — explicit allValue', () => {
  const withAll = (defaultValue?: string) =>
    ({
      toolbar: {
        filters: [
          {
            key: 'status',
            label: 'Status',
            allValue: 'ANY',
            // first option is a real value: no implicit "all" meaning anymore
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'all', label: 'Literal all' },
              { value: 'ANY', label: 'Any' },
            ],
            defaultValue,
          },
        ],
      },
    }) as unknown as ListConfig<unknown>

  const renderWith = (l: ListConfig<unknown>) =>
    renderHook(() =>
      useListPageToolbar({
        list: l,
        search: '',
        setStoreGlobalFilter: vi.fn(),
        setStorePage: vi.fn(),
      })
    )
  const configs = (l: ListConfig<unknown>) => l.toolbar!.filters!

  it('applies defaultValue even when it is the first option', () => {
    const l = withAll('ACTIVE')
    const { result } = renderWith(l)
    expect(result.current.toolbarFilters).toEqual({ status: 'ACTIVE' })
    expect(toolbarQueryFilters(result.current.toolbarFilters, configs(l))).toEqual({
      status: 'ACTIVE',
    })
  })

  it('allValue is dropped from the query; "all" is an ordinary value', () => {
    const l = withAll('ACTIVE')
    const { result } = renderWith(l)
    act(() => result.current.handleToolbarFilterChange('status', 'ANY'))
    // kept explicitly, or the default would come back
    expect(result.current.toolbarFilters).toEqual({ status: 'ANY' })
    expect(toolbarQueryFilters(result.current.toolbarFilters, configs(l))).toEqual({})

    act(() => result.current.handleToolbarFilterChange('status', 'all'))
    expect(toolbarQueryFilters(result.current.toolbarFilters, configs(l))).toEqual({
      status: 'all',
    })
  })

  it('without a default, choosing allValue removes the key', () => {
    const l = withAll()
    const { result } = renderWith(l)
    expect(result.current.toolbarFilters).toEqual({})
    act(() => result.current.handleToolbarFilterChange('status', 'ACTIVE'))
    act(() => result.current.handleToolbarFilterChange('status', 'ANY'))
    expect(result.current.toolbarFilters).toEqual({})
  })

  it('legacy filters keep their rules next to an allValue one', () => {
    expect(
      toolbarQueryFilters({ status: 'ANY', legacy: 'todos', other: 'x' }, configs(withAll()))
    ).toEqual({ other: 'x' })
  })
})
