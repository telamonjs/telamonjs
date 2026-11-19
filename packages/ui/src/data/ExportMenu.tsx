/**
 * ExportMenu Component
 *
 * Dropdown menu for exporting table data to Excel, CSV, or PDF
 * with options to export all data, selected rows, or current page.
 */

'use client'

import { useState, type ReactNode } from 'react'
import { useLocale } from 'next-intl'
import { logger } from '../utils/logger'
import { useTelamonjsT } from '../i18n/use-t'
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileImage,
  Loader2,
} from 'lucide-react'
import { Button } from '../ui/button'
import { useHoverPopover } from '../hooks/use-hover-popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '../ui/dropdown-menu'
import { ColumnDef } from '@tanstack/react-table'
// Type-only: exportUtils pulls xlsx/jspdf/papaparse, loaded on demand in handleExport
import type { PDFExportOptions } from './exportUtils'
import { toast } from 'sonner'

export interface ExportMenuProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  selectedRows?: T[]
  currentPageRows?: T[]
  filename?: string
  formats?: Array<'excel' | 'csv' | 'pdf'>
  /** Excel sheet name (default: localized "Data"). */
  sheetName?: string
  /** Append `_YYYY-MM-DD` to the filename, once (default `true`). */
  appendDate?: boolean
  pdfOptions?: Omit<
    PDFExportOptions,
    'filename' | 't' | 'locale' | 'sheetName' | 'appendDate'
  >
  /**
   * Custom generator: when present the menu only orchestrates (loading state, toast,
   * callbacks) and the built-in Excel/CSV/PDF generation is skipped.
   */
  onExport?: (
    format: 'excel' | 'csv' | 'pdf',
    rows: T[],
    columns: ColumnDef<T>[]
  ) => Promise<void> | void
  onExportStart?: () => void
  onExportComplete?: () => void
  onExportError?: (error: Error) => void
  disabled?: boolean
  className?: string
  /**
   * Custom trigger (e.g. a "⋯" icon button) — the menu becomes the list's
   * actions menu. Must forward ref/props (asChild).
   */
  trigger?: ReactNode
  /** Extra items above the export section (e.g. "Refresh") */
  children?: ReactNode
}

export function ExportMenu<T>({
  data,
  columns,
  selectedRows = [],
  currentPageRows = [],
  filename = 'export',
  formats = ['excel', 'csv', 'pdf'],
  sheetName,
  appendDate,
  pdfOptions = {},
  onExport,
  onExportStart,
  onExportComplete,
  onExportError,
  disabled = false,
  className,
  trigger,
  children,
}: ExportMenuProps<T>) {
  const t = useTelamonjsT()
  const locale = useLocale()
  const [isExporting, setIsExporting] = useState(false)
  // opens on hover like the other toolbar dropdowns
  const { open, setOpen, triggerProps, contentProps } = useHoverPopover({
    disabled: disabled || isExporting
  })

  const handleExport = async (
    format: 'excel' | 'csv' | 'pdf',
    scope: 'all' | 'selected' | 'page'
  ) => {
    try {
      setIsExporting(true)
      onExportStart?.()

      // Determine which data to export
      let dataToExport: T[] = data
      let scopeLabel = t('data.scopeAll')

      switch (scope) {
        case 'selected':
          if (selectedRows.length === 0) {
            toast.error(t('data.noRowsSelected'))
            return
          }
          dataToExport = selectedRows
          scopeLabel = t('data.scopeSelected', { count: selectedRows.length })
          break
        case 'page':
          if (currentPageRows.length === 0) {
            toast.error(t('data.noDataCurrentPage'))
            return
          }
          dataToExport = currentPageRows
          scopeLabel = t('data.scopeCurrentPage')
          break
        case 'all':
        default:
          dataToExport = data
          scopeLabel = t('data.scopeAll')
          break
      }

      if (dataToExport.length === 0) {
        toast.error(t('data.noDataToExport'))
        return
      }

      const label = { excel: 'Excel', csv: 'CSV', pdf: 'PDF' }[format]

      if (onExport) {
        await onExport(format, dataToExport, columns)
        toast.success(
          t('data.exportSuccess', { format: label, scope: scopeLabel })
        )
        onExportComplete?.()
        return
      }

      // Load the heavy export stack only when the user actually exports
      const { exportToExcel, exportToCSV, exportToPDF } = await import(
        './exportUtils'
      )

      // exportUtils appends the date to the filename (once)
      const common = { includeHiddenColumns: false, appendDate, t, locale }
      switch (format) {
        case 'excel':
          exportToExcel(dataToExport, columns, filename, {
            ...common,
            sheetName,
          })
          break
        case 'csv':
          exportToCSV(dataToExport, columns, filename, common)
          break
        case 'pdf':
          exportToPDF(dataToExport, columns, filename, {
            ...common,
            ...pdfOptions,
            orientation: pdfOptions.orientation || 'landscape',
          })
          break
      }
      toast.success(
        t('data.exportSuccess', { format: label, scope: scopeLabel })
      )

      onExportComplete?.()
    } catch (error) {
      logger.error('Export error', {
        error: error instanceof Error ? error : String(error),
      })
      toast.error(t('data.exportError'))
      onExportError?.(error as Error)
    } finally {
      setIsExporting(false)
    }
  }

  const getFormatIcon = (format: 'excel' | 'csv' | 'pdf') => {
    switch (format) {
      case 'excel':
        return <FileSpreadsheet className='h-4 w-4 text-green-600' />
      case 'csv':
        return <FileText className='h-4 w-4 text-blue-600' />
      case 'pdf':
        return <FileImage className='h-4 w-4 text-red-600' />
    }
  }

  const getFormatLabel = (format: 'excel' | 'csv' | 'pdf') => {
    switch (format) {
      case 'excel':
        return t('data.excelFormat')
      case 'csv':
        return t('data.csvFormat')
      case 'pdf':
        return t('data.pdfFormat')
    }
  }

  const hasSelectedRows = selectedRows.length > 0
  const hasCurrentPageRows = currentPageRows.length > 0

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild {...triggerProps}>
        {trigger ?? (
          <Button
            variant='outline'
            size='sm'
            className={className}
            disabled={disabled || isExporting}
            data-testid='export-menu-trigger'
          >
            {isExporting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Download className='h-4 w-4' />
            )}
            <span className='ml-1.5'>{t('data.export')}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56' {...contentProps}>
        {children && (
          <>
            {children}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>{t('data.exportFormatLabel')}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {formats.map(format => (
          <DropdownMenuSub key={format}>
            <DropdownMenuSubTrigger>
              {getFormatIcon(format)}
              <span className='ml-2'>{getFormatLabel(format)}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent {...contentProps}>
              <DropdownMenuItem
                onClick={() => handleExport(format, 'all')}
                disabled={isExporting}
              >
                <span className='text-sm'>{t('data.exportAll')}</span>
                {data.length > 0 && (
                  <span className='ml-auto text-xs text-muted-foreground'>
                    {t('data.recordCount', { count: data.length })}
                  </span>
                )}
              </DropdownMenuItem>

              {hasSelectedRows && (
                <DropdownMenuItem
                  onClick={() => handleExport(format, 'selected')}
                  disabled={isExporting}
                >
                  <span className='text-sm'>{t('data.exportSelected')}</span>
                  <span className='ml-auto text-xs text-muted-foreground'>
                    {t('data.recordCount', { count: selectedRows.length })}
                  </span>
                </DropdownMenuItem>
              )}

              {hasCurrentPageRows && (
                <DropdownMenuItem
                  onClick={() => handleExport(format, 'page')}
                  disabled={isExporting}
                >
                  <span className='text-sm'>{t('data.exportCurrentPage')}</span>
                  <span className='ml-auto text-xs text-muted-foreground'>
                    {t('data.recordCount', { count: currentPageRows.length })}
                  </span>
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}

        <DropdownMenuSeparator />
        <div className='px-2 py-1.5 text-xs text-muted-foreground'>
          {t('data.filtersAppliedHint')}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
