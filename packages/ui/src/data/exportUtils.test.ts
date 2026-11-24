import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'

const m = vi.hoisted(() => ({
  writeXlsx: vi.fn(async () => new Uint8Array([1])),
  save: vi.fn(),
  addImage: vi.fn(),
  text: vi.fn(),
  getImageProperties: vi.fn(() => ({ width: 200, height: 100 })),
  autoTable: vi.fn(),
}))

vi.mock('./xlsx-writer', () => ({ writeXlsx: m.writeXlsx }))
vi.mock('jspdf-autotable', () => ({ default: m.autoTable }))
vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { width: 297, height: 210 } }
    addImage = m.addImage
    getImageProperties = m.getImageProperties
    text = m.text
    save = m.save
    setFontSize = vi.fn()
    setFont = vi.fn()
    setTextColor = vi.fn()
    getNumberOfPages = () => 1
  },
}))

import { exportToExcel, exportToPDF, exportToCSV, exportTableData } from './exportUtils'

const t = ((k: string, v?: Record<string, unknown>) =>
  k === 'data.sheetName' ? 'Dados' : `${k}${v?.date ? `:${v.date}` : ''}`) as never
const cols: ColumnDef<{ a: number }>[] = [{ header: 'A', accessorKey: 'a' }]
const base = { t, locale: 'pt-BR' }
const hoje = new Date()
const TODAY = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

/** Runs the autoTable didDrawPage hook so footer texts are emitted. */
function drawPage() {
  const opts = m.autoTable.mock.calls[0][1] as { didDrawPage: (d: { pageNumber: number }) => void }
  opts.didDrawPage({ pageNumber: 1 })
}

/** What the temporary download link received: filename and blob. */
function captureDownloads() {
  const blobs: Blob[] = []
  const names: string[] = []
  // jsdom has no object URLs; left in place so the deferred revoke still finds one
  Object.assign(URL, { createObjectURL: (b: Blob) => (blobs.push(b), 'blob:x'), revokeObjectURL: () => {} })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.getAttribute('download') ?? '')
  })
  return { blobs, names }
}

/** The text of a Blob, BOM included (jsdom's Blob has no text()). */
function readBlob(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve(new TextDecoder('utf-8', { ignoreBOM: true }).decode(reader.result as ArrayBuffer))
    reader.readAsArrayBuffer(blob)
  })
}

describe('exportUtils', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('filename date', () => {
    it('appends the date once', async () => {
      await exportToPDF([{ a: 1 }], cols, 'x', base)
      expect(m.save).toHaveBeenCalledWith(`x_${TODAY}.pdf`)
    })
    it('uses the local calendar day, not the UTC one', async () => {
      // 23:30 local on Oct 26 — in UTC-3 that is already Oct 27 in UTC
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 9, 26, 23, 30))
      await exportToPDF([{ a: 1 }], cols, 'x', base)
      expect(m.save).toHaveBeenCalledWith('x_2026-10-26.pdf')
    })
    it('does not repeat a date already in the name', async () => {
      await exportToPDF([{ a: 1 }], cols, 'x_2026-01-02_2026-01-31', base)
      expect(m.save).toHaveBeenCalledWith('x_2026-01-02_2026-01-31.pdf')
    })
    it('appendDate:false keeps the name untouched', async () => {
      const { names } = captureDownloads()
      await exportToExcel([{ a: 1 }], cols, 'x', { ...base, appendDate: false })
      expect(names).toEqual(['x.xlsx'])
    })
  })

  describe('sheetName', () => {
    it('defaults to the i18n sheet name', async () => {
      captureDownloads()
      await exportToExcel([{ a: 1 }], cols, 'x', base)
      expect(m.writeXlsx).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dados' }))
    })
    it('uses the explicit sheetName', async () => {
      captureDownloads()
      await exportToExcel([{ a: 1 }], cols, 'x', { ...base, sheetName: 'Clientes' })
      expect(m.writeXlsx).toHaveBeenCalledWith(expect.objectContaining({ name: 'Clientes' }))
    })
  })

  describe('excel', () => {
    it('passes headers, formatted rows and 10–50 char widths, and downloads an .xlsx blob', async () => {
      const { blobs, names } = captureDownloads()
      type Row = { name: string; active: boolean; bio: string; n: number }
      const columns: ColumnDef<Row>[] = [
        { id: 'select' },
        { header: 'Name', accessorKey: 'name' },
        { header: 'Active', accessorKey: 'active' },
        { header: 'Bio', accessorKey: 'bio' },
        { header: 'N', accessorKey: 'n' },
      ]
      await exportToExcel([{ name: 'Ana', active: true, bio: 'x'.repeat(80), n: 7 }], columns, 'x', base)
      expect(m.writeXlsx).toHaveBeenCalledWith({
        name: 'Dados',
        headers: ['Name', 'Active', 'Bio', 'N'],
        rows: [['Ana', 'common.yes', 'x'.repeat(80), 7]],
        widths: [10, 10, 50, 10],
      })
      expect(blobs[0]?.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(names).toEqual([`x_${TODAY}.xlsx`])
    })
  })

  describe('csv', () => {
    it('writes a BOM, CRLF lines and RFC 4180 quoting, one column per header', async () => {
      const { blobs, names } = captureDownloads()
      type Row = { a: string; b: string | null }
      const columns: ColumnDef<Row>[] = [
        { header: 'Same', accessorKey: 'a' },
        { header: 'Same', accessorKey: 'b' },
      ]
      exportToCSV([{ a: 'say "hi", ok', b: null }, { a: ' pad', b: 'l1\nl2' }], columns, 'x', base)
      expect(names).toEqual([`x_${TODAY}.csv`])
      expect(await readBlob(blobs[0] as Blob)).toBe(
        '\uFEFFSame,Same\r\n"say ""hi"", ok",\r\n" pad","l1\nl2"'
      )
    })
  })

  describe('exportTableData', () => {
    it('routes to the format and resolves after it', async () => {
      const { names } = captureDownloads()
      await exportTableData([{ a: 1 }], cols, 'excel', 'x', base)
      await exportTableData([{ a: 1 }], cols, 'csv', 'x', base)
      await exportTableData([{ a: 1 }], cols, 'pdf', 'x', base)
      expect(names).toEqual([`x_${TODAY}.xlsx`, `x_${TODAY}.csv`])
      expect(m.save).toHaveBeenCalledWith(`x_${TODAY}.pdf`)
    })
  })

  describe('logo', () => {
    it('keeps 30x15 for a string logo', async () => {
      await exportToPDF([{ a: 1 }], cols, 'x', { ...base, logo: 'data:l' })
      expect(m.addImage).toHaveBeenCalledWith('data:l', 'PNG', 14, 10, 30, 15)
    })
    it('uses explicit width and height', async () => {
      await exportToPDF([{ a: 1 }], cols, 'x', { ...base, logo: { src: 's', width: 40, height: 10 } })
      expect(m.addImage).toHaveBeenCalledWith('s', 'PNG', 14, 10, 40, 10)
    })
    it('keeps the aspect ratio when only the width is given', async () => {
      await exportToPDF([{ a: 1 }], cols, 'x', { ...base, logo: { src: 's', width: 40 } })
      expect(m.addImage).toHaveBeenCalledWith('s', 'PNG', 14, 10, 40, 20)
    })
    it('keeps the aspect ratio when only the height is given', async () => {
      await exportToPDF([{ a: 1 }], cols, 'x', { ...base, logo: { src: 's', height: 10 } })
      expect(m.addImage).toHaveBeenCalledWith('s', 'PNG', 14, 10, 20, 10)
    })
  })

  describe('footer and generatedAt', () => {
    it('draws the brand footer on the left', async () => {
      await exportToPDF([{ a: 1 }], cols, 'x', { ...base, footer: 'Marca' })
      drawPage()
      expect(m.text).toHaveBeenCalledWith('Marca', 14, 200)
    })
    it('omits the footer when not given', async () => {
      await exportToPDF([{ a: 1 }], cols, 'x', base)
      drawPage()
      expect(m.text.mock.calls.some(c => c[0] === 'Marca')).toBe(false)
    })
    it('stamps date and time by default, date only on request', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 2, 15, 4, 5))
      await exportToPDF([{ a: 1 }], cols, 'x', base)
      drawPage()
      const stamp = (m.text.mock.calls.find(c => String(c[0]).startsWith('data.pdfGeneratedAt')) ?? [])[0]
      expect(stamp).toBe(`data.pdfGeneratedAt:${new Date().toLocaleString('pt-BR')}`)
      expect(stamp).toMatch(/15:04/)

      vi.clearAllMocks()
      await exportToPDF([{ a: 1 }], cols, 'x', { ...base, generatedAt: 'date' })
      drawPage()
      const only = (m.text.mock.calls.find(c => String(c[0]).startsWith('data.pdfGeneratedAt')) ?? [])[0]
      expect(only).toBe(`data.pdfGeneratedAt:${new Date().toLocaleDateString('pt-BR')}`)
    })
  })
})
