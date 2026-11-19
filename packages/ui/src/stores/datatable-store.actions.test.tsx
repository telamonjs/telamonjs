import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDataTableActions, useDataTableStore } from './datatable-store'

describe('useDataTableActions', () => {
  // Regression: the hook subscribed to the whole store, so any change to any
  // table re-rendered the caller and produced a new actions object.
  it('keeps the same object and does not re-render on store changes', () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders++
      return useDataTableActions('t1')
    })
    const first = result.current
    const rendersBefore = renders

    act(() => {
      useDataTableStore.getState().setGlobalFilter('other-table', 'x')
      result.current.setPage(3)
    })

    expect(result.current).toBe(first)
    expect(renders).toBe(rendersBefore)
    expect(useDataTableStore.getState().tables['t1']?.page).toBe(3)
  })
})
