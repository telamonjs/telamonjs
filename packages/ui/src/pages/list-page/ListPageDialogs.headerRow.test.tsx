import { describe, it, expect, vi } from 'vitest'
import type { ComponentProps } from 'react'

// PRD 068 item 1: ListPage feeds the clicked row to EditDialog.headerRow.
const editProps = vi.hoisted(() => ({ last: undefined as Record<string, unknown> | undefined }))
vi.mock('../../components/dialog/edit-dialog', () => ({
  EditDialog: (props: Record<string, unknown>) => {
    editProps.last = props
    return <div data-testid='edit-dialog' />
  },
}))

describe('ListPageDialogs → EditDialog.headerRow', () => {
  it('passes the selected list row as headerRow', async () => {
    const { render, screen } = await import('../../test/test-utils')
    const { ListPageDialogs } = await import('./ListPageDialogs')
    const row = { id: '7', nome: 'Linha', categoria: { nome: 'VIP' } }
    const props = {
      dialogs: { edit: { title: 'Editar' } },
      mutations: {},
      form: {},
      formSections: [],
      actionsConfig: undefined,
      editDialogOpen: true,
      setEditDialogOpen: vi.fn(),
      selectedEntityId: '7',
      selectedEditRow: row,
      fetchActionWrapper: vi.fn(),
      updateSubmitValues: vi.fn(),
      handleEditDialogSuccess: vi.fn(),
      viewDialogOpen: false,
      setViewDialogOpen: vi.fn(),
      selectedViewEntityId: null,
      handleViewDialogEdit: vi.fn(),
      handleViewDialogDelete: vi.fn(),
      createDialogOpen: false,
      setCreateDialogOpen: vi.fn(),
      createSubmitValues: vi.fn(),
      handleRefresh: vi.fn(),
    } as unknown as ComponentProps<typeof ListPageDialogs>

    render(<ListPageDialogs {...props} />)

    expect(await screen.findByTestId('edit-dialog')).toBeInTheDocument()
    expect(editProps.last?.headerRow).toBe(row)
    expect(editProps.last?.headerData).toBeUndefined()
  })
})
