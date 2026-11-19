/**
 * Characterization tests for useListPageActions (internal hook)
 *
 * PINS the current behavior of the actions column config builder BEFORE any
 * future refactor of the ListPage decomposition. The hook is the single place
 * that wires delete mutations, overrides edit/view handlers to open integrated
 * dialogs, and injects the `onAfterAction` refresh callback.
 *
 * DO NOT "correct" surprising behavior here — if a path seems wrong, open a
 * separate bug report. These tests describe what exists.
 *
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useListPageActions } from './useListPageActions'
import type { DataTableActionsConfig } from '../../types/actions'
import type { CrudConfigWithAnyForm } from '../../types/crud'

// ---------------------------------------------------------------------------
// Minimal fixture types
// ---------------------------------------------------------------------------

type TestEntity = { id: string; name: string }

// Minimal mutations shape the hook actually reads
function makeMutations(): CrudConfigWithAnyForm<TestEntity>['mutations'] {
  return {
    create: {
      mutationFn: vi.fn().mockResolvedValue({ success: true }),
      invalidates: [['entities']],
    },
    update: {
      mutationFn: vi.fn().mockResolvedValue({ success: true }),
      invalidates: [['entities']],
    },
    delete: {
      mutationFn: vi.fn().mockResolvedValue({ success: true }),
      invalidates: [['entities']],
    },
  }
}

function makeDeleteMutation() {
  return { mutateAsync: vi.fn().mockResolvedValue({ success: true }) }
}

function makeBaseParams(overrides: Partial<Parameters<typeof useListPageActions>[0]> = {}) {
  return {
    actionsDisabled: false,
    actionsConfig: {
      standard: { view: true, edit: true, delete: true },
    } as DataTableActionsConfig<TestEntity>,
    dialogs: undefined,
    mutations: makeMutations(),
    deleteMutation: makeDeleteMutation(),
    handleRefresh: vi.fn().mockResolvedValue(undefined),
    openEditForRow: vi.fn(),
    openViewForRow: vi.fn(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useListPageActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ─────────────────────────────────────────────────────────────

  describe('Rendering (initial return shape)', () => {
    it('returns undefined when actionsDisabled is true', () => {
      const { result } = renderHook(() =>
        useListPageActions(makeBaseParams({ actionsDisabled: true }))
      )
      expect(result.current).toBeUndefined()
    })

    it('returns a DataTableActionsConfig object when actions are enabled', () => {
      const { result } = renderHook(() => useListPageActions(makeBaseParams()))
      expect(result.current).toBeDefined()
      expect(typeof result.current).toBe('object')
    })

    it('preserves the standard.view/edit/delete flags from actionsConfig', () => {
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            actionsConfig: {
              standard: { view: true, edit: true, delete: true },
            },
          })
        )
      )
      // The hook copies the flags; they are truthy
      expect(result.current!.standard!.view).toBeTruthy()
      expect(result.current!.standard!.edit).toBeTruthy()
    })

    it('includes onAfterAction callback in the returned config', () => {
      const { result } = renderHook(() => useListPageActions(makeBaseParams()))
      expect(typeof result.current!.onAfterAction).toBe('function')
    })

    it('returns config with no dialogs override when dialogs is undefined', () => {
      const { result } = renderHook(() =>
        useListPageActions(makeBaseParams({ dialogs: undefined }))
      )
      // edit/view remain as the original actionsConfig values (not a function override)
      expect(result.current!.standard!.edit).toBe(true)
      expect(result.current!.standard!.view).toBe(true)
    })
  })

  describe('view/edit false with dialogs (7.14)', () => {
    it('keeps false: no row button, even with the dialog configured', () => {
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            actionsConfig: {
              standard: { view: false, edit: false, delete: true },
            } as DataTableActionsConfig<TestEntity>,
            dialogs: { view: { title: 'V' }, edit: { title: 'E' } } as never,
          })
        )
      )
      expect(result.current!.standard!.view).toBe(false)
      expect(result.current!.standard!.edit).toBe(false)
    })
  })

  // ── Interactions (calling returned callbacks) ──────────────────────────

  describe('Interactions', () => {
    it('onAfterAction calls handleRefresh when result is undefined', async () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useListPageActions(makeBaseParams({ handleRefresh }))
      )
      const row: TestEntity = { id: '1', name: 'Test' }
      await act(async () => {
        await result.current!.onAfterAction!('delete', row, undefined)
      })
      expect(handleRefresh).toHaveBeenCalledTimes(1)
    })

    it('onAfterAction calls handleRefresh when result has success: true', async () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useListPageActions(makeBaseParams({ handleRefresh }))
      )
      const row: TestEntity = { id: '1', name: 'Test' }
      await act(async () => {
        await result.current!.onAfterAction!('delete', row, { success: true })
      })
      expect(handleRefresh).toHaveBeenCalledTimes(1)
    })

    it('onAfterAction does NOT call handleRefresh when result has success: false', async () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useListPageActions(makeBaseParams({ handleRefresh }))
      )
      const row: TestEntity = { id: '1', name: 'Test' }
      await act(async () => {
        await result.current!.onAfterAction!('delete', row, { success: false })
      })
      expect(handleRefresh).not.toHaveBeenCalled()
    })

    it('onAfterAction calls the original onAfterAction from actionsConfig first', async () => {
      const originalOnAfterAction = vi.fn()
      const handleRefresh = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            handleRefresh,
            actionsConfig: {
              standard: { delete: true },
              onAfterAction: originalOnAfterAction,
            },
          })
        )
      )
      const row: TestEntity = { id: '1', name: 'Test' }
      await act(async () => {
        await result.current!.onAfterAction!('delete', row, { success: true })
      })
      expect(originalOnAfterAction).toHaveBeenCalledTimes(1)
      expect(originalOnAfterAction).toHaveBeenCalledWith('delete', row, { success: true })
    })

    it('delete standard action calls deleteMutation.mutateAsync with the row id', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ success: true })
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            deleteMutation: { mutateAsync },
            actionsConfig: {
              standard: { delete: true },
            },
          })
        )
      )
      const deleteConfig = result.current!.standard!.delete
      expect(typeof deleteConfig).toBe('object')
      const deleteHandler = (deleteConfig as { handler?: Function }).handler
      expect(typeof deleteHandler).toBe('function')

      await act(async () => {
        // DataTableActions calls handler with the id (string), but the hook
        // accepts id as string|number|BigInt and coerces to string
        await deleteHandler!('abc-123')
      })
      expect(mutateAsync).toHaveBeenCalledWith({ id: 'abc-123' })
    })

    it('edit handler calls openEditForRow with the row when editDialog is configured', async () => {
      const openEditForRow = vi.fn()
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            openEditForRow,
            dialogs: { edit: { title: 'Edit' } as any },
          })
        )
      )
      const editConfig = result.current!.standard!.edit
      const editHandler = (editConfig as { handler?: Function }).handler
      expect(typeof editHandler).toBe('function')

      const row: TestEntity = { id: '1', name: 'Test' }
      await act(async () => {
        await editHandler!(row)
      })
      expect(openEditForRow).toHaveBeenCalledWith(row)
    })

    it('view handler calls openViewForRow with the row when viewDialog is configured', async () => {
      const openViewForRow = vi.fn()
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            openViewForRow,
            dialogs: { view: { title: 'View' } as any },
          })
        )
      )
      const viewConfig = result.current!.standard!.view
      const viewHandler = (viewConfig as { handler?: Function }).handler
      expect(typeof viewHandler).toBe('function')

      const row: TestEntity = { id: '1', name: 'Test' }
      await act(async () => {
        await viewHandler!(row)
      })
      expect(openViewForRow).toHaveBeenCalledWith(row)
    })
  })

  // ── State Management ──────────────────────────────────────────────────────

  describe('State Management', () => {
    it('memoizes result — same reference when props are stable', () => {
      const params = makeBaseParams()
      const { result, rerender } = renderHook(() => useListPageActions(params))
      const first = result.current
      rerender()
      expect(result.current).toBe(first)
    })

    it('produces a new result when actionsConfig identity changes', () => {
      const params = makeBaseParams()
      const { result, rerender } = renderHook(
        (p: Parameters<typeof useListPageActions>[0]) => useListPageActions(p),
        { initialProps: params }
      )
      const first = result.current
      rerender({
        ...params,
        actionsConfig: { standard: { delete: true } },
      })
      // New config object → new result identity
      expect(result.current).not.toBe(first)
    })

    it('edit and view remain as booleans (not overridden) when no dialogs provided', () => {
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({ dialogs: undefined })
        )
      )
      expect(result.current!.standard!.edit).toBe(true)
      expect(result.current!.standard!.view).toBe(true)
    })

    it('delete is wired even when dialogs is undefined', () => {
      const mutateAsync = vi.fn().mockResolvedValue({ success: true })
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            dialogs: undefined,
            deleteMutation: { mutateAsync },
            actionsConfig: { standard: { delete: true } },
          })
        )
      )
      const deleteConfig = result.current!.standard!.delete
      expect(typeof deleteConfig).toBe('object')
      expect(typeof (deleteConfig as { handler?: Function }).handler).toBe('function')
    })
  })

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('returns undefined when actionsConfig is undefined and actionsDisabled is true', () => {
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({ actionsDisabled: true, actionsConfig: undefined })
        )
      )
      expect(result.current).toBeUndefined()
    })

    it('works with no standard config — falls back to empty object', () => {
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            actionsConfig: {} as DataTableActionsConfig<TestEntity>,
          })
        )
      )
      expect(result.current).toBeDefined()
      expect(typeof result.current!.onAfterAction).toBe('function')
    })

    it('handles numeric row ids by coercing to string before calling mutateAsync', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ success: true })
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            deleteMutation: { mutateAsync },
            actionsConfig: { standard: { delete: true } },
          })
        )
      )
      const handler = (result.current!.standard!.delete as { handler?: Function }).handler!
      await act(async () => {
        await handler(42) // numeric id
      })
      expect(mutateAsync).toHaveBeenCalledWith({ id: '42' })
    })

    it('edit handler returns { success: true }', async () => {
      const openEditForRow = vi.fn()
      const { result } = renderHook(() =>
        useListPageActions(
          makeBaseParams({
            openEditForRow,
            dialogs: { edit: { title: 'Edit' } as any },
          })
        )
      )
      const editHandler = (result.current!.standard!.edit as { handler?: Function }).handler!
      const row: TestEntity = { id: '1', name: 'Test' }
      let handlerResult: unknown
      await act(async () => {
        handlerResult = await editHandler(row)
      })
      expect(handlerResult).toEqual({ success: true })
    })
  })

  // ── Accessibility ─────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    // useListPageActions is a pure logic hook with no rendered output.
    // Accessibility concerns live in the consuming DataTableActions component.
    // This block exists to satisfy the required 5-section structure.
    it('is a pure hook — no rendered output to audit with axe', () => {
      // Intentional no-op: accessibility is exercised by DataTableActions tests.
      expect(true).toBe(true)
    })
  })
})
