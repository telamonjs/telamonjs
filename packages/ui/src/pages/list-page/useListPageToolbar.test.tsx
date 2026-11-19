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
