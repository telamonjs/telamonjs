import { describe, it, expect, vi } from 'vitest'
import { createPaginationContext } from './factory'
import type { PaginatedServiceConfig } from './types'
import type { PaginationParams } from '../../types/pagination'

function setup(config: Partial<PaginatedServiceConfig> = {}) {
  const findMany = vi.fn().mockResolvedValue([])
  const count = vi.fn().mockResolvedValue(0)
  const { createPaginatedService } = createPaginationContext({
    prisma: { user: { findMany, count } },
    auth: async () => null,
  })
  const service = createPaginatedService({
    model: 'user',
    defaultOrderBy: 'name',
    defaultOrderDirection: 'asc',
    ...config,
  })
  const orderByFor = async (params: PaginationParams) => {
    await service.list(params)
    return findMany.mock.calls.at(-1)?.[0].orderBy
  }
  return { orderByFor }
}

describe('createPaginatedService sorting', () => {
  it('passes a valid client sort through when sortableFields is absent', async () => {
    const { orderByFor } = setup()
    expect(await orderByFor({ sortBy: 'email', sortOrder: 'desc' })).toEqual({
      email: 'desc',
    })
  })

  it('falls back to the default direction on an invalid sortOrder', async () => {
    const { orderByFor } = setup()
    const sortOrder = 'DROP' as unknown as 'asc'
    expect(await orderByFor({ sortBy: 'email', sortOrder })).toEqual({
      email: 'asc',
    })
  })

  it('normalizes an invalid order inside a SortField array', async () => {
    const { orderByFor } = setup()
    const order = 'sideways' as unknown as 'asc'
    expect(await orderByFor({ sortBy: [{ field: 'email', order }] })).toEqual([
      { email: 'asc' },
    ])
  })

  it('ignores a sortBy outside sortableFields and uses the default sort', async () => {
    const { orderByFor } = setup({ sortableFields: ['name', 'email'] })
    expect(
      await orderByFor({ sortBy: 'passwordHash', sortOrder: 'desc' })
    ).toEqual({ name: 'asc' })
  })

  it('keeps a sortBy listed in sortableFields', async () => {
    const { orderByFor } = setup({ sortableFields: ['name', 'customer.name'] })
    expect(
      await orderByFor({ sortBy: 'customer.name', sortOrder: 'desc' })
    ).toEqual({ customer: { name: 'desc' } })
  })

  it('drops SortField entries outside sortableFields', async () => {
    const { orderByFor } = setup({ sortableFields: ['email'] })
    expect(
      await orderByFor({
        sortBy: [
          { field: 'secret', order: 'asc' },
          { field: 'email', order: 'desc' },
        ],
      })
    ).toEqual([{ email: 'desc' }])
  })

  it('uses the default sort when every SortField is outside sortableFields', async () => {
    const { orderByFor } = setup({ sortableFields: ['email'] })
    expect(
      await orderByFor({ sortBy: [{ field: 'secret', order: 'desc' }] })
    ).toEqual({ name: 'asc' })
  })

  describe('sort field forms', () => {
    it('accepts a legacy TanStack id whose dotted form is listed', async () => {
      const { orderByFor } = setup({ sortableFields: ['customer.name'] })
      expect(
        await orderByFor({ sortBy: 'customer_name', sortOrder: 'desc' })
      ).toEqual({ customer: { name: 'desc' } })
      expect(
        await orderByFor({ sortBy: [{ field: 'customer_name', order: 'asc' }] })
      ).toEqual([{ customer: { name: 'asc' } }])
    })

    it('keeps a listed snake_case field as a scalar', async () => {
      const { orderByFor } = setup({ sortableFields: ['created_at'] })
      expect(
        await orderByFor({ sortBy: 'created_at', sortOrder: 'asc' })
      ).toEqual({ created_at: 'asc' })
    })

    it('orders by a listed relation count in either form', async () => {
      const { orderByFor } = setup({ sortableFields: ['_count.items'] })
      const expected = { items: { _count: 'desc' } }
      expect(
        await orderByFor({ sortBy: '_count.items', sortOrder: 'desc' })
      ).toEqual(expected)
      expect(
        await orderByFor({ sortBy: '_count_items', sortOrder: 'desc' })
      ).toEqual(expected)
    })

    it('does not decode a snake_case default sort that is not listed', async () => {
      const { orderByFor } = setup({
        defaultOrderBy: 'created_at',
        sortableFields: ['name'],
      })
      expect(await orderByFor({ sortBy: 'secret' })).toEqual({
        created_at: 'asc',
      })
    })
  })
})
