/**
 * Export Utilities for DataTable
 *
 * Provides functions to export table data to Excel, CSV, and PDF formats
 * with proper formatting and encoding.
 */

import Papa from 'papaparse'
const unparseCsv = Papa.unparse
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ColumnDef } from '@tanstack/react-table'
import { logger } from '../utils/logger'
import type { useTelamonjsT } from '../i18n/use-t'
import { getColumnLabel } from './column-label'
import { writeXlsx } from './xlsx-writer'

export interface ExportOptions {
  includeHiddenColumns?: boolean
  filename?: string
  /** Excel sheet name. Default: localized "Data" (`data.sheetName`). */
  sheetName?: string
  /**
   * Append `_YYYY-MM-DD` to the filename (default `true`). Never doubled: skipped when
   * the filename already ends with a date.
   */
  appendDate?: boolean
  /** i18n translator (telamonjs.*) — required, no pt-BR literal fallback. */
  t: ReturnType<typeof useTelamonjsT>
  /** Active locale (e.g. from `useLocale()`), used to format exported cell values (dates). */
  locale: string
}

/** Logo as a data URL/URL string, or with size in mm (one side only keeps the aspect ratio). */
export type PDFLogo = string | { src: string; width?: number; height?: number }

export interface PDFExportOptions extends ExportOptions {
  orientation?: 'portrait' | 'landscape'
  logo?: PDFLogo
  /** Brand text drawn at the bottom-left of every page. */
  footer?: string
  /** "Generated at" stamp: locale date + time (default) or date only. */
  generatedAt?: 'datetime' | 'date'
  title?: string
  subtitle?: string
}

/** `name_YYYY-MM-DD.ext`, with the date added at most once. */
function buildFilename(name: string, ext: string, appendDate = true): string {
  const dated = appendDate && !/\d{4}-\d{2}-\d{2}$/.test(name)
  // Local calendar day: toISOString() is UTC and after 21:00 in Brazil
  // stamped tomorrow's date on the file.
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${dated ? `${name}_${date}` : name}.${ext}`
}

/** Saves `blob` as `filename` through a temporary link. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url))
}

/**
 * Get column header text from ColumnDef
 */
function getColumnHeader<T>(column: ColumnDef<T>): string {
  // string header, else meta.label, else id
  return getColumnLabel(column) ?? column.id ?? 'Column'
}

/**
 * Get cell value from row data
 */
function getCellValue<T>(row: T, column: ColumnDef<T>): unknown {
  const accessorKey = (column as { accessorKey?: string }).accessorKey

  if (accessorKey) {
    // Handle nested keys (e.g., 'user.name')
    const keys = accessorKey.split('.')
    let value: unknown = row
    for (const key of keys) {
      value = (value as Record<string, unknown> | undefined)?.[key]
    }
    return value
  }

  // If there's an accessorFn, use it
  const accessorFn = (column as { accessorFn?: (row: T) => unknown }).accessorFn
  if (accessorFn) {
    return accessorFn(row)
  }

  return ''
}

/**
 * Format value for export (convert dates, booleans, etc.)
 */
function formatValueForExport(
  value: unknown,
  t: ReturnType<typeof useTelamonjsT>,
  locale: string
): string | number | boolean {
  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Date) {
    return value.toLocaleString(locale)
  }

  if (typeof value === 'boolean') {
    return value ? t('common.yes') : t('common.no')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return value as string | number | boolean
}

/**
 * Filter exportable columns (exclude actions, select, expand, etc.)
 */
function getExportableColumns<T>(
  columns: ColumnDef<T>[],
  includeHiddenColumns = false
): ColumnDef<T>[] {
  return columns.filter(column => {
    // Skip special columns
    if (
      column.id === 'actions' ||
      column.id === 'select' ||
      column.id === 'expand'
    ) {
      return false
    }

    // Skip columns that explicitly disable export
    const enableExport = (column as { enableExport?: boolean }).enableExport
    if (enableExport === false) {
      return false
    }

    // Skip hidden columns unless includeHiddenColumns is true
    const enableHiding = (column as { enableHiding?: boolean }).enableHiding
    if (!includeHiddenColumns && enableHiding === false) {
      return false
    }

    return true
  })
}

/**
 * Export data to Excel format (.xlsx)
 *
 * Features:
 * - Keeps numbers as numeric cells
 * - Bold, shaded header row
 * - Auto-sized columns (10–50 characters)
 * - No dependency: the workbook is written in-house (see `xlsx-writer`)
 *
 * Resolves once the download has been triggered.
 *
 * @example
 * await exportToExcel(data, columns, 'clientes', { t, locale, sheetName: 'Clientes 2025' })
 */
export async function exportToExcel<T>(
  data: T[],
  columns: ColumnDef<T>[],
  filename: string = 'export',
  options: ExportOptions
): Promise<void> {
  const { includeHiddenColumns = false, sheetName, appendDate, t, locale } = options

  const exportColumns = getExportableColumns(columns, includeHiddenColumns)
  const headers = exportColumns.map(col => getColumnHeader(col))
  const rows = data.map(row =>
    exportColumns.map(col => formatValueForExport(getCellValue(row, col), t, locale))
  )

  // Auto-size columns
  const widths = headers.map((header, idx) => {
    const maxDataLength = Math.max(
      ...rows.map(row => String(row[idx] || '').length),
      10 // Minimum width
    )
    return Math.min(Math.max(header.length, maxDataLength), 50) // Max 50 chars
  })

  const bytes = await writeXlsx({
    name: sheetName ?? t('data.sheetName'),
    headers,
    rows,
    widths,
  })
  downloadBlob(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    buildFilename(filename, 'xlsx', appendDate)
  )
}

/**
 * Export data to CSV format with UTF-8 BOM (Excel compatibility)
 *
 * Features:
 * - UTF-8 BOM for proper Excel encoding
 * - Escapes commas and quotes
 * - Handles special characters
 *
 * @example
 * exportToCSV(data, columns, 'clientes', { t, locale })
 */
export function exportToCSV<T>(
  data: T[],
  columns: ColumnDef<T>[],
  filename: string = 'export',
  options: ExportOptions
): void {
  const { includeHiddenColumns = false, appendDate, t, locale } = options

  // Filter exportable columns
  const exportColumns = getExportableColumns(columns, includeHiddenColumns)

  // Prepare data for export
  const headers = exportColumns.map(col => getColumnHeader(col))
  const rows = data.map(row =>
    exportColumns.reduce(
      (acc, col) => {
        const header = getColumnHeader(col)
        acc[header] = formatValueForExport(getCellValue(row, col), t, locale)
        return acc
      },
      {} as Record<string, unknown>
    )
  )

  // Generate CSV
  const csv = unparseCsv(rows, {
    columns: headers,
    delimiter: ',',
    header: true,
    skipEmptyLines: true,
  })

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  const csvWithBOM = BOM + csv

  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', buildFilename(filename, 'csv', appendDate))
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export data to PDF format
 *
 * Features:
 * - Landscape or portrait orientation
 * - Auto page breaks
 * - Header on all pages
 * - Formatted cells
 * - Optional logo and title
 *
 * @example
 * exportToPDF(data, columns, 'customers', {
 *   t,
 *   locale,
 *   orientation: 'landscape',
 *   logo: '/logo.png',
 *   title: 'Customer Report',
 *   subtitle: 'January 2025'
 * })
 */
export function exportToPDF<T>(
  data: T[],
  columns: ColumnDef<T>[],
  filename: string = 'export',
  options: PDFExportOptions
): void {
  const {
    includeHiddenColumns = false,
    orientation = 'landscape',
    logo,
    footer,
    generatedAt = 'datetime',
    appendDate,
    title,
    subtitle,
    t,
    locale,
  } = options

  // Filter exportable columns
  const exportColumns = getExportableColumns(columns, includeHiddenColumns)

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  // Add logo if provided
  let startY = 20
  if (logo) {
    try {
      const src = typeof logo === 'string' ? logo : logo.src
      let w = typeof logo === 'string' ? undefined : logo.width
      let h = typeof logo === 'string' ? undefined : logo.height
      if (w === undefined && h === undefined) {
        w = 30
        h = 15
      } else if (w === undefined || h === undefined) {
        const { width: pw, height: ph } = doc.getImageProperties(src)
        if (w === undefined) w = ((h as number) * pw) / ph
        else h = (w * ph) / pw
      }
      doc.addImage(src, 'PNG', 14, 10, w as number, h as number)
      startY = Math.max(30, 15 + (h as number))
    } catch (error) {
      logger.warn('Failed to add logo to PDF', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  // Add title and subtitle
  if (title) {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, startY)
    startY += 7
  }

  if (subtitle) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(subtitle, 14, startY)
    startY += 10
  } else if (title) {
    startY += 5
  }

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Prepare table data
  const headers = exportColumns.map(col => getColumnHeader(col))
  const rows = data.map(row =>
    exportColumns.map(col =>
      String(formatValueForExport(getCellValue(row, col), t, locale))
    )
  )

  // Generate table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'left',
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Light gray
    },
    margin: { top: 10, right: 14, bottom: 10, left: 14 },
    didDrawPage: data => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages()
      const pageNumber = data.pageNumber

      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(
        t('data.pdfPageOf', { page: pageNumber, total: pageCount }),
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )

      if (footer) {
        doc.text(footer, 14, doc.internal.pageSize.height - 10)
      }

      // Date footer
      const now = new Date()
      const dateStr =
        generatedAt === 'date' ? now.toLocaleDateString(locale) : now.toLocaleString(locale)
      doc.text(
        t('data.pdfGeneratedAt', { date: dateStr }),
        doc.internal.pageSize.width - 14,
        doc.internal.pageSize.height - 10,
        { align: 'right' }
      )
    },
  })

  // Download PDF
  doc.save(buildFilename(filename, 'pdf', appendDate))
}

/**
 * Detect and export based on current table state
 * Helper function that respects filters and sorting
 */
export async function exportTableData<T>(
  data: T[],
  columns: ColumnDef<T>[],
  format: 'excel' | 'csv' | 'pdf',
  filename: string = 'export',
  options: ExportOptions | PDFExportOptions
): Promise<void> {
  switch (format) {
    case 'excel':
      return exportToExcel(data, columns, filename, options)
    case 'csv':
      return exportToCSV(data, columns, filename, options)
    case 'pdf':
      return exportToPDF(data, columns, filename, options as PDFExportOptions)
    default:
      logger.error(`Unknown export format: ${format}`)
  }
}
