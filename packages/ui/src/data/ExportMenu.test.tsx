import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '../test/test-utils'
import { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ExportMenu } from './ExportMenu'

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

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

describe('ExportMenu loadAll (every page from the server)', () => {
  const cols: ColumnDef<{ id: number }>[] = [{ header: 'ID', accessorKey: 'id' }]

  async function openAll(user: { click: (el: Element) => Promise<void> }) {
    await user.click(screen.getByTestId('export-menu-trigger'))
    await user.click(await screen.findByText('CSV (.csv)'))
    await user.click(await screen.findByText('Exportar tudo'))
  }

  beforeEach(() => {
    vi.mocked(toast.loading).mockReturnValue('progress')
  })

  it('"All" exports the rows loadAll fetches (not `data`), labelled with allCount', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const onExport = vi.fn()
    const all = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const loadAll = vi.fn(async ({ onProgress }: { onProgress: (l: number, t: number) => void }) => {
      onProgress(3, 3)
      return { rows: all, total: 3 }
    })
    render(
      <ExportMenu data={[{ id: 1 }]} columns={cols} formats={['csv']} onExport={onExport} loadAll={loadAll} allCount={3} />
    )
    await user.click(screen.getByTestId('export-menu-trigger'))
    await user.click(await screen.findByText('CSV (.csv)'))
    expect(screen.getByText('3 registros')).toBeInTheDocument()
    await user.click(await screen.findByText('Exportar tudo'))

    await vi.waitFor(() => expect(onExport).toHaveBeenCalledWith('csv', all, cols))
    // progress toast with a Cancel action, updated in place, then dismissed
    expect(toast.loading).toHaveBeenLastCalledWith(
      'Buscando registros para exportar: 3 de 3',
      expect.objectContaining({ id: 'progress', action: expect.objectContaining({ label: 'Cancelar' }) })
    )
    expect(toast.dismiss).toHaveBeenCalledWith('progress')
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('warns when the export was capped below the server total', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const onExport = vi.fn()
    render(
      <ExportMenu
        data={[]}
        columns={cols}
        formats={['csv']}
        onExport={onExport}
        loadAll={async () => ({ rows: [{ id: 1 }, { id: 2 }], total: 50 })}
      />
    )
    await openAll(user)
    await vi.waitFor(() => expect(onExport).toHaveBeenCalled())
    expect(toast.warning).toHaveBeenCalledWith(
      'Exportados os primeiros 2 de 50 registros (limite da exportação)'
    )
  })

  it('Cancel aborts the fetch: nothing is exported and no error is shown', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const onExport = vi.fn()
    const onExportError = vi.fn()
    const loadAll = ({ signal }: { signal: AbortSignal }) =>
      new Promise<{ rows: { id: number }[]; total: number }>((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')))
      })
    render(
      <ExportMenu
        data={[]}
        columns={cols}
        formats={['csv']}
        onExport={onExport}
        onExportError={onExportError}
        loadAll={loadAll}
      />
    )
    await openAll(user)
    const options = vi.mocked(toast.loading).mock.calls[0]?.[1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()

    await vi.waitFor(() => expect(toast.info).toHaveBeenCalledWith('Exportação cancelada'))
    expect(onExport).not.toHaveBeenCalled()
    expect(onExportError).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(screen.getByTestId('export-menu-trigger')).not.toBeDisabled()
  })

  it('a failing fetch shows the export error', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const onExportError = vi.fn()
    render(
      <ExportMenu
        data={[]}
        columns={cols}
        formats={['csv']}
        onExport={vi.fn()}
        onExportError={onExportError}
        loadAll={async () => {
          throw new Error('500')
        }}
      />
    )
    await openAll(user)
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao exportar dados'))
    expect(onExportError).toHaveBeenCalled()
    expect(toast.dismiss).toHaveBeenCalledWith('progress')
  })

  it('unmounting mid-fetch aborts it', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    let signal: AbortSignal | undefined
    const { unmount } = render(
      <ExportMenu
        data={[]}
        columns={cols}
        formats={['csv']}
        loadAll={ctx => {
          signal = ctx.signal
          return new Promise(() => {})
        }}
      />
    )
    await openAll(user)
    unmount()
    expect(signal?.aborted).toBe(true)
  })
})

describe('ExportMenu onServerExport (app-side export)', () => {
  const cols: ColumnDef<{ id: number }>[] = [{ header: 'ID', accessorKey: 'id' }]

  it('lists the formats only and hands the chosen one to the app, pending meanwhile', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    let finish!: () => void
    const onServerExport = vi.fn(() => new Promise<void>(res => (finish = res)))
    render(
      <ExportMenu data={[]} columns={cols} formats={['excel', 'csv']} onServerExport={onServerExport} />
    )
    await user.click(screen.getByTestId('export-menu-trigger'))
    expect(screen.queryByText('Exportar tudo')).not.toBeInTheDocument()
    await user.click(await screen.findByText('CSV (.csv)'))

    expect(onServerExport).toHaveBeenCalledWith('csv')
    await vi.waitFor(() => expect(screen.getByTestId('export-menu-trigger')).toBeDisabled())
    finish()
    await vi.waitFor(() => expect(screen.getByTestId('export-menu-trigger')).not.toBeDisabled())
    // the app owns the outcome: no library success toast
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('a rejected handler shows the export error', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(
      <ExportMenu
        data={[]}
        columns={cols}
        formats={['pdf']}
        onServerExport={() => Promise.reject(new Error('queue down'))}
      />
    )
    await user.click(screen.getByTestId('export-menu-trigger'))
    await user.click(await screen.findByText('PDF (.pdf)'))
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao exportar dados'))
  })
})
