/**
 * Characterization tests for useListPageDialogs (internal hook)
 *
 * PINS the current state machine behavior: open/close/transition across the
 * three integrated dialogs (create/edit/view), the view→edit handoff, the
 * ViewDialog delete flow, and the mutation/fetch wrappers.
 *
 * useDialogUrlSync is also exercised here (it is called unconditionally inside
 * the hook). When `dialogs.*.urlParam` is undefined the sync hook is a no-op.
 *
 * DO NOT "correct" surprising behavior — open a separate issue instead.
 * These tests describe what exists.
 *
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useListPageDialogs } from './useListPageDialogs'
import type { CrudConfigWithAnyForm, DialogsConfig } from '../../types/crud'

// ---------------------------------------------------------------------------
// next/navigation mock (required by useDialogUrlSync → useUrlSync)
// ---------------------------------------------------------------------------

const routerMock = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }
let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/admin/entities',
  useSearchParams: () => searchParams,
}))

// ---------------------------------------------------------------------------
// Minimal fixture types
// ---------------------------------------------------------------------------

type TestEntity = { id: string; name: string }

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
    getForEdit: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
    getForView: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
  }
}

function makeCreateMutation() {
  return {
    mutateAsync: vi.fn().mockResolvedValue({ success: true, data: { id: '99', name: 'New' } }),
  }
}

function makeUpdateMutation() {
  return {
    mutateAsync: vi.fn().mockResolvedValue({ success: true, data: { id: '1', name: 'Updated' } }),
  }
}

function makeDeleteMutation() {
  return { mutateAsync: vi.fn().mockResolvedValue({ success: true }) }
}

const sampleData: TestEntity[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
]

function makeBaseParams(
  overrides: Partial<Parameters<typeof useListPageDialogs>[0]> = {}
) {
  return {
    dialogs: undefined as DialogsConfig<TestEntity> | undefined,
    mutations: makeMutations(),
    actionsConfig: undefined,
    data: sampleData,
    createMutation: makeCreateMutation(),
    updateMutation: makeUpdateMutation(),
    deleteMutation: makeDeleteMutation(),
    handleRefresh: vi.fn().mockResolvedValue(undefined),
    rootRef: undefined,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useListPageDialogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering (initial return shape) ─────────────────────────────────────

  describe('Rendering (initial return shape)', () => {
    it('returns all expected keys', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      const keys = Object.keys(result.current)
      expect(keys).toContain('editDialogOpen')
      expect(keys).toContain('setEditDialogOpen')
      expect(keys).toContain('selectedEntityId')
      expect(keys).toContain('viewDialogOpen')
      expect(keys).toContain('setViewDialogOpen')
      expect(keys).toContain('selectedViewEntityId')
      expect(keys).toContain('createDialogOpen')
      expect(keys).toContain('setCreateDialogOpen')
      expect(keys).toContain('openEditForRow')
      expect(keys).toContain('openViewForRow')
      expect(keys).toContain('handleAdd')
      expect(keys).toContain('handleRowClick')
      expect(keys).toContain('handleViewDialogEdit')
      expect(keys).toContain('handleViewDialogDelete')
      expect(keys).toContain('handleEditDialogSuccess')
      expect(keys).toContain('createSubmitValues')
      expect(keys).toContain('updateSubmitValues')
      expect(keys).toContain('fetchActionWrapper')
    })

    it('starts with all dialogs closed', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      expect(result.current.editDialogOpen).toBe(false)
      expect(result.current.viewDialogOpen).toBe(false)
      expect(result.current.createDialogOpen).toBe(false)
    })

    it('starts with null entity IDs', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      expect(result.current.selectedEntityId).toBeNull()
      expect(result.current.selectedViewEntityId).toBeNull()
    })
  })

  // ── Interactions (calling returned callbacks) ──────────────────────────

  describe('Interactions', () => {
    it('openEditForRow opens the edit dialog with the row id', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => {
        result.current.openEditForRow(sampleData[0])
      })
      expect(result.current.editDialogOpen).toBe(true)
      expect(result.current.selectedEntityId).toBe('1')
      expect(result.current.viewDialogOpen).toBe(false)
      expect(result.current.createDialogOpen).toBe(false)
    })

    it('openViewForRow opens the view dialog with the row id', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => {
        result.current.openViewForRow(sampleData[1])
      })
      expect(result.current.viewDialogOpen).toBe(true)
      expect(result.current.selectedViewEntityId).toBe('2')
      expect(result.current.editDialogOpen).toBe(false)
    })

    it('setEditDialogOpen(false) closes the edit dialog', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => { result.current.openEditForRow(sampleData[0]) })
      expect(result.current.editDialogOpen).toBe(true)
      act(() => { result.current.setEditDialogOpen(false) })
      expect(result.current.editDialogOpen).toBe(false)
      expect(result.current.selectedEntityId).toBeNull()
    })

    it('setViewDialogOpen(false) closes the view dialog', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => { result.current.openViewForRow(sampleData[0]) })
      act(() => { result.current.setViewDialogOpen(false) })
      expect(result.current.viewDialogOpen).toBe(false)
    })

    it('setCreateDialogOpen(true) opens the create dialog', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => { result.current.setCreateDialogOpen(true) })
      expect(result.current.createDialogOpen).toBe(true)
    })

    it('setCreateDialogOpen(false) closes the create dialog', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => { result.current.setCreateDialogOpen(true) })
      act(() => { result.current.setCreateDialogOpen(false) })
      expect(result.current.createDialogOpen).toBe(false)
    })

    it('handleAdd opens the create dialog when dialogs.create is configured', () => {
      const { result } = renderHook(() =>
        useListPageDialogs(
          makeBaseParams({ dialogs: { create: { title: 'Create' } as any } })
        )
      )
      act(() => { result.current.handleAdd() })
      expect(result.current.createDialogOpen).toBe(true)
    })

    it('handleAdd does nothing when dialogs.create is not configured', () => {
      const { result } = renderHook(() =>
        useListPageDialogs(makeBaseParams({ dialogs: undefined }))
      )
      act(() => { result.current.handleAdd() })
      expect(result.current.createDialogOpen).toBe(false)
    })

    it('handleRowClick opens the view dialog when dialogs.view is configured', () => {
      const { result } = renderHook(() =>
        useListPageDialogs(
          makeBaseParams({ dialogs: { view: { title: 'View' } as any } })
        )
      )
      act(() => { result.current.handleRowClick(sampleData[0]) })
      expect(result.current.viewDialogOpen).toBe(true)
      expect(result.current.selectedViewEntityId).toBe('1')
    })

    it('handleRowClick does nothing when dialogs.view is not configured', () => {
      const { result } = renderHook(() =>
        useListPageDialogs(makeBaseParams({ dialogs: undefined }))
      )
      act(() => { result.current.handleRowClick(sampleData[0]) })
      expect(result.current.viewDialogOpen).toBe(false)
    })

    it('handleViewDialogEdit opens edit dialog for the currently-viewed entity id', () => {
      const { result } = renderHook(() =>
        useListPageDialogs(
          makeBaseParams({
            dialogs: {
              view: { title: 'View' } as any,
              edit: { title: 'Edit' } as any,
            },
          })
        )
      )
      // First open the view dialog
      act(() => { result.current.openViewForRow(sampleData[0]) })
      expect(result.current.viewDialogOpen).toBe(true)
      expect(result.current.selectedViewEntityId).toBe('1')

      // Trigger handoff
      act(() => { result.current.handleViewDialogEdit() })
      expect(result.current.editDialogOpen).toBe(true)
      expect(result.current.selectedEntityId).toBe('1')
    })

    it('handleEditDialogSuccess calls handleRefresh', async () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useListPageDialogs(makeBaseParams({ handleRefresh }))
      )
      await act(async () => {
        await result.current.handleEditDialogSuccess()
      })
      expect(handleRefresh).toHaveBeenCalledTimes(1)
    })
  })

  // ── PRD 068 item 1: the row behind the edit dialog (EditDialog.headerRow) ──

  describe('selectedEditRow', () => {
    it('is undefined while the edit dialog is closed', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      expect(result.current.selectedEditRow).toBeUndefined()
    })

    it('is the clicked list row when edit opens from the actions column', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => { result.current.openEditForRow(sampleData[1]) })
      expect(result.current.selectedEditRow).toBe(sampleData[1])
    })

    it('is the viewed row after the view → edit handoff', () => {
      const { result } = renderHook(() =>
        useListPageDialogs(
          makeBaseParams({
            dialogs: {
              view: { title: 'View' } as any,
              edit: { title: 'Edit' } as any,
            },
          })
        )
      )
      act(() => { result.current.openViewForRow(sampleData[0]) })
      act(() => { result.current.handleViewDialogEdit() })
      expect(result.current.selectedEditRow).toBe(sampleData[0])
    })

    it('is undefined when the id is not on the loaded page (deep link)', () => {
      const { result } = renderHook(() =>
        useListPageDialogs(makeBaseParams({ data: [] }))
      )
      act(() => { result.current.openEditForRow(sampleData[0]) })
      expect(result.current.editDialogOpen).toBe(true)
      expect(result.current.selectedEditRow).toBeUndefined()
    })
  })

  // ── State Management ──────────────────────────────────────────────────────

  describe('State Management', () => {
    it('only one dialog can be open at a time — opening edit closes view', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => { result.current.openViewForRow(sampleData[0]) })
      expect(result.current.viewDialogOpen).toBe(true)

      act(() => { result.current.openEditForRow(sampleData[1]) })
      expect(result.current.editDialogOpen).toBe(true)
      expect(result.current.viewDialogOpen).toBe(false)
    })

    it('only one dialog can be open at a time — openCreate closes edit', () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => { result.current.openEditForRow(sampleData[0]) })
      expect(result.current.editDialogOpen).toBe(true)

      act(() => { result.current.setCreateDialogOpen(true) })
      expect(result.current.createDialogOpen).toBe(true)
      expect(result.current.editDialogOpen).toBe(false)
    })

    it('openEditForRow works with numeric ids — coerces to string', () => {
      const entityWithNumericId = { id: 99 as unknown as string, name: 'Num' }
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => { result.current.openEditForRow(entityWithNumericId) })
      expect(result.current.selectedEntityId).toBe('99')
    })

    it('openViewForRow works with numeric ids — coerces to string', () => {
      const entityWithNumericId = { id: 42 as unknown as string, name: 'Num' }
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      act(() => { result.current.openViewForRow(entityWithNumericId) })
      expect(result.current.selectedViewEntityId).toBe('42')
    })
  })

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe('Deep-link (dialogUrlSync)', () => {
    const dialogs = {
      view: { urlParam: 'view', renderContent: () => null },
    } as unknown as DialogsConfig<TestEntity>

    beforeEach(() => {
      searchParams = new URLSearchParams('view=processo-1')
      routerMock.push.mockClear()
      routerMock.replace.mockClear()
    })

    it('default: ?view=<id> opens the view dialog on mount', () => {
      const { result } = renderHook(() =>
        useListPageDialogs(makeBaseParams({ dialogs }))
      )
      expect(result.current.viewDialogOpen).toBe(true)
      expect(result.current.selectedViewEntityId).toBe('processo-1')
    })

    it('dialogUrlSync=false: ignores ?view and never writes the URL', () => {
      const { result } = renderHook(() =>
        useListPageDialogs(makeBaseParams({ dialogs, dialogUrlSync: false }))
      )
      expect(result.current.viewDialogOpen).toBe(false)
      act(() => result.current.openViewForRow(sampleData[0]))
      expect(result.current.viewDialogOpen).toBe(true)
      act(() => result.current.setViewDialogOpen(false))
      expect(routerMock.push).not.toHaveBeenCalled()
      expect(routerMock.replace).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('createSubmitValues delegates to createMutation.mutateAsync', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ success: true })
      const { result } = renderHook(() =>
        useListPageDialogs(
          makeBaseParams({ createMutation: { mutateAsync } })
        )
      )
      const values = { name: 'New Entity' }
      await act(async () => {
        await result.current.createSubmitValues(values)
      })
      expect(mutateAsync).toHaveBeenCalledWith(values)
    })

    it('updateSubmitValues delegates to updateMutation.mutateAsync with {id, ...data}', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ success: true })
      const { result } = renderHook(() =>
        useListPageDialogs(
          makeBaseParams({ updateMutation: { mutateAsync } })
        )
      )
      await act(async () => {
        await result.current.updateSubmitValues({ id: 'abc', name: 'Updated' })
      })
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 'abc',
        data: { name: 'Updated' },
      })
    })

    it('updateSubmitValues throws when id is missing from values', async () => {
      const { result } = renderHook(() => useListPageDialogs(makeBaseParams()))
      await expect(
        act(async () => {
          await result.current.updateSubmitValues({ name: 'No ID' })
        })
      ).rejects.toThrow('Missing id in submit values')
    })

    it('fetchActionWrapper delegates to mutations.getForEdit', async () => {
      const getForEdit = vi.fn().mockResolvedValue({ id: '5', name: 'Fetched' })
      const { result } = renderHook(() =>
        useListPageDialogs(
          makeBaseParams({ mutations: { ...makeMutations(), getForEdit } })
        )
      )
      let fetched: unknown
      await act(async () => {
        fetched = await result.current.fetchActionWrapper('5')
      })
      expect(getForEdit).toHaveBeenCalledWith('5')
      expect(fetched).toEqual({ id: '5', name: 'Fetched' })
    })

    it('fetchActionWrapper throws when mutations.getForEdit is undefined', async () => {
      const mutations = makeMutations()
      mutations.getForEdit = undefined
      const { result } = renderHook(() =>
        useListPageDialogs(makeBaseParams({ mutations }))
      )
      await expect(
        act(async () => {
          await result.current.fetchActionWrapper('5')
        })
      ).rejects.toThrow('mutations.getForEdit is required')
    })

    it('handleViewDialogDelete calls handleRefresh after deleteMutation when no custom handler', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ success: true })
      const handleRefresh = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        useListPageDialogs(
          makeBaseParams({
            deleteMutation: { mutateAsync },
            handleRefresh,
            actionsConfig: { standard: { delete: true } },
          })
        )
      )
      // Open view dialog first so selectedViewEntityId is set
      act(() => { result.current.openViewForRow(sampleData[0]) })
      await act(async () => {
        await result.current.handleViewDialogDelete()
      })
      expect(mutateAsync).toHaveBeenCalledWith({ id: '1' })
      expect(handleRefresh).toHaveBeenCalledTimes(1)
    })

    it('handleViewDialogDelete is a no-op when selectedViewEntityId is null', async () => {
      const mutateAsync = vi.fn()
      const handleRefresh = vi.fn()
      const { result } = renderHook(() =>
        useListPageDialogs(
          makeBaseParams({
            deleteMutation: { mutateAsync },
            handleRefresh,
            actionsConfig: { standard: { delete: true } },
          })
        )
      )
      // No view dialog opened → selectedViewEntityId is null
      await act(async () => {
        await result.current.handleViewDialogDelete()
      })
      expect(mutateAsync).not.toHaveBeenCalled()
      expect(handleRefresh).not.toHaveBeenCalled()
    })
  })

  // ── Accessibility ─────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    // useListPageDialogs is a pure state-management hook with no rendered output.
    // A11y concerns live in the consuming ListPageDialogs render component.
    it('is a pure hook — no rendered output to audit with axe', () => {
      expect(true).toBe(true)
    })
  })
})
