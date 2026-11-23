'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useTableColumnFilters,
  useTableSorting,
  useTableGlobalFilter,
  useTablePage,
  useTablePageSize,
  useDataTableActions,
} from '../stores/datatable-store'
import { withComponent } from '../utils/logger'
import { ErrorBoundary } from '../components/utilities/ErrorBoundary'
import type { FormSection } from '../components/forms/AdminForm'
import { useCrudMutations } from '../hooks/useCrudMutations'
import { ColumnFilterConfig } from '../types/filters'
import type { ListPageProps } from './list-page/types'
import { useUrlSync } from '../hooks/useUrlSync'
import { useListPageUrlSync } from './list-page/useListPageUrlSync'
import { useListPageToolbar, toolbarQueryFilters } from './list-page/useListPageToolbar'
import { useListPageData } from './list-page/useListPageData'
import { useListPageDialogs } from './list-page/useListPageDialogs'
import { useListPageActions } from './list-page/useListPageActions'
import { ListPageToolbar } from './list-page/ListPageToolbar'
import { ListPageTable } from './list-page/ListPageTable'
import { ListPageDialogs } from './list-page/ListPageDialogs'

const logger = withComponent('ListPage')

/**
 * ListPage - Complete list page driven by a single `CrudConfig`.
 *
 * @category Pages
 * @status stable
 *
 * @description
 * Renders the toolbar (search, filters, actions), the table (infinite scroll by
 * default, or paginated), row actions and the create/edit/view/delete dialogs,
 * all from one `CrudConfig` object. Data comes from React Query:
 * `config.query.queryFn` must resolve a `PaginatedResponse<T>` and each
 * `config.mutations.*.mutationFn` must resolve `{ success, data? }`.
 *
 * **Internal structure:** ListPage is an orchestrator — state and behaviors
 * live in the internal `./list-page/` hooks and components (url-sync,
 * toolbar, data, dialogs, actions, table).
 *
 * @example
 * ```tsx
 * // config.tsx
 * 'use client'
 * import { type CrudConfig } from '@telamonjs/ui'
 * import { usersApi } from '@/lib/api/users'
 *
 * export const usersConfig: CrudConfig<User, UserFormData> = {
 *   module: { name: 'users', title: 'Users', route: '/admin/users' },
 *   list: { columns, searchPlaceholder: 'Search users...' },
 *   form: { sections, validation },
 *   query: { queryKey: ['users'], queryFn: usersApi.list },
 *   mutations: {
 *     create: {
 *       mutationFn: async data => ({ success: true, data: await usersApi.create(data) }),
 *       invalidates: [['users']],
 *     },
 *   },
 * }
 *
 * // page.tsx
 * export default function UsersPage() {
 *   return <ListPage config={usersConfig} />
 * }
 * ```
 *
 * @see apps/docs/content/docs/patterns/admin-module-structure.mdx and apps/docs/content/docs/patterns/listpage-pattern.mdx
 */
export function ListPage<TData>({
  config,
  tableId: providedTableId,
  urlSync = false,
  urlFilters = {},
  cardComponent,
  className,
  onRefreshAction,
  filterOptions: initialFilterOptions,
  loadFilterOptions,
  enableBulkActions = false,
  bulkActions = [],
  headerActions = [],
  disableAutoRefresh = true,
  errorBoundary = true,
  errorFallback,
  toolbarPrepend,
  toolbarContent,
  footerContent,
  filtersPanel,
  activeFilters,
  onClearFilters,
  embedded = false,
  dialogUrlSync = true,
}: ListPageProps<TData>) {
  // Destructure config for easier access
  const {
    module,
    list,
    form,
    mutations,
    actionsConfig: rawActionsConfig,
    dialogs,
  } = config
  const actionsDisabled = rawActionsConfig === false
  const actionsConfig = actionsDisabled ? undefined : rawActionsConfig

  // FormConfig accepts `FormSection | FormSection[]`; the integrated dialogs
  // expect an array (existing runtime contract — type-level cast only).
  const formSections = form.sections as FormSection[]

  const [filterOptions, setFilterOptions] = useState<ColumnFilterConfig>(
    initialFilterOptions || {}
  )

  // Use module.route as default tableId if not provided
  const tableId = providedTableId || module.route

  // Get actions from Zustand store
  const {
    initTable,
    setGlobalFilter: setStoreGlobalFilter,
    setPage: setStorePage,
  } = useDataTableActions(tableId)

  // Initialize table with defaultPageSize and defaultSortBy from config
  useEffect(() => {
    initTable({
      pageSize: list.defaultPageSize || 10,
      ...(list.defaultSortBy
        ? {
            sorting: [
              {
                field: list.defaultSortBy,
                order: list.defaultSortOrder || 'asc',
              },
            ],
          }
        : {}),
    })
  }, [
    initTable,
    list.defaultPageSize,
    list.defaultSortBy,
    list.defaultSortOrder,
  ])

  // Get state from Zustand store
  const columnFilters = useTableColumnFilters(tableId)
  const sorting = useTableSorting(tableId)
  const search = useTableGlobalFilter(tableId)
  const page = useTablePage(tableId)
  const pageSize = useTablePageSize(tableId)

  // Get mutations (for delete actions, etc.)
  const { createMutation, updateMutation, deleteMutation } = useCrudMutations({
    config,
  })

  // Keys of the declarative toolbar filters: when they are also listed in
  // `urlFilters`, the toolbar select is seeded from the URL and keeps the URL
  // updated. Before, `?status=x` filtered the data but the select
  // still showed "all".
  const toolbarFilterKeys = useMemo(
    () => (list.toolbar?.filters ?? []).map(f => f.key),
    [list.toolbar?.filters]
  )

  // Seed for the toolbar selects, read from the URL once at mount (the hook
  // keeps its own state afterwards)
  const urlSeed = useUrlSync()
  const initialToolbarFilters = useMemo(() => {
    if (!urlSync) return undefined
    const seed: Record<string, string> = {}
    for (const key of toolbarFilterKeys) {
      if (!(key in urlFilters)) continue
      const value = urlSeed.getParam(key)
      if (value) seed[key] = value
    }
    return seed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Embedded toolbar state (declarative filters + debounced search)
  const {
    toolbarFilters,
    localSearch,
    handleToolbarSearch,
    handleToolbarFilterChange,
  } = useListPageToolbar({
    list,
    search,
    setStoreGlobalFilter,
    setStorePage,
    initialFilters: initialToolbarFilters,
  })

  // Toolbar selects that are also URL filters follow the user into the URL
  const liveFilters = useMemo(() => {
    if (!urlSync) return undefined
    const live: Record<string, string | undefined> = {}
    for (const key of toolbarFilterKeys) {
      if (key in urlFilters) live[key] = toolbarFilters[key]
    }
    return live
  }, [urlSync, urlFilters, toolbarFilterKeys, toolbarFilters])

  // URL sync: extract custom filters from URL + keep pagination state synced
  const customFiltersFromUrl = useListPageUrlSync({
    urlSync,
    urlFilters,
    page,
    pageSize,
    search,
    sorting,
    liveFilters,
  })

  // A toolbar-owned key must not be re-applied from the mount-time URL value
  // after the user clears the select
  const customFilters = useMemo(() => {
    if (toolbarFilterKeys.length === 0) return customFiltersFromUrl
    const rest: Record<string, string | number> = {}
    for (const [k, v] of Object.entries(customFiltersFromUrl)) {
      if (!toolbarFilterKeys.includes(k)) rest[k] = v
    }
    return rest
  }, [customFiltersFromUrl, toolbarFilterKeys])

  // Use explicit flag from config
  const isServerSidePagination = list.serverSidePagination || false

  // Merge custom filters, column filters, and toolbar filters
  const allFilters = useMemo(
    () => ({
      ...customFilters,
      ...columnFilters,
      ...toolbarQueryFilters(toolbarFilters),
    }),
    [customFilters, columnFilters, toolbarFilters]
  )

  // Default: infinite scroll (opt-out with list.infiniteScroll === false).
  // The embedded check previously gated infinite to tabs only; now both
  // embedded and standalone use InfiniteList by default. The root container
  // switches to flex+h-full for standalone-infinite so InfiniteList has a
  // bounded scroll container. Opt-out (infiniteScroll: false) keeps the
  // classic container/space-y-6 layout with DataTable pagination.
  const isInfiniteScroll = list.infiniteScroll !== false

  // Data fetching (paginated or infinite) + refresh + focus revalidation
  const {
    data,
    total,
    loading,
    error,
    infiniteQuery,
    effectiveTotal,
    effectiveLoading,
    effectiveIsFetching,
    handleRefresh,
  } = useListPageData({
    config,
    page,
    pageSize,
    search,
    sorting,
    allFilters,
    isInfiniteScroll,
    disableAutoRefresh,
    onRefreshAction,
  })

  // Root element ref — lets useDialogUrlSync gate URL→state opening by visibility
  // (keep-alive tab dashboards co-mount several ListPages sharing one param).
  const rootRef = useRef<HTMLDivElement>(null)

  // Dialog states + handlers (create/edit/view, view -> edit handoff)
  const {
    editDialogOpen,
    setEditDialogOpen,
    selectedEntityId,
    selectedEditRow,
    selectedViewRow,
    viewDialogOpen,
    setViewDialogOpen,
    selectedViewEntityId,
    createDialogOpen,
    setCreateDialogOpen,
    openEditForRow,
    openViewForRow,
    handleAdd,
    handleRowClick,
    handleViewDialogEdit,
    handleViewDialogDelete,
    handleEditDialogSuccess,
    createSubmitValues,
    updateSubmitValues,
    fetchActionWrapper,
  } = useListPageDialogs({
    dialogs,
    mutations,
    actionsConfig,
    // Rows the list actually shows: in infinite mode (the default) the paginated `data`
    // is always empty, so headerRow (edit) and the view-dialog delete row came up empty.
    data: isInfiniteScroll ? infiniteQuery.data : data,
    createMutation,
    updateMutation,
    deleteMutation,
    handleRefresh,
    rootRef,
    dialogUrlSync,
  })

  // Final actions column config (dialog handler overrides + onAfterAction)
  const finalActionsConfig = useListPageActions({
    actionsDisabled,
    actionsConfig,
    dialogs,
    mutations,
    deleteMutation,
    handleRefresh,
    openEditForRow,
    openViewForRow,
  })

  // Load filter options dynamically if loader function provided
  useEffect(() => {
    if (loadFilterOptions) {
      loadFilterOptions()
        .then(options => {
          setFilterOptions(options)
        })
        .catch(error => {
          logger.error('Failed to load filter options', {
            error: error instanceof Error ? error.message : String(error),
          })
        })
    }
  }, [loadFilterOptions])

  const handleExport = () => {
    // Check if enableExport in config
    if (!list.enableExport) return

    // Default export to CSV
    const csvContent = data
      .map(item => Object.values(item as Record<string, unknown>).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = list.exportFilename || `${module.name}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Root container class:
  // - Infinite (embedded or standalone): flex column, full height, min-h-0 so
  //   InfiniteList's internal scroll container works correctly. In a shell with
  //   <main class="flex-1 overflow-auto">, the page takes up the available
  //   height and the list becomes the scroll-root (not the window).
  // - Paginated standalone: classic container with spacing (unchanged layout).
  const rootClassName =
    isInfiniteScroll || embedded
      ? `flex flex-col h-full min-h-0 ${className || ''}`
      : `container mx-auto space-y-6 p-4 lg:p-6 ${className || ''}`

  // Extract content to enable ErrorBoundary wrapping
  const content = (
    <>
      <div ref={rootRef} className={rootClassName}>
        {/* Toolbar for embedded mode AND standalone-infinite.
            In paginated standalone the DataTable renders its own toolbar. */}
        {(embedded || isInfiniteScroll) && (
          <ListPageToolbar<TData>
            list={list}
            toolbarPrepend={toolbarPrepend}
            toolbarContent={toolbarContent}
            filtersPanel={filtersPanel}
            activeFilters={activeFilters}
            onClearFilters={onClearFilters}
            localSearch={localSearch}
            onSearchChange={handleToolbarSearch}
            toolbarFilters={toolbarFilters}
            onFilterChange={handleToolbarFilterChange}
            total={effectiveTotal}
            loading={effectiveLoading}
            isFetching={effectiveIsFetching}
            showAddButton={!!dialogs?.create}
            onAdd={handleAdd}
            onRefresh={handleRefresh}
            exportData={isInfiniteScroll ? infiniteQuery.data : data}
            exportFilename={module.name}
          />
        )}

        <ListPageTable<TData>
          list={list}
          footerContent={footerContent}
          data={data}
          total={total}
          loading={loading}
          error={error}
          tableId={tableId}
          page={page}
          pageSize={pageSize}
          isServerSidePagination={isServerSidePagination}
          filterOptions={filterOptions}
          enableBulkActions={enableBulkActions}
          bulkActions={bulkActions}
          headerActions={headerActions}
          cardComponent={cardComponent}
          embedded={embedded}
          isInfiniteScroll={isInfiniteScroll}
          infiniteQuery={infiniteQuery}
          hasCreateDialog={!!dialogs?.create}
          onRowClick={dialogs?.view ? handleRowClick : undefined}
          actionsConfig={finalActionsConfig}
          onRefresh={handleRefresh}
          onExport={handleExport}
          onAdd={handleAdd}
          hasActiveQuery={Boolean(search) || Object.keys(allFilters).length > 0}
        />
      </div>

      {/* Integrated dialogs (Create/Edit/View) */}
      <ListPageDialogs<TData>
        dialogs={dialogs}
        mutations={mutations}
        form={form}
        formSections={formSections}
        actionsConfig={actionsConfig}
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        selectedEntityId={selectedEntityId}
        selectedEditRow={selectedEditRow}
        selectedViewRow={selectedViewRow}
        fetchActionWrapper={fetchActionWrapper}
        updateSubmitValues={updateSubmitValues}
        handleEditDialogSuccess={handleEditDialogSuccess}
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={setViewDialogOpen}
        selectedViewEntityId={selectedViewEntityId}
        handleViewDialogEdit={handleViewDialogEdit}
        handleViewDialogDelete={handleViewDialogDelete}
        createDialogOpen={createDialogOpen}
        setCreateDialogOpen={setCreateDialogOpen}
        createSubmitValues={createSubmitValues}
        handleRefresh={handleRefresh}
      />
    </>
  )

  // Wrap with ErrorBoundary (opt-out via errorBoundary prop)
  if (!errorBoundary) {
    return content
  }

  return <ErrorBoundary fallback={errorFallback}>{content}</ErrorBoundary>
}
