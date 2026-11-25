'use client'

import {
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { useTelamonjsT } from '../../../i18n/use-t'
import { Button } from '../../../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../ui/tooltip'
import { TEST_IDS } from '../../../utils/test-ids'
import type { Table } from '@tanstack/react-table'

/**
 * Desktop pagination footer for SubList — see toolbar.tsx for why this is
 * module-level with explicit props (plan A1 focus-loss fix).
 */
export interface SubListPaginationProps<TData extends Record<string, unknown>> {
  table: Table<TData>
}

function SubListPaginationComponent<TData extends Record<string, unknown>>({
  table,
}: SubListPaginationProps<TData>) {
  const t = useTelamonjsT()
  return (
    <div className='flex-shrink-0 flex items-center justify-between px-1 py-2 border-t border-border/30'>
      <p className='text-sm text-muted-foreground'>
        {t.rich('list.filteredOfTotal', {
          filtered: table.getFilteredRowModel().rows.length,
          total: table.getRowCount(),
          strong: chunks => (
            <strong className='font-medium text-foreground'>{chunks}</strong>
          ),
        })}
      </p>

      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground hidden lg:block'>
            {t('list.perPage')}
          </span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={value => table.setPageSize(Number(value))}
          >
            <SelectTrigger
              className='h-8 w-[70px] border-border/50'
              data-testid={TEST_IDS.PAGINATION.PAGE_SIZE}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map(size => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className='text-sm text-muted-foreground tabular-nums'>
          <span className='font-medium text-foreground'>
            {table.getState().pagination.pageIndex + 1}
          </span>{' '}
          / {table.getPageCount()}
        </span>

        <div className='flex items-center gap-1'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label={t('list.firstPage')}
                  data-testid={TEST_IDS.PAGINATION.FIRST}
                  className='h-8 w-8 border-border/50 hidden lg:flex'
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    table.setPageIndex(0)
                  }}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('list.firstPage')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label={t('list.previousPage')}
                  data-testid={TEST_IDS.PAGINATION.PREVIOUS}
                  className='h-8 w-8 border-border/50'
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    table.previousPage()
                  }}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('list.previousPageShort')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label={t('list.nextPage')}
                  data-testid={TEST_IDS.PAGINATION.NEXT}
                  className='h-8 w-8 border-border/50'
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    table.nextPage()
                  }}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('list.nextPageShort')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label={t('list.lastPage')}
                  data-testid={TEST_IDS.PAGINATION.LAST}
                  className='h-8 w-8 border-border/50 hidden lg:flex'
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    table.setPageIndex(table.getPageCount() - 1)
                  }}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('list.lastPage')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}

// Not memo'd: it reads `table`, whose identity never changes (useReactTable
// returns one instance), so memo skipped every filter/page/visibility change.
export const SubListPagination = SubListPaginationComponent
