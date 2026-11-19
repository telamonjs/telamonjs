'use client'

import React, { memo } from 'react'
import { SlidersHorizontal, X, Search, RefreshCw } from 'lucide-react'
import { useTelamonjsT } from '../../../i18n/use-t'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu'
import { cn } from '../../../utils'
import { TEST_IDS } from '../../../utils/test-ids'
import type { Column, Table } from '@tanstack/react-table'

/**
 * Desktop toolbar for SubList (plan A1, decomposed from the inline
 * DesktopView memo that lived inside SubListComponent's render body).
 *
 * Module-level + explicit props on purpose: a component declared INSIDE a
 * render function gets a new identity every render, which forces React to
 * unmount/remount the subtree (the search input loses focus per keystroke).
 * Hoisting it here — with data passed as props instead of closed over —
 * makes `memo` legitimate and fixes that bug.
 */
export interface SubListToolbarProps<TData extends Record<string, unknown>> {
  leftActions?: React.ReactNode
  enableSearch: boolean
  globalFilter: string
  setGlobalFilter: (value: string) => void
  isFiltered: boolean
  onRefresh?: () => void
  loading: boolean
  enableColumnVisibility: boolean
  table: Table<TData>
}

function SubListToolbarComponent<TData extends Record<string, unknown>>({
  leftActions,
  enableSearch,
  globalFilter,
  setGlobalFilter,
  isFiltered,
  onRefresh,
  loading,
  enableColumnVisibility,
  table,
}: SubListToolbarProps<TData>) {
  const t = useTelamonjsT()
  return (
    <div className='flex-shrink-0 flex items-center gap-2 h-8'>
      {leftActions}

      {enableSearch && (
        <div className='relative flex-1 max-w-[200px]'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder={t('list.filterPlaceholder')}
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className='h-8 pl-8 pr-8 text-sm'
          />
          {isFiltered && (
            <button
              type='button'
              aria-label={t('list.clearSearchAria')}
              data-testid={`${TEST_IDS.TOOLBAR.SEARCH}-clear`}
              className='absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted'
              onClick={e => {
                e.preventDefault()
                setGlobalFilter('')
              }}
            >
              <X className='h-3.5 w-3.5 text-muted-foreground' />
            </button>
          )}
        </div>
      )}

      <div className='flex items-center gap-1 ml-auto'>
        {onRefresh && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label={t('list.refreshListAria')}
            data-testid={TEST_IDS.TOOLBAR.REFRESH}
            className={cn('h-8 w-8', loading && 'animate-spin')}
            onClick={e => {
              e.preventDefault()
              onRefresh()
            }}
            disabled={loading}
          >
            <RefreshCw className='h-4 w-4' />
          </Button>
        )}

        {enableColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label={t('list.toggleColumnsAria')}
                data-testid={TEST_IDS.TOOLBAR.COLUMNS}
                className='h-8 w-8 hidden md:flex'
              >
                <SlidersHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-[150px]'>
              {table
                .getAllColumns()
                .filter(
                  (column: Column<TData, unknown>) =>
                    typeof column.accessorFn !== 'undefined' &&
                    column.getCanHide()
                )
                .map((column: Column<TData, unknown>) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className='capitalize'
                      checked={column.getIsVisible()}
                      onCheckedChange={value =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

export const SubListToolbar = memo(
  SubListToolbarComponent
) as typeof SubListToolbarComponent
