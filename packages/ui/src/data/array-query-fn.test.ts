import { describe, expect, it, vi } from 'vitest'
import { arrayQueryFn } from './array-query-fn'
import type { ListQueryParams } from '../types/pagination'

interface Row {
  id: number
  name: string
  status: string
  age: number | null
  joined?: Date | null
  team: { name: string }
  active: boolean
}

const rows: Row[] = [
  { id: 1, name: 'Ana', status: 'ACTIVE', age: 30, joined: new Date('2024-03-01'), team: { name: 'Blue' }, active: true },
  { id: 2, name: 'bruno', status: 'INACTIVE', age: null, joined: null, team: { name: 'Red' }, active: false },
  { id: 3, name: 'Clara', status: 'ACTIVE', age: 9, joined: new Date('2023-01-15'), team: { name: 'Green' }, active: true },
  { id: 4, name: 'Dário', status: 'ACTIVE', age: 41, team: { name: 'Blue' }, active: false },
]

const base: ListQueryParams = { page: 1, pageSize: 50 }
const ids = (r: { data: Row[] }) => r.data.map(x => x.id)

describe('arrayQueryFn', () => {
  describe('Rendering', () => {
    it('wraps the array as one PaginatedResponse page', async () => {
      const out = await arrayQueryFn(async () => rows)(base)
      expect(out).toEqual({ data: rows, total: 4, page: 1, pageSize: 50, totalPages: 1 })
    })

    it('passes the list params to fetchAll (scope, server-side filters)', async () => {
      const fetchAll = vi.fn(async () => rows)
      const params = { ...base, search: 'x', filters: { parentId: '7' } }
      await arrayQueryFn(fetchAll)(params)
      expect(fetchAll).toHaveBeenCalledWith(params)
    })
  })

  describe('State Management', () => {
    it('slices page/pageSize and reports the filtered total', async () => {
      const queryFn = arrayQueryFn(async () => rows)
      const p2 = await queryFn({ page: 2, pageSize: 3 })
      expect(ids(p2)).toEqual([4])
      expect(p2).toMatchObject({ total: 4, page: 2, pageSize: 3, totalPages: 2 })
    })

    it('searches top-level string/number values, case- and accent-insensitive', async () => {
      const queryFn = arrayQueryFn(async () => rows)
      expect(ids(await queryFn({ ...base, search: 'BRU' }))).toEqual([2])
      expect(ids(await queryFn({ ...base, search: 'dario' }))).toEqual([4])
      expect(ids(await queryFn({ ...base, search: '41' }))).toEqual([4])
      // nested objects are not searched by default
      expect(ids(await queryFn({ ...base, search: 'green' }))).toEqual([])
    })

    it('searches only searchFields when given (dotted paths)', async () => {
      const queryFn = arrayQueryFn(async () => rows, { searchFields: ['team.name'] })
      expect(ids(await queryFn({ ...base, search: 'blue' }))).toEqual([1, 4])
      expect(ids(await queryFn({ ...base, search: 'ana' }))).toEqual([])
    })

    it('filters by equality, comparing as strings (toolbar values are strings)', async () => {
      const queryFn = arrayQueryFn(async () => rows)
      expect(ids(await queryFn({ ...base, filters: { status: 'ACTIVE', active: 'true' } }))).toEqual([1, 3])
      expect(ids(await queryFn({ ...base, filters: { 'team.name': 'Blue' } }))).toEqual([1, 4])
      expect(ids(await queryFn({ ...base, filters: { age: 9 } }))).toEqual([3])
    })

    it('filters only filterFields when given (keys fetchAll consumes are left alone)', async () => {
      const queryFn = arrayQueryFn(async () => rows, { filterFields: ['status'] })
      const out = await queryFn({ ...base, filters: { parentId: '7', status: 'INACTIVE' } })
      expect(ids(out)).toEqual([2])
    })

    it('sorts strings, numbers and dates; nulls last in both directions', async () => {
      const queryFn = arrayQueryFn(async () => rows)
      expect(ids(await queryFn({ ...base, sortBy: 'name' }))).toEqual([1, 2, 3, 4])
      expect(ids(await queryFn({ ...base, sortBy: 'name', sortOrder: 'desc' }))).toEqual([4, 3, 2, 1])
      expect(ids(await queryFn({ ...base, sortBy: 'age' }))).toEqual([3, 1, 4, 2])
      expect(ids(await queryFn({ ...base, sortBy: 'age', sortOrder: 'desc' }))).toEqual([4, 1, 3, 2])
      expect(ids(await queryFn({ ...base, sortBy: 'joined', sortOrder: 'desc' }))).toEqual([1, 3, 2, 4])
      expect(ids(await queryFn({ ...base, sortBy: 'team.name' }))).toEqual([1, 4, 3, 2])
    })

    it('filters, then searches, then sorts, then pages', async () => {
      const queryFn = arrayQueryFn(async () => rows)
      const out = await queryFn({
        page: 1,
        pageSize: 1,
        search: 'a',
        sortBy: 'age',
        sortOrder: 'desc',
        filters: { status: 'ACTIVE' },
      })
      expect(ids(out)).toEqual([4])
      expect(out).toMatchObject({ total: 3, totalPages: 3 })
    })

    it('calls fetchAll on every request (no caching)', async () => {
      const fetchAll = vi.fn(async () => rows)
      const queryFn = arrayQueryFn(fetchAll)
      await queryFn({ page: 1, pageSize: 2 })
      await queryFn({ page: 2, pageSize: 2 })
      expect(fetchAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('Edge Cases', () => {
    it.each([undefined, null, ''])('skips a %j filter value', async value => {
      const out = await arrayQueryFn(async () => rows)({ ...base, filters: { status: value } })
      expect(out.total).toBe(4)
    })

    it('ignores a blank search', async () => {
      const out = await arrayQueryFn(async () => rows)({ ...base, search: '   ' })
      expect(out.total).toBe(4)
    })

    it('does not mutate the fetched array', async () => {
      const source = [...rows]
      await arrayQueryFn(async () => source)({ ...base, sortBy: 'name', sortOrder: 'desc' })
      expect(source).toEqual(rows)
    })

    it('answers an empty array as an empty page', async () => {
      const out = await arrayQueryFn<Row>(async () => [])(base)
      expect(out).toEqual({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 })
    })

    it('ignores an unknown sort column', async () => {
      const out = await arrayQueryFn(async () => rows)({ ...base, sortBy: 'nope' })
      expect(ids(out)).toEqual([1, 2, 3, 4])
    })
  })
})
