/**
 * Minimal XLSX writer: one worksheet, inline strings and numbers, a bold
 * shaded header row and column widths — everything `exportToExcel` needs.
 *
 * Replaces the `xlsx` (SheetJS) peer: npm only carries SheetJS 0.18.5, flagged
 * by CVE-2023-30533 and CVE-2024-22363, and the fixed builds live outside the
 * registry. Writing the OOXML parts ourselves costs no dependency at all; the
 * zip is compressed with the platform's `CompressionStream` and falls back to
 * stored entries where that API is missing.
 */

export type XlsxCell = string | number | boolean

export interface XlsxSheet {
  /** Sanitized to Excel's rules (31 chars, no `\ / ? * [ ] :`). */
  name: string
  /** Rendered bold on a light gray fill. */
  headers: string[]
  rows: XlsxCell[][]
  /** Column widths in characters, by column index. */
  widths?: number[]
}

/** Excel's limit for one cell. */
const MAX_CELL_LENGTH = 32767
const NS = 'http://schemas.openxmlformats.org'
const REL = `${NS}/officeDocument/2006/relationships`
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// eslint-disable-next-line no-control-regex -- strips the control chars XML 1.0 forbids
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Excel sheet-name rules; `Sheet1` when nothing usable is left. */
export function sanitizeSheetName(name: string): string {
  const clean = name
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim()
    .slice(0, 31)
    .replace(/^'+|'+$/g, '')
    .trim()
  return clean || 'Sheet1'
}

/** 0 → A, 25 → Z, 26 → AA */
function columnName(index: number): string {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

function cellXml(value: XlsxCell, ref: string, style: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${style}><v>${value}</v></c>`
  }
  const text = String(value).slice(0, MAX_CELL_LENGTH)
  if (text === '') return ''
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`
}

function sheetXml({ headers, rows, widths }: XlsxSheet): string {
  const cols = widths?.length
    ? `<cols>${widths
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w + 1}" customWidth="1"/>`)
        .join('')}</cols>`
    : ''
  const rowXml = (cells: XlsxCell[], r: number, style: string) =>
    `<row r="${r}">${cells.map((v, c) => cellXml(v, `${columnName(c)}${r}`, style)).join('')}</row>`
  const body = [rowXml(headers, 1, ' s="1"'), ...rows.map((row, i) => rowXml(row, i + 2, ''))]
  return `${XML_HEAD}<worksheet xmlns="${NS}/spreadsheetml/2006/main">${cols}<sheetData>${body.join('')}</sheetData></worksheet>`
}

const STYLES = `${XML_HEAD}<styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

function parts(sheet: XlsxSheet): [string, string][] {
  const ct = 'application/vnd.openxmlformats'
  return [
    [
      '[Content_Types].xml',
      `${XML_HEAD}<Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="${ct}-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${ct}-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${ct}-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${ct}-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    [
      '_rels/.rels',
      `${XML_HEAD}<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      'xl/workbook.xml',
      `${XML_HEAD}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${REL}"><sheets><sheet name="${escapeXml(sanitizeSheetName(sheet.name))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    [
      'xl/_rels/workbook.xml.rels',
      `${XML_HEAD}<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    ],
    ['xl/styles.xml', STYLES],
    ['xl/worksheets/sheet1.xml', sheetXml(sheet)],
  ]
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Raw DEFLATE via the platform; `null` where `CompressionStream` is unavailable. */
async function deflateRaw(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    const stream = new CompressionStream('deflate-raw')
    const writer = stream.writable.getWriter()
    const [buffer] = await Promise.all([
      new Response(stream.readable).arrayBuffer(),
      writer.write(data).then(() => writer.close()),
    ])
    return new Uint8Array(buffer)
  } catch {
    return null
  }
}

/** A zip archive (stored or deflated entries, fixed 1980-01-01 timestamps). */
async function zip(files: [string, string][]): Promise<Uint8Array<ArrayBuffer>> {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const [path, content] of files) {
    const name = encoder.encode(path)
    const raw = encoder.encode(content)
    const deflated = await deflateRaw(raw)
    const data = deflated && deflated.length < raw.length ? deflated : raw
    const method = data === raw ? 0 : 8
    const crc = crc32(raw)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // version needed
    local.setUint16(8, method, true)
    local.setUint16(12, 0x21, true) // date: 1980-01-01
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, raw.length, true)
    local.setUint16(26, name.length, true)

    const dir = new DataView(new ArrayBuffer(46))
    dir.setUint32(0, 0x02014b50, true)
    dir.setUint16(4, 20, true) // version made by
    dir.setUint16(6, 20, true) // version needed
    dir.setUint16(10, method, true)
    dir.setUint16(14, 0x21, true)
    dir.setUint32(16, crc, true)
    dir.setUint32(20, data.length, true)
    dir.setUint32(24, raw.length, true)
    dir.setUint16(28, name.length, true)
    dir.setUint32(42, offset, true)

    chunks.push(new Uint8Array(local.buffer), name, data)
    central.push(new Uint8Array(dir.buffer), name)
    offset += 30 + name.length + data.length
  }

  const centralSize = central.reduce((sum, c) => sum + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  const all = [...chunks, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((sum, c) => sum + c.length, 0))
  let at = 0
  for (const c of all) {
    out.set(c, at)
    at += c.length
  }
  return out
}

/** The bytes of a single-sheet `.xlsx` workbook. */
export function writeXlsx(sheet: XlsxSheet): Promise<Uint8Array<ArrayBuffer>> {
  return zip(parts(sheet))
}
