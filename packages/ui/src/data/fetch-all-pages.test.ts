import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages } from './fetch-all-pages'
import type { PaginatedResponse, PaginationParams } from '../types/pagination'

interface Row {
  id: number
}

/** A backend of `count` rows that honors page/pageSize. */
function backend(count: number) {
  return vi.fn(async (p: PaginationParams): Promise<PaginatedResponse<Row>> => {
    const start = (p.page - 1) * p.pageSize
    const data = Array.from({ length: Math.max(0, Math.min(p.pageSize, count - start)) }, (_, i) => ({
      id: start + i + 1,
    }))
    return { data, total: count, page: p.page, pageSize: p.pageSize, totalPages: Math.ceil(count / p.pageSize) }
  })
}

const params: PaginationParams = {
  page: 3,
  pageSize: 10,
  search: 'ana',
  sortBy: [{ field: 'name', order: 'desc' }],
  filters: { status: 'ACTIVE' },
}

describe('fetchAllPages', () => {
  describe('State Management', () => {
    it('fetches every page with the list query, sort serialized like the list does', async () => {
      const queryFn = backend(250)
      const onProgress = vi.fn()
      const out = await fetchAllPages({ queryFn, params, pageSize: 100, maxRows: 10_000, onProgress })

      expect(out.total).toBe(250)
      expect(out.rows).toHaveLength(250)
      expect(queryFn).toHaveBeenCalledTimes(3)
      expect(queryFn.mock.calls.map(([p]) => p.page)).toEqual([1, 2, 3])
      expect(queryFn).toHaveBeenCalledWith({
        page: 1,
        pageSize: 100,
        search: 'ana',
        sortBy: 'name',
        sortOrder: 'desc',
        filters: { status: 'ACTIVE' },
      })
      expect(onProgress.mock.calls).toEqual([
        [100, 250],
        [200, 250],
        [250, 250],
      ])
    })

    it('stops at maxRows and reports the server total (truncated export)', async () => {
      const queryFn = backend(1_000)
      const out = await fetchAllPages({ queryFn, params, pageSize: 100, maxRows: 250 })
      expect(out.rows).toHaveLength(250)
      expect(out.total).toBe(1_000)
      expect(queryFn).toHaveBeenCalledTimes(3)
    })
  })

  describe('Edge Cases', () => {
    it('keeps a string sortBy/sortOrder as given and drops an empty sort', async () => {
      const queryFn = backend(1)
      await fetchAllPages({ queryFn, params: { page: 1, pageSize: 5, sortBy: 'a', sortOrder: 'asc' }, pageSize: 5, maxRows: 10 })
      expect(queryFn.mock.calls[0]?.[0]).toMatchObject({ sortBy: 'a', sortOrder: 'asc' })
      await fetchAllPages({ queryFn, params: { page: 1, pageSize: 5, sortBy: [] }, pageSize: 5, maxRows: 10 })
      expect(queryFn.mock.calls[1]?.[0]).toMatchObject({ sortBy: undefined, sortOrder: undefined })
    })

    it("sends a data-path sort field verbatim (list.sortParam: 'path')", async () => {
      const queryFn = backend(1)
      await fetchAllPages({ queryFn, params: { page: 1, pageSize: 5, sortBy: [{ field: 'customer.name', order: 'asc' }] }, pageSize: 5, maxRows: 10 })
      expect(queryFn.mock.calls[0]?.[0]).toMatchObject({ sortBy: 'customer.name', sortOrder: 'asc' })
    })

    it('stops on an empty page even if totalPages lies (no endless loop)', async () => {
      const queryFn = vi.fn(async (p: PaginationParams) => ({
        data: p.page === 1 ? [{ id: 1 }] : [],
        total: 999,
        page: p.page,
        pageSize: p.pageSize,
        totalPages: 999,
      }))
      const out = await fetchAllPages({ queryFn, params, pageSize: 1, maxRows: 10_000 })
      expect(out.rows).toEqual([{ id: 1 }])
      expect(queryFn).toHaveBeenCalledTimes(2)
    })

    it('drops rows repeated across pages (same id), like the infinite list', async () => {
      const queryFn = vi.fn(async (p: PaginationParams) => ({
        data: p.page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 2 }, { id: 3 }],
        total: 4,
        page: p.page,
        pageSize: 2,
        totalPages: 2,
      }))
      const out = await fetchAllPages({ queryFn, params, pageSize: 2, maxRows: 100 })
      expect(out.rows.map(r => r.id)).toEqual([1, 2, 3])
    })

    it('an aborted signal stops before the next request and rejects with AbortError', async () => {
      const queryFn = backend(500)
      const controller = new AbortController()
      const run = fetchAllPages({
        queryFn,
        params,
        pageSize: 100,
        maxRows: 10_000,
        signal: controller.signal,
        onProgress: loaded => {
          if (loaded === 200) controller.abort()
        },
      })
      await expect(run).rejects.toMatchObject({ name: 'AbortError' })
      expect(queryFn).toHaveBeenCalledTimes(2)
    })

    it('propagates a failing page', async () => {
      const queryFn = vi.fn().mockRejectedValue(new Error('500'))
      await expect(fetchAllPages({ queryFn, params, pageSize: 10, maxRows: 10 })).rejects.toThrow('500')
    })
  })
})
