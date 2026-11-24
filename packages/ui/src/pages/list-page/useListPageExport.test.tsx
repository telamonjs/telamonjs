import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useListPageExport } from './useListPageExport'
import type { CrudConfig, ListQueryState } from '../../types/crud'
import type { PaginationParams } from '../../types/pagination'

interface Row {
  id: number
}

const listQuery: ListQueryState = {
  search: 'ana',
  filters: { status: 'ACTIVE' },
  sorting: [{ field: 'name', order: 'asc' }],
  params: {
    page: 2,
    pageSize: 10,
    search: 'ana',
    sortBy: [{ field: 'name', order: 'asc' }],
    filters: { status: 'ACTIVE' },
  },
}

function config(list: Partial<CrudConfig<Row>['list']>, queryFn = vi.fn()): CrudConfig<Row> {
  return {
    module: { name: 'rows', title: 'Rows', description: '', route: '/rows' },
    list: { title: 'Rows', description: '', columns: [], ...list },
    query: { queryKey: ['rows'], queryFn },
    mutations: {},
  }
}

const run = (cfg: CrudConfig<Row>, total = 0) =>
  renderHook(() => useListPageExport<Row>({ config: cfg, listQuery, total })).result.current

describe('useListPageExport', () => {
  describe('State Management', () => {
    it('no export without enableExport or onExport', () => {
      expect(run(config({}))).toBeUndefined()
    })

    it('enableExport alone keeps the default: loaded rows, no loadAll', () => {
      const out = run(config({ enableExport: true, exportFormats: ['csv'] }))
      expect(out).toEqual({ formats: ['csv'], filename: 'rows' })
    })

    it('exportAll: "All" fetches every page with the list query through query.queryFn', async () => {
      const queryFn = vi.fn(async (p: PaginationParams) => ({
        data: [{ id: p.page }],
        total: 2,
        page: p.page,
        pageSize: p.pageSize,
        totalPages: 2,
      }))
      const out = run(
        config({ enableExport: true, exportAll: true, defaultPageSize: 100, exportFilename: 'clientes' }, queryFn),
        2
      )
      expect(out?.allCount).toBe(2)
      expect(out?.filename).toBe('clientes')

      const onProgress = vi.fn()
      const result = await out!.loadAll!({ signal: new AbortController().signal, onProgress })
      expect(result).toEqual({ rows: [{ id: 1 }, { id: 2 }], total: 2 })
      expect(queryFn).toHaveBeenCalledWith({
        page: 1,
        pageSize: 100,
        search: 'ana',
        sortBy: 'name',
        sortOrder: 'asc',
        filters: { status: 'ACTIVE' },
      })
    })

    it('exportAll options set the page size and the row cap', async () => {
      const queryFn = vi.fn(async (p: PaginationParams) => ({
        data: Array.from({ length: p.pageSize }, (_, i) => ({ id: (p.page - 1) * p.pageSize + i })),
        total: 1_000,
        page: p.page,
        pageSize: p.pageSize,
        totalPages: 1_000 / p.pageSize,
      }))
      const out = run(config({ enableExport: true, exportAll: { pageSize: 20, maxRows: 30 } }, queryFn))
      const result = await out!.loadAll!({ signal: new AbortController().signal, onProgress: () => {} })
      expect(result.rows).toHaveLength(30)
      expect(result.total).toBe(1_000)
      expect(queryFn.mock.calls.map(([p]) => p.pageSize)).toEqual([20, 20])
    })

    it('onExport wins over exportAll, needs no enableExport and receives the list query', async () => {
      const onExport = vi.fn()
      const out = run(config({ exportAll: true, onExport }))
      expect(out?.loadAll).toBeUndefined()
      await out!.onServerExport!('excel')
      expect(onExport).toHaveBeenCalledWith(listQuery, 'excel')
    })
  })
})
