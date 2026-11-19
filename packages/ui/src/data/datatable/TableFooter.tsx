'use client'

import React from 'react'
import { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { TEST_IDS } from '../../utils/test-ids'
import { useTelamonjsT } from '../../i18n/use-t'

export interface TableFooterProps<TData> {
  table: Table<TData>
  manualPagination: boolean
  storePageSize: number
  pageSize: number
  pageCount?: number
  currentPage?: number
  totalItems?: number
  onPaginationChange?: (page: number, pageSize: number) => void
  setStorePage: (page: number) => void
  setStorePageSize: (pageSize: number) => void
  enableSelection: boolean
  selectedRowCount: number
}

/**
 * Pagination footer: page size selector, page-number buttons with
 * ellipsis, first/prev/next/last controls, and results summary.
 * Supports both client-side (TanStack) and server-side (store/callback)
 * pagination.
 *
 * @internal Extracted from DataTable.tsx (footer render)
 */
export function TableFooter<TData>({
  table,
  manualPagination,
  storePageSize,
  pageSize,
  pageCount,
  currentPage,
  totalItems,
  onPaginationChange,
  setStorePage,
  setStorePageSize,
  enableSelection,
  selectedRowCount,
}: TableFooterProps<TData>) {
  const t = useTelamonjsT()
  return (
    <div className='flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 px-4 py-3 border-t bg-muted/25'>
      {/* Mobile: Row 1 | Desktop: Right (inverted order) */}
      <div className='flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 order-1 sm:order-2'>
        {/* Page size selector */}
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>{t('pagination.display')}</span>
          <Select
            value={String(
              manualPagination
                ? storePageSize
                : table.getState().pagination?.pageSize || pageSize
            )}
            onValueChange={(value: string) => {
              const newPageSize = Number(value)
              if (manualPagination) {
                setStorePageSize(newPageSize)
                if (onPaginationChange && currentPage) {
                  onPaginationChange(currentPage, newPageSize)
                }
              } else {
                table.setPageSize(newPageSize)
              }
            }}
          >
            <SelectTrigger
              className='h-8 w-[70px]'
              data-testid={TEST_IDS.PAGINATION.PAGE_SIZE}
              aria-label='Rows per page'
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent side='top'>
              {[10, 20, 30, 50, 100].map(size => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Modern pagination with page numbers */}
        <div className='flex items-center gap-1'>
          {(() => {
            const actualCurrentPage =
              manualPagination && currentPage
                ? currentPage
                : (table.getState().pagination?.pageIndex ?? 0) + 1
            const actualPageCount = manualPagination
              ? pageCount || 1
              : table.getPageCount()

            // Function to generate page numbers with ellipsis
            const getPageNumbers = () => {
              const pages: (number | 'ellipsis')[] = []
              const delta = 1 // Show current page + delta pages on each side

              // Always show first page
              pages.push(1)

              // Calculate range around current page
              const rangeStart = Math.max(2, actualCurrentPage - delta)
              const rangeEnd = Math.min(
                actualPageCount - 1,
                actualCurrentPage + delta
              )

              // Add ellipsis before range if needed
              if (rangeStart > 2) {
                pages.push('ellipsis')
              }

              // Add range
              for (let i = rangeStart; i <= rangeEnd; i++) {
                pages.push(i)
              }

              // Add ellipsis after range if needed
              if (rangeEnd < actualPageCount - 1) {
                pages.push('ellipsis')
              }

              // Always show last page (if more than 1 page)
              if (actualPageCount > 1) {
                pages.push(actualPageCount)
              }

              return pages
            }

            const handlePageChange = (e: React.MouseEvent, page: number) => {
              e.preventDefault()
              e.stopPropagation()

              if (manualPagination) {
                // Update Zustand store (triggers re-fetch in ListPage)
                setStorePage(page)
                // Also call callback if provided (backward compatibility)
                if (onPaginationChange) {
                  onPaginationChange(page, storePageSize)
                }
              } else {
                table.setPageIndex(page - 1)
              }
            }

            const isFirstPage = actualCurrentPage === 1
            const isLastPage = actualCurrentPage === actualPageCount

            return (
              <>
                {/* First page button - hidden on mobile */}
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8 hidden sm:inline-flex'
                  onClick={e => handlePageChange(e, 1)}
                  disabled={isFirstPage}
                  title={t('pagination.first')}
                  data-testid={TEST_IDS.PAGINATION.FIRST}
                  aria-label='First page'
                >
                  <span className='sr-only'>{t('pagination.firstShort')}</span>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <polyline points='11 17 6 12 11 7'></polyline>
                    <polyline points='18 17 13 12 18 7'></polyline>
                  </svg>
                </Button>

                {/* Previous button - icon only on mobile, text on desktop */}
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8 sm:w-auto sm:px-3'
                  onClick={e => handlePageChange(e, actualCurrentPage - 1)}
                  disabled={isFirstPage}
                  title={t('pagination.previous')}
                  data-testid={TEST_IDS.PAGINATION.PREVIOUS}
                  aria-label='Previous page'
                >
                  <ChevronLeft className='h-4 w-4' />
                  <span className='hidden sm:inline ml-1'>{t('pagination.previousShort')}</span>
                </Button>

                {/* Page numbers */}
                {getPageNumbers().map((page, idx) => {
                  if (page === 'ellipsis') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className='px-2 text-muted-foreground'
                      >
                        ...
                      </span>
                    )
                  }

                  const isActive = page === actualCurrentPage
                  return (
                    <Button
                      type='button'
                      key={page}
                      variant={isActive ? 'default' : 'outline'}
                      size='icon'
                      className='h-8 w-8'
                      onClick={e => handlePageChange(e, page)}
                      disabled={isActive}
                      data-testid={TEST_IDS.PAGINATION.PAGE(page)}
                      aria-label={`Page ${page}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {page}
                    </Button>
                  )
                })}

                {/* Next button - icon only on mobile, text on desktop */}
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8 sm:w-auto sm:px-3'
                  onClick={e => handlePageChange(e, actualCurrentPage + 1)}
                  disabled={isLastPage}
                  title={t('pagination.next')}
                  data-testid={TEST_IDS.PAGINATION.NEXT}
                  aria-label='Next page'
                >
                  <span className='hidden sm:inline mr-1'>{t('pagination.nextShort')}</span>
                  <ChevronRight className='h-4 w-4' />
                </Button>

                {/* Last page button - hidden on mobile */}
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8 hidden sm:inline-flex'
                  onClick={e => handlePageChange(e, actualPageCount)}
                  disabled={isLastPage}
                  title={t('pagination.last')}
                  data-testid={TEST_IDS.PAGINATION.LAST}
                  aria-label='Last page'
                >
                  <span className='sr-only'>{t('pagination.lastShort')}</span>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <polyline points='13 17 18 12 13 7'></polyline>
                    <polyline points='6 17 11 12 6 7'></polyline>
                  </svg>
                </Button>
              </>
            )
          })()}
        </div>
      </div>

      {/* Mobile: Row 2 | Desktop: Left */}
      <div className='flex items-center justify-center sm:justify-start space-x-2 text-sm text-muted-foreground order-2 sm:order-1'>
        <span>
          {(() => {
            // Server-side pagination: use totalItems from backend
            const total =
              manualPagination && totalItems
                ? totalItems
                : table.getFilteredRowModel().rows.length
            const currentPageIndex =
              manualPagination && currentPage
                ? currentPage - 1
                : (table.getState().pagination?.pageIndex ?? 0)
            const currentPageSize = manualPagination
              ? storePageSize
              : table.getState().pagination?.pageSize || pageSize

            if (total === 0) return t('pagination.noResults')

            const startItem = currentPageIndex * currentPageSize + 1
            const endItem = Math.min(
              (currentPageIndex + 1) * currentPageSize,
              total
            )

            return t('pagination.range', { from: startItem, to: endItem, total })
          })()}
        </span>
        {enableSelection && selectedRowCount > 0 && (
          <span>
            • {t('pagination.selected', { count: selectedRowCount })}
          </span>
        )}
      </div>
    </div>
  )
}
