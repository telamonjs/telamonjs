'use client'

import { useMemo, type ComponentType, type ReactNode } from 'react'
import { DataTable } from '../../data/DataTable'
import { InfiniteList } from '../../data/InfiniteList'
import type { UseInfiniteListQueryReturn } from '../../hooks/useInfiniteListQuery'
import type { DataTableActionsConfig } from '../../types/actions'
import type { ListConfig } from '../../types/crud'
import type { ColumnFilterConfig } from '../../types/filters'
import type { BulkAction } from '../../data/BulkActionsToolbar'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { resolveColumns } from './resolve-columns'
import type { ListPageProps } from './types'

interface ListPageTableProps<TData> {
  list: ListConfig<TData>
  /** Status bar extra (infinite scroll) — ListPage `footerContent` */
  footerContent?: ReactNode
  data: TData[]
  total: number
  loading: boolean
  error: string | undefined
  tableId: string
  page: number
  pageSize: number
  isServerSidePagination: boolean
  filterOptions: ColumnFilterConfig
  enableBulkActions: boolean
  bulkActions: BulkAction<TData>[]
  headerActions: NonNullable<ListPageProps<TData>['headerActions']>
  cardComponent?: ComponentType<{
    data: TData
    onClick?: (data: TData) => void
  }>
  /** When true, hides DataTable toolbar/title (container with embedded toolbar) */
  embedded: boolean
  /** True when embedded mode with list.infiniteScroll enabled */
  isInfiniteScroll: boolean
  infiniteQuery: UseInfiniteListQueryReturn<TData>
  /** True when dialogs.create is configured (enables the Add button) */
  hasCreateDialog: boolean
  /** Already resolved: undefined when no view dialog is configured */
  onRowClick: ((row: TData) => void) | undefined
  actionsConfig: DataTableActionsConfig<TData> | undefined
  onRefresh: () => Promise<void>
  onExport: () => void
  onAdd: () => void
  /** Search or filters active → "no results" copy instead of "start by adding". */
  hasActiveQuery?: boolean
}

/**
 * ListPageTable - Table render for ListPage (internal)
 *
 * Decision tree:
 * - isInfiniteScroll (embedded or standalone): renders InfiniteList (virtualised).
 *   Embedded mode: toolbar lives above in ListPage; standalone mode: ListPageToolbar
 *   is rendered by ListPage itself above this component.
 * - paginated embedded: DataTable without toolbar/title (toolbar provided by parent).
 * - paginated standalone: DataTable with full toolbar + title section.
 *
 * @internal Extracted from ListPage during the god-component decomposition.
 */
export function ListPageTable<TData>({
  list,
  footerContent,
  data,
  total,
  loading,
  error,
  tableId,
  page,
  pageSize,
  isServerSidePagination,
  filterOptions,
  enableBulkActions,
  bulkActions,
  headerActions,
  cardComponent,
  embedded,
  isInfiniteScroll,
  infiniteQuery,
  hasCreateDialog,
  onRowClick,
  actionsConfig,
  onRefresh,
  onExport,
  onAdd,
  hasActiveQuery = false,
}: ListPageTableProps<TData>) {
  const t = useTelamonjsT()
  // A search/filter with no match is not an empty list: don't say "start by adding".
  const text = useText()
  // Custom empty texts only apply without an active search/filter.
  const emptyTitle = hasActiveQuery ? t('list.noResults') : (text(list.emptyTitle) ?? t('list.empty'))
  const emptyDescription = hasActiveQuery
    ? t('list.noResultsDescription')
    : (text(list.emptyDescription) ?? t('list.emptyDescriptionNewItem'))
  const retry = () => void onRefresh()
  // `meta.exportOnly` columns feed only the export (ListPageToolbar)
  const columns = useMemo(
    () =>
      resolveColumns(
        list.columns.filter(c => !c.meta?.exportOnly),
        text
      ),
    [list.columns, text]
  )
  // A bulk action that succeeds changed server state: refetch the list so the
  // rows reflect it (same guarantee custom row actions already have). Handlers
  // that return { success: false } or throw leave the list as is.
  const refreshingBulkActions = useMemo<BulkAction<TData>[]>(
    () =>
      bulkActions.map((action) => ({
        ...action,
        handler: async (rows: TData[]) => {
          const result = await action.handler(rows)
          const failed = result !== undefined && result !== null && 'success' in result && result.success === false
          if (!failed) await onRefresh()
          return result
        },
      })),
    [bulkActions, onRefresh]
  )

  // DataTable props shared by the embedded and standalone renders
  const sharedTableProps = {
    columns,
    data,
    tableId,
    title: text(list.title) ?? '',
    description: text(list.description) ?? '',
    searchPlaceholder: text(list.searchPlaceholder) || t('list.search'),
    loading,
    error,
    emptyTitle,
    emptyDescription,
    enableSearch: true,
    enableFilters: true,
    filterOptions,
    enableExport: list.enableExport || false,
    enableAdd: hasCreateDialog,
    enableRefresh: true,
    enableColumnVisibility: true,
    enableSelection: enableBulkActions,
    enablePagination: true,
    enableDensity: true,
    enableBulkActions,
    pageSize,
    onRefresh,
    onExport,
    onAdd,
    bulkActions: refreshingBulkActions,
    headerActions,
    className: 'w-full',
    cardComponent,
    manualPagination: isServerSidePagination,
    pageCount: isServerSidePagination ? Math.ceil(total / pageSize) : undefined,
    currentPage: isServerSidePagination ? page : undefined,
    totalItems: isServerSidePagination ? total : undefined,
    onRowClick,
    rowClickNavigation: list.rowClickNavigation,
    enableActions: true,
    actionsConfig,
  }

  // Infinite scroll path: same component for both embedded and standalone.
  // The parent (ListPage) ensures the root container has flex + h-full so
  // InfiniteList has a fixed-height scroll container to work with.
  if (isInfiniteScroll) {
    return (
      <InfiniteList
        columns={columns}
        data={infiniteQuery.data}
        total={infiniteQuery.total}
        isLoading={infiniteQuery.isLoading}
        isFetchingNextPage={infiniteQuery.isFetchingNextPage}
        hasNextPage={infiniteQuery.hasNextPage}
        fetchNextPage={infiniteQuery.fetchNextPage}
        onRowClick={onRowClick}
        actionsConfig={actionsConfig}
        tableId={tableId}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        counterLabel={list.toolbar?.counterLabel}
        footerContent={footerContent}
        error={infiniteQuery.error}
        onRetry={retry}
        enableSelection={enableBulkActions}
        bulkActions={refreshingBulkActions}
      />
    )
  }

  // Paginated embedded: toolbar already rendered by ListPage above.
  if (embedded) {
    return (
      <div
        tabIndex={0}
        role='region'
        aria-label={t('list.recordsRegion')}
        className='flex-1 min-h-0 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
      >
        <DataTable {...sharedTableProps} hideToolbar hideTitleSection />
      </div>
    )
  }

  // Paginated standalone: full DataTable with built-in toolbar + title.
  return (
    <DataTable
      {...sharedTableProps}
      hideToolbar={false}
      hideTitleSection={false}
    />
  )
}
