import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '../test/test-utils'
import { ColumnDef } from '@tanstack/react-table'
import { ExportMenu } from './ExportMenu'

describe('ExportMenu', () => {
  const mockData = [
    { id: 1, name: 'John', age: 30 },
    { id: 2, name: 'Jane', age: 25 },
  ]

  const mockColumns: ColumnDef<any>[] = [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Age', accessorKey: 'age' },
  ]

  const mockOnExportStart = vi.fn()
  const mockOnExportComplete = vi.fn()

  beforeEach(() => {
    mockOnExportStart.mockClear()
    mockOnExportComplete.mockClear()

    // Mock export utilities
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders export button', () => {
      render(
        <ExportMenu data={mockData} columns={mockColumns} filename='test' />
      )

      expect(screen.getByText('Exportar')).toBeInTheDocument()
    })
  })
})

describe('ExportMenu onExport', () => {
  it('delegates generation to the app and skips exportUtils', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const onExport = vi.fn().mockResolvedValue(undefined)
    const onExportComplete = vi.fn()
    const cols: ColumnDef<{ id: number }>[] = [{ header: 'ID', accessorKey: 'id' }]
    const rows = [{ id: 1 }, { id: 2 }]
    const user = userEvent.setup()
    render(
      <ExportMenu
        data={rows}
        columns={cols}
        formats={['csv']}
        onExport={onExport}
        onExportComplete={onExportComplete}
      />
    )
    await user.click(screen.getByTestId('export-menu-trigger'))
    await user.click(await screen.findByText('CSV (.csv)'))
    await user.click(await screen.findByText('Exportar tudo'))
    await vi.waitFor(() => expect(onExport).toHaveBeenCalledWith('csv', rows, cols))
    await vi.waitFor(() => expect(onExportComplete).toHaveBeenCalled())
  })
})
