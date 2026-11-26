import { describe, it, expect, vi } from 'vitest'
import { createPaginationContext } from './pagination.js'
import type { AuthUser, PaginatedServiceConfig, PaginationContext } from './types.js'
import type { PaginationParams } from '../contract.js'

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
  const orderByFor = async (params: Omit<PaginationParams, 'page' | 'pageSize'>) => {
    await service.list({ page: 1, pageSize: 10, ...params })
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

describe('getFilterOptions labels', () => {
  function withRecords(records: Record<string, unknown>[], context: object = {}) {
    const { createPaginatedService } = createPaginationContext({
      prisma: {
        user: {
          // groupBy rows: one per distinct value of the grouped field
          groupBy: vi.fn(async ({ by: [field] }: { by: string[] }) => {
            const counts = new Map<unknown, number>()
            for (const r of records) counts.set(r[field], (counts.get(r[field]) ?? 0) + 1)
            return [...counts].map(([value, n]) => ({ [field]: value, _count: { _all: n } }))
          }),
          findMany: vi.fn(),
          count: vi.fn(),
        },
      },
      auth: async () => null,
      ...context,
    })
    return createPaginatedService({
      model: 'user',
      filters: {
        active: 'boolean',
        hasOrders: { type: 'boolean', transform: v => (v === 'true' ? { some: {} } : { none: {} }) },
      },
    })
  }

  it('labels boolean values in English by default', async () => {
    const options = await withRecords([{ active: true }, { active: false }]).getFilterOptions!()
    expect(options.active.map(o => o.label)).toEqual(['Active', 'Inactive'])
    expect(options.hasOrders.map(o => o.label)).toEqual(['Yes', 'No'])
  })

  it('takes the labels of the locale from filterLabels', async () => {
    const filterLabels = vi.fn((locale?: string) =>
      locale === 'pt-BR'
        ? { yes: 'Sim', no: 'Não', active: 'Ativo', inactive: 'Inativo' }
        : { yes: 'Y', no: 'N', active: 'A', inactive: 'I' }
    )
    const options = await withRecords([{ active: true }], { filterLabels }).getFilterOptions!('pt-BR')
    expect(filterLabels).toHaveBeenCalledWith('pt-BR')
    expect(options.active).toEqual([{ value: 'true', label: 'Ativo', count: 1 }])
    expect(options.hasOrders.map(o => o.label)).toEqual(['Sim', 'Não'])
  })
})

describe('createCachedPaginatedService without cache', () => {
  it('reports through onWarning and returns the plain service', () => {
    const onWarning = vi.fn()
    const { createCachedPaginatedService } = createPaginationContext({
      prisma: { user: { findMany: vi.fn(), count: vi.fn() } },
      auth: async () => null,
      onWarning,
    })
    const service = createCachedPaginatedService({ model: 'user' })
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('Cache not configured'))
    expect(typeof service.list).toBe('function')
  })
})

describe('createCachedPaginatedService cache keys', () => {
  function setupCached(config: Partial<PaginatedServiceConfig> = {}) {
    const store = new Map<string, unknown>()
    const cacheEntity = vi.fn(async (_entity: string, key: string, fetcher: () => Promise<unknown>) => {
      if (!store.has(key)) store.set(key, await fetcher())
      return store.get(key)
    })
    // a vi.fn mock loses the generic signature cacheEntity needs
    const cache: NonNullable<PaginationContext['cache']> = {
      invalidateEntity: vi.fn(),
      cacheEntity: <T,>(entity: string, key: string, fetcher: () => Promise<T>) =>
        cacheEntity(entity, key, fetcher) as Promise<T>,
    }
    let currentUser: string | null = 'alice'
    const findMany = vi.fn(async () => [{ ownerId: currentUser }])
    const groupBy = vi.fn(async () => [{ ownerId: currentUser, _count: { _all: 1 } }])
    const { createCachedPaginatedService } = createPaginationContext({
      prisma: { item: { findMany, count: vi.fn().mockResolvedValue(1), groupBy } },
      auth: async () => (currentUser ? { user: { id: currentUser } } : null),
      cache,
    })
    const service = createCachedPaginatedService({
      model: 'item',
      filters: { ownerId: 'string' },
      ...config,
    })
    return {
      service,
      cacheEntity,
      store,
      as: (user: string | null) => {
        currentUser = user
      },
    }
  }

  const params = { page: 1, pageSize: 10 }
  const visibility = (user: { id: string }) => ({ ownerId: user.id })

  it("does not serve one user's cached page to another when visibility is set", async () => {
    const { service, as } = setupCached({ visibility })

    as('alice')
    expect((await service.list(params)).data).toEqual([{ ownerId: 'alice' }])
    as('bob')
    expect((await service.list(params)).data).toEqual([{ ownerId: 'bob' }])
    as('alice')
    expect((await service.list(params)).data).toEqual([{ ownerId: 'alice' }])
  })

  it("does not serve one user's cached filter options to another when visibility is set", async () => {
    const { service, as } = setupCached({ visibility })

    as('alice')
    expect((await service.getFilterOptions!()).ownerId[0].value).toBe('alice')
    as('bob')
    expect((await service.getFilterOptions!()).ownerId[0].value).toBe('bob')
  })

  it('does not cache when visibility is set and nobody is signed in', async () => {
    const { service, as, cacheEntity } = setupCached({ visibility })

    as(null)
    expect(await service.list(params)).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    })
    expect(await service.getFilterOptions!()).toEqual({})
    expect(cacheEntity).not.toHaveBeenCalled()
  })

  it('shares one entry per service and params when there is no visibility rule', async () => {
    const { service, store, cacheEntity } = setupCached()

    await service.list(params)
    await service.list(params)
    await service.getFilterOptions!('en')
    expect(cacheEntity).toHaveBeenCalledTimes(3)
    expect(store.size).toBe(2)
  })
})

describe('createCachedPaginatedService scope', () => {
  // One shared cache, a Prisma model that answers with the query it got, and
  // a session whose user the test swaps: a cached answer built for another
  // scope shows up as the wrong query.
  function context() {
    const store = new Map<string, unknown>()
    const onWarning = vi.fn()
    const cacheEntity = vi.fn(async (_entity: string, key: string, fetcher: () => Promise<unknown>) => {
      if (!store.has(key)) store.set(key, await fetcher())
      return store.get(key)
    })
    let user: AuthUser = { id: 'u1', role: 'admin' }
    const { createCachedPaginatedService } = createPaginationContext({
      prisma: {
        item: {
          findMany: vi.fn(async (args: Record<string, unknown>) => [
            { where: args.where, select: args.select },
          ]),
          count: vi.fn().mockResolvedValue(1),
          groupBy: vi.fn(async ({ where }: { where: unknown }) => [
            { status: JSON.stringify(where), _count: { _all: 1 } },
          ]),
        },
      },
      auth: async () => ({ user }),
      cache: {
        invalidateEntity: vi.fn(),
        cacheEntity: <T,>(entity: string, key: string, fetcher: () => Promise<T>) =>
          cacheEntity(entity, key, fetcher) as Promise<T>,
      },
      onWarning,
    })
    return {
      create: (config: Omit<PaginatedServiceConfig, 'model'>) =>
        createCachedPaginatedService({ model: 'item', ...config }),
      cacheEntity,
      store,
      onWarning,
      signIn: (next: AuthUser) => {
        user = next
      },
    }
  }

  const params = { page: 1, pageSize: 10 }

  it('does not serve one service the page or filter options another service cached', async () => {
    const { create } = context()
    const admin = create({ filters: { status: 'enum' } })
    const picker = create({
      filters: { status: 'enum' },
      baseWhere: { active: true },
      select: { id: true, name: true },
    })

    await admin.list(params)
    await admin.getFilterOptions!('en')
    expect((await picker.list(params)).data).toEqual([
      { where: { active: true }, select: { id: true, name: true } },
    ])
    expect((await picker.getFilterOptions!('en')).status[0].value).toBe(
      JSON.stringify({ active: true })
    )
  })

  it('keeps services scoped by baseWhere apart, BigInt values included', async () => {
    const { create } = context()
    const tenantA = create({ baseWhere: { tenantId: 1n } })
    const tenantB = create({ baseWhere: { tenantId: 2n } })

    await tenantA.list(params)
    expect((await tenantB.list(params)).data).toEqual([
      { where: { tenantId: 2n }, select: undefined },
    ])
  })

  it('recomputes the page when the visibility rule answers differently for the same user', async () => {
    const { create, signIn } = context()
    const notes = create({
      visibility: user => (user.role === 'admin' ? {} : { ownerId: user.id }),
    })

    signIn({ id: 'u1', role: 'admin' })
    expect((await notes.list(params)).data[0].where).toEqual({})
    signIn({ id: 'u1', role: 'user' })
    expect((await notes.list(params)).data[0].where).toEqual({ ownerId: 'u1' })
  })

  it('runs the visibility rule once per call and queries with the clause it keyed on', async () => {
    const { create, store } = context()
    let calls = 0
    const visibility = vi.fn(() => ({ version: ++calls }))
    const service = create({ filters: { status: 'enum' }, visibility })

    expect((await service.list(params)).data[0].where).toEqual({ version: 1 })
    expect(visibility).toHaveBeenCalledTimes(1)
    expect([...store.keys()][0]).toContain('{"version":1}')
    await service.getFilterOptions!('en')
    expect(visibility).toHaveBeenCalledTimes(2)
  })

  it('does not cache a service whose hooks or filter transforms the key cannot tell apart', async () => {
    const { create, cacheEntity, onWarning } = context()
    const service = create({
      filters: { hasOrders: { type: 'boolean', transform: () => ({ some: {} }) } },
    })

    await service.list(params)
    await service.getFilterOptions!('en')
    expect(cacheEntity).not.toHaveBeenCalled()
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('not cached'))
    create({ afterQuery: data => data })
    create({ beforeQuery: (_params, where) => where })
    create({ customFilterOptions: async () => [] })
    expect(onWarning).toHaveBeenCalledTimes(4)
  })
})

describe('visibility and the session user', () => {
  // The JSDoc example of createPaginatedService: role is a code or a RoleInfo
  const visibility = (user: AuthUser) => {
    const role = typeof user.role === 'string' ? user.role : user.role?.code
    return role === 'admin' ? {} : { ownerId: user.id }
  }

  async function whereFor(user: AuthUser) {
    const findMany = vi.fn().mockResolvedValue([])
    const { createPaginatedService } = createPaginationContext({
      prisma: { item: { findMany, count: vi.fn().mockResolvedValue(0) } },
      auth: async () => ({ user }),
    })
    await createPaginatedService({ model: 'item', visibility }).list({ page: 1, pageSize: 10 })
    return findMany.mock.calls[0][0].where
  }

  it('reads the role as a bare code or as the RoleInfo of @telamonjs/auth', async () => {
    const roleInfo = { id: 'r1', name: 'Admin', code: 'admin' }
    expect(await whereFor({ id: 'u1', role: 'admin' })).toEqual({})
    expect(await whereFor({ id: 'u1', role: roleInfo })).toEqual({})
    expect(await whereFor({ id: 'u1', role: { ...roleInfo, code: 'viewer' } })).toEqual({
      ownerId: 'u1',
    })
    expect(await whereFor({ id: 'u1' })).toEqual({ ownerId: 'u1' })
  })
})
