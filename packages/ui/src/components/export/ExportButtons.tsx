'use client'

import { useState } from 'react'
import { Button } from '../../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { cn } from '../../utils/cn'
import { logger } from '../../utils/logger'
import { useTelamonjsT } from '../../i18n/use-t'
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  ChevronDown,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportColumn<T = Record<string, unknown>> {
  header: string
  accessorKey?: keyof T & string
  accessorFn?: (row: T) => string | number | null | undefined
}

export interface ExportLabels {
  exportButton: string
  exportPDF: string
  exportExcel: string
  exportCSV: string
}

// ---------------------------------------------------------------------------
// ExportButtons (dropdown with all 3 formats)
// ---------------------------------------------------------------------------

export interface ExportButtonsProps<T = Record<string, unknown>> {
  data: T[]
  columns: ExportColumn<T>[]
  filename?: string
  onExportPDF?: (data: T[], columns: ExportColumn<T>[], filename: string) => Promise<void>
  onExportExcel?: (data: T[], columns: ExportColumn<T>[], filename: string) => Promise<void>
  onExportCSV?: (data: T[], columns: ExportColumn<T>[], filename: string) => Promise<void>
  disabled?: boolean
  className?: string
  labels?: Partial<ExportLabels>
}

export function ExportButtons<T extends Record<string, unknown>>({
  data,
  columns,
  filename = 'export',
  onExportPDF,
  onExportExcel,
  onExportCSV,
  disabled = false,
  className,
  labels: labelsProp,
}: ExportButtonsProps<T>) {
  const t = useTelamonjsT()
  const [isExporting, setIsExporting] = useState(false)
  const defaultLabels: ExportLabels = {
    exportButton: t('common.export'),
    exportPDF: t('dashboard.exportPDF'),
    exportExcel: t('dashboard.exportExcel'),
    exportCSV: t('dashboard.exportCSV'),
  }
  const mergedLabels: ExportLabels = { ...defaultLabels, ...labelsProp }

  const handleExport = async (
    exportFn?: (data: T[], columns: ExportColumn<T>[], filename: string) => Promise<void>,
  ) => {
    if (data.length === 0 || !exportFn) return

    setIsExporting(true)
    try {
      // Small delay for UI feedback
      await new Promise((resolve) => setTimeout(resolve, 100))
      await exportFn(data, columns, filename)
    } catch (error) {
      logger.error('Export error', { error: error instanceof Error ? error : String(error) })
    } finally {
      setIsExporting(false)
    }
  }

  const isDisabled = disabled || data.length === 0 || isExporting

  const hasAnyExport = onExportPDF || onExportExcel || onExportCSV

  if (!hasAnyExport) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isDisabled}
          className={cn(className)}
          data-testid="export-buttons-trigger"
        >
          <Download className={cn('h-4 w-4 mr-2', isExporting && 'animate-pulse')} />
          {mergedLabels.exportButton}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportPDF && (
          <DropdownMenuItem onClick={() => handleExport(onExportPDF)}>
            <FileText className="h-4 w-4 mr-2 text-red-500" />
            {mergedLabels.exportPDF}
          </DropdownMenuItem>
        )}
        {onExportExcel && (
          <DropdownMenuItem onClick={() => handleExport(onExportExcel)}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
            {mergedLabels.exportExcel}
          </DropdownMenuItem>
        )}
        {onExportCSV && (
          <DropdownMenuItem onClick={() => handleExport(onExportCSV)}>
            <File className="h-4 w-4 mr-2 text-blue-500" />
            {mergedLabels.exportCSV}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// ExportPDFButton (single format)
// ---------------------------------------------------------------------------

export interface ExportPDFButtonProps<T = Record<string, unknown>> {
  data: T[]
  columns: ExportColumn<T>[]
  filename?: string
  onExportPDF: (data: T[], columns: ExportColumn<T>[], filename: string) => Promise<void>
  disabled?: boolean
  className?: string
  label?: string
}

export function ExportPDFButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename = 'export',
  onExportPDF,
  disabled = false,
  className,
  label = 'PDF',
}: ExportPDFButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (data.length === 0) return
    setIsExporting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 100))
      await onExportPDF(data, columns, filename)
    } catch (error) {
      logger.error('Export PDF error', { error: error instanceof Error ? error : String(error) })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0 || isExporting}
      className={cn(className)}
      data-testid="export-pdf-button"
    >
      <FileText className={cn('h-4 w-4 mr-2 text-red-500', isExporting && 'animate-pulse')} />
      {label}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// ExportExcelButton (single format)
// ---------------------------------------------------------------------------

export interface ExportExcelButtonProps<T = Record<string, unknown>> {
  data: T[]
  columns: ExportColumn<T>[]
  filename?: string
  onExportExcel: (data: T[], columns: ExportColumn<T>[], filename: string) => Promise<void>
  disabled?: boolean
  className?: string
  label?: string
}

export function ExportExcelButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename = 'export',
  onExportExcel,
  disabled = false,
  className,
  label = 'Excel',
}: ExportExcelButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (data.length === 0) return
    setIsExporting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 100))
      await onExportExcel(data, columns, filename)
    } catch (error) {
      logger.error('Export Excel error', { error: error instanceof Error ? error : String(error) })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0 || isExporting}
      className={cn(className)}
      data-testid="export-excel-button"
    >
      <FileSpreadsheet
        className={cn('h-4 w-4 mr-2 text-green-500', isExporting && 'animate-pulse')}
      />
      {label}
    </Button>
  )
}
