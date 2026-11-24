'use client'

import { useMemo } from 'react'
import { fetchAllPages } from '../../data/fetch-all-pages'
import type { DataTableExportMenuProps } from '../../data/datatable/types'
import type { CrudConfigWithAnyForm, ListQueryState } from '../../types/crud'

/** Default row cap of `list.exportAll` */
export const EXPORT_ALL_MAX_ROWS = 10_000

interface UseListPageExportParams<TData> {
  config: CrudConfigWithAnyForm<TData>
  /** The list's current query (search, filters, sort) */
  listQuery: ListQueryState
  /** Rows matching on the server (the "All" count) */
  total: number
}

/**
 * Export menu props of a ListPage, from `list.enableExport` / `exportAll` /
 * `exportFormats` / `onExport` — shared by the list toolbar and the paginated
 * DataTable. `undefined` when the list has no export.
 *
 * - `onExport`: the app exports (formats only, gets the current query);
 * - `exportAll`: "All" fetches every matching page through `query.queryFn`;
 * - neither: "All" exports the loaded rows (unchanged default).
 *
 * @internal
 */
export function useListPageExport<TData>({
  config,
  listQuery,
  total,
}: UseListPageExportParams<TData>): DataTableExportMenuProps<TData> | undefined {
  const { module, list, query } = config
  const { enableExport, exportAll, exportFormats, exportFilename, onExport } =
    list
  const listPageSize = list.defaultPageSize || 50

  return useMemo(() => {
    if (!enableExport && !onExport) return undefined
    const base: DataTableExportMenuProps<TData> = {
      formats: exportFormats,
      filename: exportFilename || module.name,
    }
    if (onExport) {
      return { ...base, onServerExport: format => onExport(listQuery, format) }
    }
    if (!exportAll) return base
    const options = typeof exportAll === 'object' ? exportAll : {}
    return {
      ...base,
      allCount: total,
      loadAll: ({ signal, onProgress }) =>
        fetchAllPages({
          queryFn: query.queryFn,
          params: listQuery.params,
          pageSize: options.pageSize ?? listPageSize,
          maxRows: options.maxRows ?? EXPORT_ALL_MAX_ROWS,
          signal,
          onProgress,
        }),
    }
  }, [
    enableExport,
    onExport,
    exportAll,
    exportFormats,
    exportFilename,
    module.name,
    listQuery,
    total,
    query.queryFn,
    listPageSize,
  ])
}
