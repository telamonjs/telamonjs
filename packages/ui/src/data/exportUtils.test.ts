import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'

const m = vi.hoisted(() => ({
  writeFile: vi.fn(),
  appendSheet: vi.fn(),
  save: vi.fn(),
  addImage: vi.fn(),
  text: vi.fn(),
  getImageProperties: vi.fn(() => ({ width: 200, height: 100 })),
  autoTable: vi.fn(),
}))

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: () => ({ '!ref': 'A1' }),
    decode_range: () => ({ s: { c: 0 }, e: { c: -1 } }),
    encode_cell: () => 'A1',
    book_new: () => ({}),
    book_append_sheet: m.appendSheet,
  },
  writeFile: m.writeFile,
}))
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

import { exportToExcel, exportToPDF } from './exportUtils'

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

describe('exportUtils', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.useRealTimers())

  describe('filename date', () => {
    it('appends the date once', () => {
      exportToPDF([{ a: 1 }], cols, 'x', base)
      expect(m.save).toHaveBeenCalledWith(`x_${TODAY}.pdf`)
    })
    it('uses the local calendar day, not the UTC one', () => {
      // 23:30 local on Oct 26 — in UTC-3 that is already Oct 27 in UTC
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 9, 26, 23, 30))
      exportToPDF([{ a: 1 }], cols, 'x', base)
      expect(m.save).toHaveBeenCalledWith('x_2026-10-26.pdf')
    })
    it('does not repeat a date already in the name', () => {
      exportToPDF([{ a: 1 }], cols, 'x_2026-01-02_2026-01-31', base)
      expect(m.save).toHaveBeenCalledWith('x_2026-01-02_2026-01-31.pdf')
    })
    it('appendDate:false keeps the name untouched', () => {
      exportToExcel([{ a: 1 }], cols, 'x', { ...base, appendDate: false })
      expect(m.writeFile).toHaveBeenCalledWith(expect.anything(), 'x.xlsx')
    })
  })

  describe('sheetName', () => {
    it('defaults to the i18n sheet name', () => {
      exportToExcel([{ a: 1 }], cols, 'x', base)
      expect(m.appendSheet).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'Dados')
    })
    it('uses the explicit sheetName', () => {
      exportToExcel([{ a: 1 }], cols, 'x', { ...base, sheetName: 'Clientes' })
      expect(m.appendSheet).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'Clientes')
    })
  })

  describe('logo', () => {
    it('keeps 30x15 for a string logo', () => {
      exportToPDF([{ a: 1 }], cols, 'x', { ...base, logo: 'data:l' })
      expect(m.addImage).toHaveBeenCalledWith('data:l', 'PNG', 14, 10, 30, 15)
    })
    it('uses explicit width and height', () => {
      exportToPDF([{ a: 1 }], cols, 'x', { ...base, logo: { src: 's', width: 40, height: 10 } })
      expect(m.addImage).toHaveBeenCalledWith('s', 'PNG', 14, 10, 40, 10)
    })
    it('keeps the aspect ratio when only the width is given', () => {
      exportToPDF([{ a: 1 }], cols, 'x', { ...base, logo: { src: 's', width: 40 } })
      expect(m.addImage).toHaveBeenCalledWith('s', 'PNG', 14, 10, 40, 20)
    })
    it('keeps the aspect ratio when only the height is given', () => {
      exportToPDF([{ a: 1 }], cols, 'x', { ...base, logo: { src: 's', height: 10 } })
      expect(m.addImage).toHaveBeenCalledWith('s', 'PNG', 14, 10, 20, 10)
    })
  })

  describe('footer and generatedAt', () => {
    it('draws the brand footer on the left', () => {
      exportToPDF([{ a: 1 }], cols, 'x', { ...base, footer: 'Marca' })
      drawPage()
      expect(m.text).toHaveBeenCalledWith('Marca', 14, 200)
    })
    it('omits the footer when not given', () => {
      exportToPDF([{ a: 1 }], cols, 'x', base)
      drawPage()
      expect(m.text.mock.calls.some(c => c[0] === 'Marca')).toBe(false)
    })
    it('stamps date and time by default, date only on request', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 2, 15, 4, 5))
      exportToPDF([{ a: 1 }], cols, 'x', base)
      drawPage()
      const stamp = (m.text.mock.calls.find(c => String(c[0]).startsWith('data.pdfGeneratedAt')) ?? [])[0]
      expect(stamp).toBe(`data.pdfGeneratedAt:${new Date().toLocaleString('pt-BR')}`)
      expect(stamp).toMatch(/15:04/)

      vi.clearAllMocks()
      exportToPDF([{ a: 1 }], cols, 'x', { ...base, generatedAt: 'date' })
      drawPage()
      const only = (m.text.mock.calls.find(c => String(c[0]).startsWith('data.pdfGeneratedAt')) ?? [])[0]
      expect(only).toBe(`data.pdfGeneratedAt:${new Date().toLocaleDateString('pt-BR')}`)
    })
  })
})
