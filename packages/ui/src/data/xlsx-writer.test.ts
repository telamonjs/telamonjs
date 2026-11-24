import { describe, it, expect, afterEach, vi } from 'vitest'
import { inflateRawSync, crc32 } from 'node:zlib'
import { writeXlsx, sanitizeSheetName } from './xlsx-writer'

/** Reads a zip through its central directory, checking every CRC. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = bytes.length - 22
  expect(view.getUint32(end, true)).toBe(0x06054b50)
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const files = new Map<string, string>()
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50)
    const method = view.getUint16(at + 10, true)
    const crc = view.getUint32(at + 16, true)
    const size = view.getUint32(at + 20, true)
    const nameLength = view.getUint16(at + 28, true)
    const local = view.getUint32(at + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength))
    const start = local + 30 + view.getUint16(local + 26, true)
    const data = bytes.subarray(start, start + size)
    const raw = method === 8 ? new Uint8Array(inflateRawSync(data)) : data
    expect(crc32(raw)).toBe(crc)
    files.set(name, new TextDecoder().decode(raw))
    at += 46 + nameLength
  }
  return files
}

const sheet = {
  name: 'Clientes',
  headers: ['Nome', 'Idade'],
  rows: [
    ['Ana & <Bia>', 30],
    ['', 4.5],
  ],
  widths: [12, 10],
}

describe('writeXlsx', () => {
  afterEach(() => vi.unstubAllGlobals())

  describe('Rendering', () => {
    it('writes the OOXML parts of a one-sheet workbook, deflated', async () => {
      const bytes = await writeXlsx(sheet)
      expect(new DataView(bytes.buffer).getUint16(8, true)).toBe(8) // method: deflate
      const files = unzip(bytes)
      expect([...files.keys()]).toEqual([
        '[Content_Types].xml',
        '_rels/.rels',
        'xl/workbook.xml',
        'xl/_rels/workbook.xml.rels',
        'xl/styles.xml',
        'xl/worksheets/sheet1.xml',
      ])
      expect(files.get('xl/workbook.xml')).toContain('<sheet name="Clientes" sheetId="1" r:id="rId1"/>')
    })

    it('styles the header row bold on a gray fill', async () => {
      const files = unzip(await writeXlsx(sheet))
      const xml = files.get('xl/worksheets/sheet1.xml') ?? ''
      expect(xml).toContain('<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Nome</t></is></c>')
      expect(files.get('xl/styles.xml')).toMatch(/<font><b\/>.*fontId="1" fillId="2"/)
    })

    it('keeps numbers numeric, escapes text and skips empty cells', async () => {
      const xml = unzip(await writeXlsx(sheet)).get('xl/worksheets/sheet1.xml') ?? ''
      expect(xml).toContain('<c r="B2"><v>30</v></c>')
      expect(xml).toContain('Ana &amp; &lt;Bia&gt;')
      expect(xml).toContain('<row r="3"><c r="B3"><v>4.5</v></c></row>')
    })

    it('writes the column widths', async () => {
      const xml = unzip(await writeXlsx(sheet)).get('xl/worksheets/sheet1.xml') ?? ''
      expect(xml).toContain('<cols><col min="1" max="1" width="13" customWidth="1"/>')
    })
  })

  describe('Edge Cases', () => {
    it('names columns past Z (AA, AB…)', async () => {
      const headers = Array.from({ length: 28 }, (_, i) => `h${i}`)
      const xml = unzip(await writeXlsx({ name: 's', headers, rows: [] })).get('xl/worksheets/sheet1.xml') ?? ''
      expect(xml).toContain('r="Z1"')
      expect(xml).toContain('r="AB1"')
      expect(xml).not.toContain('<cols>')
    })

    it('strips control characters XML cannot hold and caps a cell at 32767 chars', async () => {
      const xml =
        unzip(await writeXlsx({ name: 's', headers: ['a\u0001b'], rows: [['x'.repeat(40000)]] })).get(
          'xl/worksheets/sheet1.xml'
        ) ?? ''
      expect(xml).toContain('>ab</t>')
      expect(xml).toContain(`>${'x'.repeat(32767)}</t>`)
      expect(xml).not.toContain('x'.repeat(32768))
    })

    it('writes NaN and Infinity as text', async () => {
      const xml = unzip(await writeXlsx({ name: 's', headers: ['n'], rows: [[NaN]] })).get('xl/worksheets/sheet1.xml') ?? ''
      expect(xml).toContain('<t xml:space="preserve">NaN</t>')
    })

    it('stores entries uncompressed where CompressionStream is unavailable', async () => {
      vi.stubGlobal('CompressionStream', undefined)
      const bytes = await writeXlsx(sheet)
      expect(new DataView(bytes.buffer).getUint16(8, true)).toBe(0) // method: stored
      expect(unzip(bytes).get('xl/workbook.xml')).toContain('Clientes')
    })
  })

  describe('sanitizeSheetName', () => {
    it('applies the Excel rules', () => {
      expect(sanitizeSheetName('Q1/Q2: [vendas]')).toBe('Q1 Q2   vendas')
      expect(sanitizeSheetName('x'.repeat(40))).toHaveLength(31)
      expect(sanitizeSheetName("'quoted'")).toBe('quoted')
      expect(sanitizeSheetName(' ?* ')).toBe('Sheet1')
    })
  })
})
