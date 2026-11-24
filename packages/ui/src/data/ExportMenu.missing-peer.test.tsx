import { describe, it, expect, vi } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { render, screen } from '../test/test-utils'
import { ExportMenu } from './ExportMenu'
import { MissingPeerError } from './missing-peer'

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))
// The app did not install the PDF peers
vi.mock('./exportUtils', async () => {
  const { MissingPeerError: Missing } = await import('./missing-peer')
  return {
    exportToExcel: vi.fn(),
    exportToCSV: vi.fn(),
    exportToPDF: vi.fn().mockRejectedValue(new Missing(['jspdf', 'jspdf-autotable'])),
  }
})

describe('ExportMenu without an optional peer', () => {
  it('names the missing packages in the error toast and reports the error', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const onExportError = vi.fn()
    const cols: ColumnDef<{ id: number }>[] = [{ header: 'ID', accessorKey: 'id' }]
    const user = userEvent.setup()
    render(<ExportMenu data={[{ id: 1 }]} columns={cols} formats={['pdf']} onExportError={onExportError} />)
    await user.click(screen.getByTestId('export-menu-trigger'))
    await user.click(await screen.findByText('PDF (.pdf)'))
    await user.click(await screen.findByText('Exportar tudo'))
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Esta exportação precisa de pacotes que o app não instalou: jspdf, jspdf-autotable'
      )
    )
    expect(onExportError.mock.calls[0]?.[0]).toBeInstanceOf(MissingPeerError)
  })
})
