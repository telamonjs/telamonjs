import { describe, it, expect, vi } from 'vitest'

const loaded = vi.hoisted(() => ({ count: 0 }))

// The factory runs only when create-dialog (AdminForm + field registry) is evaluated.
vi.mock('../../components/dialog/create-dialog', () => {
  loaded.count++
  return { CreateDialog: () => <div data-testid='create-dialog' /> }
})

describe('ListPageDialogs lazy dialogs', () => {
  it('does not evaluate the dialogs until one opens or is prefetched', async () => {
    const { render, screen } = await import('../../test/test-utils')
    const { ListPageDialogs } = await import('./ListPageDialogs')
    const { prefetchCreateDialog } = await import('./prefetch-create-dialog')
    const noop = vi.fn()
    const props = {
      dialogs: { create: { title: 'New' } },
      mutations: {},
      form: {},
      formSections: [],
      actionsConfig: undefined,
      editDialogOpen: false,
      setEditDialogOpen: noop,
      selectedEntityId: null,
      fetchActionWrapper: vi.fn(),
      updateSubmitValues: vi.fn(),
      handleEditDialogSuccess: vi.fn(),
      viewDialogOpen: false,
      setViewDialogOpen: noop,
      selectedViewEntityId: null,
      handleViewDialogEdit: noop,
      handleViewDialogDelete: vi.fn(),
      createDialogOpen: false,
      setCreateDialogOpen: noop,
      createSubmitValues: vi.fn(),
      handleRefresh: vi.fn(),
    } as unknown as React.ComponentProps<typeof ListPageDialogs>

    const { rerender } = render(<ListPageDialogs {...props} />)
    expect(loaded.count).toBe(0)

    rerender(<ListPageDialogs {...props} createDialogOpen />)
    expect(await screen.findByTestId('create-dialog')).toBeInTheDocument()
    expect(loaded.count).toBe(1)

    // stays mounted after closing (exit animation)
    rerender(<ListPageDialogs {...props} createDialogOpen={false} />)
    expect(screen.getByTestId('create-dialog')).toBeInTheDocument()
    expect(() => prefetchCreateDialog()).not.toThrow()
  })
})
