import { describe, it, expect } from 'vitest'
import { createPaginatedResponse, sanitizePaginationParams } from './contract.js'

describe('createPaginatedResponse', () => {
  it('derives totalPages, rounding up', () => {
    expect(createPaginatedResponse(['a'], 21, 3, 10)).toEqual({
      data: ['a'],
      total: 21,
      page: 3,
      pageSize: 10,
      totalPages: 3,
    })
  })
})

describe('sanitizePaginationParams', () => {
  it('defaults to page 1 and the default page size', () => {
    expect(sanitizePaginationParams({ defaultPageSize: 25 })).toEqual({ page: 1, pageSize: 25 })
  })

  it('clamps and floors client values', () => {
    expect(sanitizePaginationParams({ page: -2, pageSize: 500 })).toEqual({ page: 1, pageSize: 100 })
    expect(sanitizePaginationParams({ page: 2.7, pageSize: 0.5, maxPageSize: 50 })).toEqual({
      page: 2,
      pageSize: 1,
    })
  })

  it('falls back on non-finite values instead of passing NaN to the query', () => {
    expect(sanitizePaginationParams({ page: NaN, pageSize: NaN, defaultPageSize: 25 })).toEqual({
      page: 1,
      pageSize: 25,
    })
    expect(sanitizePaginationParams({ page: Infinity, pageSize: Infinity })).toEqual({
      page: 1,
      pageSize: 10,
    })
    expect(sanitizePaginationParams({ page: -Infinity, pageSize: -Infinity })).toEqual({
      page: 1,
      pageSize: 10,
    })
    const abc = 'abc' as unknown as number
    expect(sanitizePaginationParams({ page: abc, pageSize: abc })).toEqual({ page: 1, pageSize: 10 })
    const two = '2' as unknown as number
    expect(sanitizePaginationParams({ page: two, pageSize: two })).toEqual({ page: 2, pageSize: 2 })
  })
})
