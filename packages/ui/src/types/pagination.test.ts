/**
 * TDD for A3: `asQueryFn` — official adapter from a consumer's
 * narrower list-params fn (typically `sortBy?: string`) to the `queryFn`
 * shape `CrudConfig.query` expects (`sortBy?: string | SortField[]`).
 */
import { describe, it, expect } from 'vitest'
import { asQueryFn } from './pagination'
import type { PaginationParams, PaginatedResponse } from './pagination'
import type { QueryConfig } from './crud'

interface User {
  id: string
  name: string
}

// A consumer client fn: narrower `sortBy` (string only) and extra params
// (`onlyActive`) the library type doesn't know about — the exact shape that
// forced consumers to hand-roll this cast locally before v6.8.0.
interface ClientParams {
  page: number
  pageSize: number
  sortBy?: string
  onlyActive?: boolean
}

async function listUsers(
  params: ClientParams
): Promise<PaginatedResponse<User>> {
  return {
    data: [{ id: '1', name: `page-${params.page}` }],
    total: 1,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: 1,
  }
}

describe('asQueryFn', () => {
  it('forwards params through to the wrapped fn and returns its result', async () => {
    const queryFn = asQueryFn<User>(listUsers)
    const params: PaginationParams = { page: 2, pageSize: 10, sortBy: 'name' }

    const result = await queryFn(params)

    expect(result.data).toEqual([{ id: '1', name: 'page-2' }])
    expect(result.page).toBe(2)
  })

  it('type-check: adapted fn is assignable to QueryConfig.queryFn (compiles despite narrower ClientParams)', () => {
    const queryFn: QueryConfig<User>['queryFn'] = asQueryFn<User>(listUsers)
    expect(typeof queryFn).toBe('function')
  })
})
