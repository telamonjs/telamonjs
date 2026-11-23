'use client'

import { useState, useMemo } from 'react'
import { cn } from '../../utils/cn'
import { Button } from '../../ui/button'
import { resolveIcon } from '../../utils/icon'
import { useTelamonjsT } from '../../i18n/use-t'

// Fixed icon name, not prop-derived — resolve once at module scope instead
// of on every render.
const ChevronDown = resolveIcon('ChevronDown')

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export interface ReportTableLabels {
  empty: string
  loadMore: string
  showing: string
  of: string
  records: string
  remaining: string
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportTableColumn<T> {
  key: keyof T | string
  header: string
  render?: (item: T, index: number) => React.ReactNode
  className?: string
}

export interface ReportTableProps<T> {
  data: T[]
  columns: ReportTableColumn<T>[]
  pageSize?: number
  maxHeight?: string
  emptyMessage?: string
  className?: string
  stickyHeader?: boolean
  labels?: Partial<ReportTableLabels>
  /** Show the "Showing X of Y records" line under the table. Default: `true` */
  showFooter?: boolean
  /**
   * Attributes for the scroll box (the `maxHeight` container). Pass
   * `{ tabIndex: 0, role: 'region', 'aria-label': '…' }` so keyboard users
   * can scroll it (axe `scrollable-region-focusable`). Default: none
   */
  scrollProps?: Pick<
    React.HTMLAttributes<HTMLDivElement>,
    'tabIndex' | 'role' | 'aria-label' | 'aria-labelledby'
  >
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ReportTable - Standardised table with progressive "load more" pagination.
 *
 * Replaces the common `.slice(0, N)` pattern with real pagination.
 * Supports sticky header and progressive loading via a "load more" button.
 *
 * Also exported as `SimpleTable` for generic usage.
 *
 * @category Data
 */
export function ReportTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 50,
  maxHeight = '400px',
  emptyMessage,
  className,
  stickyHeader = true,
  labels: labelOverrides,
  showFooter = true,
  scrollProps,
}: ReportTableProps<T>) {
  const t = useTelamonjsT()
  const defaultLabels: ReportTableLabels = {
    empty: t('data.reportEmpty'),
    loadMore: t('data.reportLoadMore'),
    showing: t('data.reportShowing'),
    of: t('data.reportOf'),
    records: t('data.reportRecords'),
    remaining: t('data.reportRemaining'),
  }
  const labels = { ...defaultLabels, ...labelOverrides }
  const [displayCount, setDisplayCount] = useState(pageSize)

  const displayedData = useMemo(
    () => data.slice(0, displayCount),
    [data, displayCount],
  )

  const hasMore = displayCount < data.length
  const remaining = data.length - displayCount

  const loadMore = () => {
    setDisplayCount((prev) => Math.min(prev + pageSize, data.length))
  }

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {emptyMessage ?? labels.empty}
      </div>
    )
  }

  const getValue = (item: T, key: string): unknown => {
    const keys = key.split('.')
    let value: unknown = item
    for (const k of keys) {
      value = (value as Record<string, unknown> | undefined)?.[k]
    }
    return value
  }

  return (
    <div className={className}>
      <div
        {...scrollProps}
        className={cn('overflow-auto', maxHeight && `max-h-[${maxHeight}]`)}
        style={{ maxHeight }}
      >
        <table className="w-full text-sm">
          <thead
            className={cn(stickyHeader && 'sticky top-0 bg-background z-10')}
          >
            <tr className="border-b">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn('p-2 text-left font-medium', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedData.map((item, idx) => (
              <tr key={idx} className="border-b hover:bg-muted/50">
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn('p-2', col.className)}
                  >
                    {col.render
                      ? col.render(item, idx)
                      : String(getValue(item, String(col.key)) ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            className="gap-2"
            data-testid="report-table-load-more"
          >
            <ChevronDown className="h-4 w-4" />
            {labels.loadMore} ({remaining} {labels.remaining})
          </Button>
        </div>
      )}

      {showFooter && (
        <div className="mt-2 text-center text-xs text-muted-foreground">
          {labels.showing} {displayedData.length} {labels.of} {data.length} {labels.records}
        </div>
      )}
    </div>
  )
}

// Generic alias
export { ReportTable as SimpleTable }
