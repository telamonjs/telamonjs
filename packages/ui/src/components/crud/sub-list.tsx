'use client'

import React from 'react'
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState,
  getPaginationRowModel,
  Row,
  Column,
} from '@tanstack/react-table'
import { Edit, Trash2, ArrowUpDown } from 'lucide-react'
import {
  useState,
  useMemo,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  memo,
} from 'react'
import { toast } from 'sonner'
import { useTelamonjsT } from '../../i18n/use-t'
import { useFormat } from '../../i18n/use-format'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog'
import { Button } from '../../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip'
import { cn } from '../../utils'
import { TEST_IDS } from '../../utils/test-ids'
import { resolveSubListPath } from '../../utils/sub-list-helpers'
import { SubListMobileView } from './SubListMobileView'
import { SubListToolbar } from './sub-list/toolbar'
import { SubListTable } from './sub-list/table'
import { SubListPagination } from './sub-list/pagination'
import { SubListHeaderText, type SubListHeader } from './sub-list/header-text'

// SubList field definition (similar to ListPage field)
export interface SubListField<TData = Record<string, unknown>> {
  id?: string
  /** Text, `MessageRef` or a component (`() => <Msg k='…' />`) — (was string only). */
  header: SubListHeader
  accessorKey?: string
  accessorFn?: (row: TData) => unknown
  cell?: (props: { row: Row<TData> }) => React.ReactNode
}

export interface SubListProps<TData = Record<string, unknown>> {
  id?: string
  listFields?: SubListField<TData>[]
  data?: TData[]
  loadFn?: ((rowId: string) => void) | null
  deleteFn?:
    | ((rowIdOrParams: string | { id: string; parentId: string }) => void)
    | null
  manyToMany?: boolean
  enableSearch?: boolean
  enableColumnVisibility?: boolean
  enableSorting?: boolean
  enablePagination?: boolean
  /** Max height for fixed height. Ignored if className includes 'h-full' */
  maxHeight?: string
  /** Optional className for container. Use 'h-full' to fill available space */
  className?: string
  /** Empty state configuration */
  emptyState?: {
    title?: string
    description?: string
    actionLabel?: string
    onAction?: () => void
  }
  /** Callback to refresh data */
  onRefresh?: () => void
  /** Loading state */
  loading?: boolean
  /** Left side actions (e.g., Add button) */
  leftActions?: React.ReactNode
}

// Stable defaults: a fresh `[]` per render would invalidate every memo below.
const EMPTY_DATA: never[] = []
const EMPTY_FIELDS: never[] = []

const SubListComponent = <
  TData extends Record<string, unknown> = Record<string, unknown>,
>({
  id,
  listFields = EMPTY_FIELDS,
  data = EMPTY_DATA,
  loadFn,
  deleteFn,
  manyToMany,
  enableSearch = true,
  enableColumnVisibility = true,
  enableSorting = true,
  enablePagination = true,
  className,
  emptyState,
  onRefresh,
  loading = false,
  leftActions,
}: SubListProps<TData>) => {
  // TanStack's useReactTable() returns functions the compiler can't safely
  // memoize (documented incompatible-library case).
  'use no memo'

  const t = useTelamonjsT()
  // Check if using full height mode (flex container)
  const useFullHeight = className?.includes('h-full')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  // The input stays responsive; filtering both views runs at low priority.
  const deferredFilter = useDeferredValue(globalFilter)
  // ONE confirmation for the whole list: desktop and mobile views are both
  // mounted (CSS-hidden), and a per-view dialog keyed by row opened two stacked
  // alert dialogs (double overlay) on every delete.
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null)

  // Stabilize data to prevent unnecessary re-renders
  const stableData = useMemo(() => data || [], [data])

  // Stable callbacks to prevent re-renders from affecting dialog state
  const handleLoadFn = useCallback(
    async (rowId: string) => {
      if (loadFn) {
        if (id) {
          await loadFn(rowId)
        } else if (listFields?.[0]?.accessorKey) {
          await loadFn(rowId)
        }
      }
    },
    [loadFn, id, listFields]
  )

  // Disables the confirm action while the delete is in flight: a double
  // click must not fire two DELETEs (same pattern as ViewDialog's isDeleting).
  const [deleting, setDeleting] = useState(false)

  const handleDeleteFn = useCallback(
    async (rowId: string) => {
      if (deleteFn) {
        setDeleting(true)
        try {
          // For manyToMany, pass { parentId, id }, otherwise just rowId
          const params = manyToMany && id ? { parentId: id, id: rowId } : rowId
          const response = (await deleteFn(params)) as unknown
          const status =
            response && typeof response === 'object'
              ? (response as Record<string, unknown>).status
              : undefined
          // IResponse ({ status: 'success' | 'error', description }) means the
          // service layer owns the success toast; only its error is shown here.
          if (status === 'error') {
            toast.error(
              ((response as Record<string, unknown>).description as string) ||
                t('toast.deleteItemError')
            )
          } else if (status !== 'success') {
            toast.success(t('toast.itemDeleted'))
          }
        } catch (error: unknown) {
          toast.error(
            error instanceof Error ? error.message : t('toast.deleteItemError')
          )
        } finally {
          setDeleting(false)
        }
        setDeleteRowId(null)
      }
    },
    [deleteFn, manyToMany, id, t]
  )

  // Pure helpers (extracted to utils/sub-list-helpers, stable identities)
  const resolve = resolveSubListPath
  const fmt = useFormat()
  const formatDate = useCallback(
    (dateString: string) => {
      try {
        return fmt.date(dateString)
      } catch {
        return dateString
      }
    },
    [fmt]
  )

  // Get field value for mobile card display
  const getFieldValue = useCallback(
    (row: TData, field: SubListField<TData>): string => {
      let value: unknown
      if (field.accessorFn) {
        value = field.accessorFn(row)
      } else if (field.accessorKey) {
        value = resolve(row as Record<string, unknown>, field.accessorKey)
      }

      if (typeof value === 'boolean') {
        return value ? t('common.yes') : t('common.no')
      }
      if (typeof value === 'object' && value !== null) {
        return formatDate(String(value))
      }
      if (
        field.accessorKey?.includes('date') ||
        field.accessorKey?.includes('Date')
      ) {
        return formatDate(String(value))
      }
      return value?.toString() || '-'
    },
    [resolve, formatDate, t]
  )

  // Human label of a row (first list column) for aria-labels and the delete
  // confirmation — instead of the raw id ("Excluir item cm1x…").
  const rowLabel = useCallback(
    (row: TData): string => {
      const first = listFields[0]
      const label = first ? getFieldValue(row, first) : ''
      return label && label !== '-'
        ? label
        : String((row as Record<string, unknown>).id ?? '')
    },
    [listFields, getFieldValue]
  )
  const deleteRow = deleteRowId
    ? stableData.find(
        r => String((r as Record<string, unknown>).id) === String(deleteRowId)
      )
    : undefined

  // Latest handlers for the cells: consumers usually pass inline loadFn/deleteFn,
  // and having them as column deps remounted every cell on each parent render.
  const handlersRef = useRef({ handleLoadFn, rowLabel })
  useEffect(() => {
    handlersRef.current = { handleLoadFn, rowLabel }
  })
  const hasLoadFn = !!loadFn
  const hasDeleteFn = !!deleteFn

  // Convert listFields to TanStack Table columns
  const columns = useMemo((): ColumnDef<TData>[] => {
    const cols: ColumnDef<TData>[] = listFields.map((field, index) => ({
      // Positional fallback: a random id remounted the column on every render.
      id: field.accessorKey || field.id || `col-${index}`,
      header: ({ column }: { column: Column<TData> }) => {
        if (!enableSorting) {
          return (
            <span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
              <SubListHeaderText header={field.header} />
            </span>
          )
        }

        return (
          <Button
            variant='ghost'
            size='sm'
            data-testid={`sub-list-sort-${field.accessorKey || field.id || column.id}`}
            className='-ml-3 h-8 hover:bg-transparent'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
              <SubListHeaderText header={field.header} />
            </span>
            <ArrowUpDown className='ml-2 h-3.5 w-3.5 text-muted-foreground/50' />
          </Button>
        )
      },
      accessorKey: field.accessorKey,
      accessorFn: field.accessorFn,
      cell: ({ row }: { row: Row<TData> }) => {
        // Priority: field.cell -> accessorFn -> accessorKey
        let value: unknown
        if (field.cell) {
          return field.cell({ row })
        } else if (field.accessorFn) {
          value = field.accessorFn(row.original)
        } else if (field.accessorKey) {
          value = resolve(
            row.original as Record<string, unknown>,
            field.accessorKey
          )
        } else {
          value = undefined
        }

        // Special formatting for common field types
        // Handle boolean fields with Switch (same as SubList)
        if (typeof value === 'boolean') {
          return (
            <div className='flex items-center gap-2'>
              <div
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  value ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                )}
              />
              <span className='text-sm'>
                {value ? t('list.activeValue') : t('list.inactiveValue')}
              </span>
            </div>
          )
        }

        // Handle date objects (same as SubList)
        if (typeof value === 'object' && value !== null) {
          return (
            <span className='text-sm text-muted-foreground'>
              {formatDate(String(value))}
            </span>
          )
        }

        if (
          field.accessorKey?.includes('date') ||
          field.accessorKey?.includes('Date')
        ) {
          return (
            <span className='text-sm text-muted-foreground'>
              {formatDate(String(value))}
            </span>
          )
        }

        return <span className='text-sm'>{value?.toString() || '-'}</span>
      },
      enableSorting: enableSorting,
      enableGlobalFilter: true,
    }))

    // Add actions column if needed
    if (hasLoadFn || hasDeleteFn) {
      cols.push({
        id: 'actions',
        header: () => (
          <span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
            {t('common.actions')}
          </span>
        ),
        cell: ({ row }: { row: Row<TData> }) => {
          const rowId = (row.original as Record<string, unknown>).id as string
          return (
            <div
              className='flex items-center justify-end gap-0.5'
              onClick={e => e.stopPropagation()}
            >
              <TooltipProvider>
                {hasLoadFn && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        aria-label={t('list.editRecordNamedAria', {
                          name: handlersRef.current.rowLabel(row.original),
                        })}
                        data-testid={TEST_IDS.ROW_ACTION.edit(rowId)}
                        onClick={async e => {
                          e.preventDefault()
                          e.stopPropagation()
                          await handlersRef.current.handleLoadFn(rowId)
                        }}
                        className={cn(
                          'h-8 w-8 text-muted-foreground',
                          // always visible: there was no `group` on any
                          // ancestor, so group-hover never matched and the
                          // action stayed invisible — and touch has no hover
                          'transition-colors duration-150',
                          'hover:bg-blue-50 hover:text-blue-600',
                          'dark:hover:bg-blue-950 dark:hover:text-blue-400'
                        )}
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side='top' className='text-xs'>
                      {t('common.edit')}
                    </TooltipContent>
                  </Tooltip>
                )}
                {hasDeleteFn && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          aria-label={t('list.deleteRecordNamedAria', {
                            name: handlersRef.current.rowLabel(row.original),
                          })}
                          data-testid={TEST_IDS.ROW_ACTION.delete(rowId)}
                          onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDeleteRowId(rowId)
                          }}
                          className={cn(
                            'h-8 w-8 text-muted-foreground',
                            // always visible: there was no `group` on any
                            // ancestor, so group-hover never matched and the
                            // action stayed invisible — and touch has no hover
                            'transition-colors duration-150',
                            'hover:bg-red-50 hover:text-red-600',
                            'dark:hover:bg-red-950 dark:hover:text-red-400'
                          )}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side='top' className='text-xs'>
                        {t('common.delete')}
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </TooltipProvider>
            </div>
          )
        },
        enableSorting: false,
        enableGlobalFilter: false,
      })
    }

    return cols
  }, [
    listFields,
    hasLoadFn,
    hasDeleteFn,
    enableSorting,
    resolve,
    formatDate,
    t,
  ])

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable() returns functions the compiler can't memoize; 'use no memo' above documents the opt-out but this eslint-plugin-react-hooks version still reports the diagnostic regardless (verified empirically), so the disable is the only way to silence it.
  const table = useReactTable({
    data: stableData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter: deferredFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    initialState: {
      pagination: enablePagination
        ? {
            pageSize: 10,
          }
        : undefined,
    },
  })

  // Calculate if there are active filters
  const isFiltered = globalFilter !== '' || columnFilters.length > 0

  // Filter data for mobile view (uses same globalFilter)
  const filteredData = useMemo(() => {
    if (!deferredFilter) return stableData
    const lowerFilter = deferredFilter.toLowerCase()
    return stableData.filter(row => {
      return listFields.some(field => {
        const value = getFieldValue(row, field)
        return value.toLowerCase().includes(lowerFilter)
      })
    })
  }, [stableData, deferredFilter, listFields, getFieldValue])

  // Render both views, use CSS to show/hide based on screen size
  return (
    <div className={cn(useFullHeight && 'h-full flex flex-col', className)}>
      {/* Mobile View - visible only on screens < 768px */}
      <div
        className={cn('md:hidden', useFullHeight && 'flex-1 min-h-0')}
        data-view='mobile'
      >
        <SubListMobileView<TData>
          leftActions={leftActions}
          enableSearch={enableSearch}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isFiltered={isFiltered}
          onRefresh={onRefresh}
          loading={loading}
          filteredData={filteredData}
          listFields={listFields}
          getFieldValue={getFieldValue}
          loadFn={loadFn}
          handleLoadFn={handleLoadFn}
          deleteFn={deleteFn}
          onRequestDelete={setDeleteRowId}
          rowLabel={rowLabel}
          emptyState={emptyState}
        />
      </div>

      {/* Desktop View - visible only on screens >= 768px */}
      <div
        className={cn('hidden md:block', useFullHeight && 'flex-1 min-h-0')}
        data-view='desktop'
      >
        <div
          className={cn(
            'w-full',
            useFullHeight ? 'h-full flex flex-col gap-3' : 'space-y-3'
          )}
        >
          <SubListToolbar<TData>
            leftActions={leftActions}
            enableSearch={enableSearch}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            isFiltered={isFiltered}
            onRefresh={onRefresh}
            loading={loading}
            enableColumnVisibility={enableColumnVisibility}
            table={table}
          />

          <SubListTable<TData>
            table={table}
            columns={columns}
            useFullHeight={useFullHeight}
            loadFn={loadFn}
            handleLoadFn={handleLoadFn}
            emptyState={emptyState}
          />

          {enablePagination && table.getRowModel().rows?.length > 0 && (
            <SubListPagination<TData> table={table} />
          )}
        </div>
      </div>

      <AlertDialog
        open={deleteRowId !== null}
        onOpenChange={open => {
          if (!open) setDeleteRowId(null)
        }}
      >
        {deleteRowId !== null && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('list.confirmDeleteRecordNamedTitle', {
                  name: deleteRow ? rowLabel(deleteRow) : deleteRowId,
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('list.confirmDeleteRecordDescriptionShort')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={async e => {
                  e.preventDefault()
                  await handleDeleteFn(deleteRowId)
                }}
                className='gap-1 bg-red-500 text-white hover:bg-red-600'
              >
                <span>{t('common.delete')}</span>
                <Trash2 className='h-4 w-4' />
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  )
}

export const SubList = memo(SubListComponent) as typeof SubListComponent
