'use client'

import React, { memo } from 'react'
import { Trash2, X, ChevronRight, Search, RefreshCw } from 'lucide-react'
import { useTelamonjsT } from '../../i18n/use-t'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { cn } from '../../utils'
import { EmptyState } from './empty-state'
import type { SubListField } from './sub-list'
import { SubListHeaderText } from './sub-list/header-text'

/**
 * Mobile card view for SubList (extracted from sub-list.tsx, plan 012).
 *
 * Behavior-preserving: identical markup/logic to the previous inline
 * `MobileView` memo component; props are the values it formerly closed over.
 * Internal to the crud SubList — not exported from the package root.
 */
export interface SubListMobileViewProps<TData extends Record<string, unknown>> {
  leftActions?: React.ReactNode
  enableSearch: boolean
  globalFilter: string
  setGlobalFilter: (value: string) => void
  isFiltered: boolean
  onRefresh?: () => void
  loading: boolean
  filteredData: TData[]
  listFields: SubListField<TData>[]
  getFieldValue: (row: TData, field: SubListField<TData>) => string
  loadFn?: ((rowId: string) => void) | null
  handleLoadFn: (rowId: string) => Promise<void>
  deleteFn?:
    | ((rowIdOrParams: string | { id: string; parentId: string }) => void)
    | null
  /** Opens the list's single delete confirmation for this row. */
  onRequestDelete: (rowId: string) => void
  /** Human label of a row (aria-labels). */
  rowLabel: (row: TData) => string
  emptyState?: {
    title?: string
    description?: string
    actionLabel?: string
    onAction?: () => void
  }
}

function SubListMobileViewComponent<TData extends Record<string, unknown>>({
  leftActions,
  enableSearch,
  globalFilter,
  setGlobalFilter,
  isFiltered,
  onRefresh,
  loading,
  filteredData,
  listFields,
  getFieldValue,
  loadFn,
  handleLoadFn,
  deleteFn,
  onRequestDelete,
  rowLabel,
  emptyState,
}: SubListMobileViewProps<TData>) {
  const t = useTelamonjsT()
  return (
    <div className='w-full space-y-3'>
      {/* Mobile Toolbar */}
      <div className='flex items-center gap-2'>
        {leftActions}
        {enableSearch && (
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t('common.search')}
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className='h-9 pl-9 pr-9'
            />
            {isFiltered && (
              <button
                type='button'
                className='absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted'
                onClick={e => {
                  e.preventDefault()
                  setGlobalFilter('')
                }}
                aria-label={t('list.clearSearchAria')}
              >
                <X className='h-3.5 w-3.5 text-muted-foreground' />
              </button>
            )}
          </div>
        )}
        {onRefresh && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className={cn('h-9 w-9', loading && 'animate-spin')}
            onClick={e => {
              e.preventDefault()
              onRefresh()
            }}
            disabled={loading}
            aria-label={t('list.refreshListAria')}
          >
            <RefreshCw className='h-4 w-4' />
          </Button>
        )}
      </div>

      {/* Mobile Card List */}
      <div className='space-y-2 max-h-[50vh] overflow-y-auto'>
        {filteredData.length > 0 ? (
          <>
            {filteredData.map((row, index) => {
              const rowId = (row as Record<string, unknown>).id as string
              return (
                <div
                  key={rowId || index}
                  className={cn(
                    'rounded-lg border bg-card p-3.5',
                    'hover:bg-muted/50',
                    loadFn && 'cursor-pointer'
                  )}
                  onClick={async () => {
                    if (loadFn && rowId) {
                      await handleLoadFn(rowId)
                    }
                  }}
                >
                  <div className='flex items-start justify-between gap-3'>
                    {/* Card Content */}
                    <div className='flex-1 min-w-0 space-y-1.5'>
                      {listFields.map((field, fieldIndex) => {
                        const value = getFieldValue(row, field)
                        // First field as title (larger)
                        if (fieldIndex === 0) {
                          return (
                            <p
                              key={field.accessorKey || fieldIndex}
                              className='font-medium text-sm truncate'
                            >
                              {value}
                            </p>
                          )
                        }
                        // Other fields as secondary info
                        return (
                          <p
                            key={field.accessorKey || fieldIndex}
                            className='text-xs text-muted-foreground truncate'
                          >
                            <span className='font-medium text-muted-foreground/80'>
                              <SubListHeaderText header={field.header} />:
                            </span>{' '}
                            {value}
                          </p>
                        )
                      })}
                    </div>

                    {/* Actions */}
                    <div
                      className='flex items-center gap-1 flex-shrink-0'
                      onClick={e => e.stopPropagation()}
                    >
                      {deleteFn && rowId && (
                        <>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              onRequestDelete(rowId)
                            }}
                            className='h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400'
                            aria-label={t('list.deleteRecordNamedAria', { name: rowLabel(row) })}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </>
                      )}
                      {loadFn && (
                        <ChevronRight className='h-4 w-4 text-muted-foreground/50' />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <EmptyState
            title={emptyState?.title}
            description={emptyState?.description}
            action={
              emptyState?.onAction
                ? {
                    label: emptyState.actionLabel || t('common.add'),
                    onClick: emptyState.onAction,
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* Mobile Footer - Styled Counter */}
      {filteredData.length > 0 && (
        <div className='text-xs text-muted-foreground text-center pt-2 border-t border-border/30'>
          {t.rich('list.recordCount', {
            count: filteredData.length,
            strong: chunks => (
              <strong className='font-medium text-foreground'>
                {chunks}
              </strong>
            ),
          })}
        </div>
      )}
    </div>
  )
}

export const SubListMobileView = memo(
  SubListMobileViewComponent
) as typeof SubListMobileViewComponent
