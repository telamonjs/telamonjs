/**
 * The Prisma pagination service: one `list` (and `getFilterOptions`) per
 * model, from a declarative config.
 *
 * @module data/prisma
 */

import { createPaginatedResponse, sanitizePaginationParams } from '../contract.js'
import type { PaginatedResponse, PaginationParams, SortField } from '../contract.js'
import { resolveSort } from '../sort.js'
import { buildPrismaOrderBy, buildPrismaOrderByMulti, type PrismaOrderBy } from './order-by.js'
import type {
  FilterLabels,
  FilterOption,
  PaginatedService,
  PaginatedServiceConfig,
  PaginationContext,
  PrismaWhereClause,
} from './types.js'
import {
  buildFilterConditions,
  buildIncludeClause,
  buildSearchConditions,
  buildWhereClause,
  getFilterOptionsForField,
} from './where.js'

const ENGLISH_LABELS: FilterLabels = {
  yes: 'Yes',
  no: 'No',
  active: 'Active',
  inactive: 'Inactive',
}

function buildOrderByClause(
  sortBy: string | string[] | SortField[],
  sortOrder: 'asc' | 'desc',
  sortableFields?: readonly string[]
): PrismaOrderBy | PrismaOrderBy[] | undefined {
  if (!sortBy || sortBy.length === 0) return undefined
  return Array.isArray(sortBy)
    ? buildPrismaOrderByMulti(sortBy as SortField[], sortableFields)
    : buildPrismaOrderBy(sortBy, sortOrder, sortableFields)
}

/**
 * Create pagination context with dependency injection
 * This is the main entry point for projects using the pagination system
 *
 * @example
 * ```typescript
 * // In your project's lib/pagination.ts
 * import { createPaginationContext } from '@telamonjs/data/prisma'
 * import { auth } from '@/auth'
 * import { prisma } from '@/lib/prisma'
 *
 * export const { createPaginatedService } = createPaginationContext({
 *   prisma,
 *   auth
 * })
 * ```
 */
export function createPaginationContext(context: PaginationContext) {
  const {
    prisma,
    auth,
    cache,
    filterLabels = () => ENGLISH_LABELS,
    onWarning = (message: string) => console.warn(message),
  } = context

  /**
   * Create a paginated service with minimal configuration
   *
   * @example
   * ```typescript
   * const service = createPaginatedService({
   *   model: 'cliente',
   *   searchFields: ['nome', 'codigo', 'cpfCnpj', 'email', 'cidade'],
   *   filters: {
   *     ativo: 'boolean',
   *     uf: 'string',
   *     cidade: 'string'
   *   },
   *   include: {
   *     unidades: true,
   *     _count: {
   *       select: {
   *         produtosCliente: true,
   *         unidades: true
   *       }
   *     }
   *   },
   *   visibility: (user) => {
   *     const role = typeof user.role === 'string' ? user.role : user.role?.code
   *     return role === 'admin' ? {} : {
   *       visoes: {
   *         some: {
   *           usuario: { id: user.id }
   *         }
   *       }
   *     }
   *   }
   * })
   *
   * export const listClientesPaginated = service.list
   * export const getClientesFilterOptions = service.getFilterOptions
   * ```
   */
  function createPaginatedService<T extends string>(
    config: PaginatedServiceConfig<T>
  ): PaginatedService<Record<string, unknown>> {
    return buildPaginatedService(config).service
  }

  /**
   * The service plus its internals: the cached service resolves the
   * visibility clause once per call and hands it to `listFor` /
   * `filterOptionsFor`. Never put that clause on `list` itself: `list` is
   * often exported as a server action, so the argument would come from the
   * client.
   */
  function buildPaginatedService<T extends string>(
    config: PaginatedServiceConfig<T>
  ) {
    const {
      model,
      searchFields = [],
      searchMode = 'insensitive',
      filters = {},
      include,
      select,
      defaultOrderBy = 'id',
      defaultOrderDirection = 'asc',
      sortableFields,
      visibility,
      counts,
      baseWhere,
      beforeQuery,
      afterQuery,
      customFilterOptions,
      enableFilterOptions = true,
      maxPageSize = 100,
      defaultPageSize = 10,
    } = config

    // Get Prisma model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Prisma client model lookup by string key; PrismaClient has no generic index signature
    const prismaModel = (prisma as any)[model]

    if (!prismaModel) {
      throw new Error(`Model "${model}" not found in Prisma client`)
    }

    /** `{}` without a visibility rule; `null` when nobody is signed in */
    async function resolveScope(): Promise<{
      userId?: string
      where?: PrismaWhereClause
    } | null> {
      if (!visibility) return {}
      const session = await auth()
      if (!session?.user) return null
      return { userId: session.user.id, where: visibility(session.user) }
    }

    // Main pagination function
    async function list(
      params?: PaginationParams
    ): Promise<PaginatedResponse<Record<string, unknown>>> {
      const scope = await resolveScope()
      // No user, return empty result
      if (!scope) return createPaginatedResponse([], 0, 1, 10)
      return listFor(params, scope.where)
    }

    async function listFor(
      params: PaginationParams | undefined,
      visibilityWhere: PrismaWhereClause | undefined
    ): Promise<PaginatedResponse<Record<string, unknown>>> {
      // Destructure params with defaults
      const {
        search = '',
        sortBy = defaultOrderBy,
        sortOrder = defaultOrderDirection,
        filters: filterParams,
      } = params || {}

      // Sanitize pagination params
      const { page, pageSize } = sanitizePaginationParams({
        page: params?.page,
        pageSize: params?.pageSize,
        maxPageSize,
        defaultPageSize,
      })

      // Build search conditions
      const searchConditions = buildSearchConditions(
        search,
        searchFields,
        searchMode
      )

      // Build filter conditions
      const filterConditions = buildFilterConditions(filterParams, filters)

      // Build complete where clause
      let where = buildWhereClause(
        searchConditions,
        filterConditions,
        baseWhere,
        visibilityWhere
      )

      // Apply beforeQuery hook if defined
      if (beforeQuery) {
        const queryParams: PaginationParams = params || {
          page: 1,
          pageSize: defaultPageSize,
        }
        where = beforeQuery(queryParams, where)
      }

      // Build orderBy clause (sortBy/sortOrder come from the client)
      const sort = resolveSort(sortBy, sortOrder, {
        defaultOrderBy,
        defaultOrderDirection,
        sortableFields,
      })
      const orderBy = buildOrderByClause(
        sort.sortBy,
        sort.sortOrder,
        sortableFields
      )

      // Build include clause with counts
      const includeClause = buildIncludeClause(include, counts)

      // Build query options
      const queryOptions: Record<string, unknown> = {
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }

      if (orderBy) {
        queryOptions.orderBy = orderBy
      }

      // Add include or select (mutually exclusive)
      if (select) {
        queryOptions.select = select
      } else if (includeClause) {
        queryOptions.include = includeClause
      }

      // Execute queries in parallel
      const [data, total] = await Promise.all([
        prismaModel.findMany(queryOptions),
        prismaModel.count({ where }),
      ])

      // Apply afterQuery hook if defined
      const transformedData = afterQuery ? afterQuery(data) : data

      // Return paginated response
      return createPaginatedResponse(transformedData, total, page, pageSize)
    }

    // Get filter options function
    async function getFilterOptions(
      locale?: string
    ): Promise<
      Record<
        string,
        Array<{
          value: string
          label: string
          count: number
        }>
      >
    > {
      if (!enableFilterOptions || Object.keys(filters).length === 0) {
        return {}
      }

      const scope = await resolveScope()
      if (!scope) return {}
      return filterOptionsFor(locale, scope.where)
    }

    async function filterOptionsFor(
      locale: string | undefined,
      visibilityWhere: PrismaWhereClause | undefined
    ): Promise<Record<string, FilterOption[]>> {
      const labels = filterLabels(locale)

      const filterOptions: Record<string, FilterOption[]> = {}

      // Get options for each filter field
      await Promise.all(
        Object.keys(filters).map(async filterKey => {
          if (customFilterOptions) {
            // Use custom filter options if provided
            filterOptions[filterKey] = await customFilterOptions(
              model,
              filterKey
            )
          } else {
            // Get filter config
            const filterConfig = filters[filterKey]

            // Parse config to get the actual field name
            const configObj =
              typeof filterConfig === 'string'
                ? { type: filterConfig, field: filterKey }
                : { ...filterConfig, field: filterConfig.field || filterKey }

            // For filters with transform that returns objects (like relation filters),
            // return fixed boolean options
            if (configObj.transform && configObj.type === 'boolean') {
              filterOptions[filterKey] = [
                { value: 'true', label: labels.yes, count: 0 },
                { value: 'false', label: labels.no, count: 0 },
              ]
            } else {
              // Use default filter options builder with actual field name
              filterOptions[filterKey] = await getFilterOptionsForField(
                prisma,
                model,
                configObj.field,
                baseWhere,
                visibilityWhere,
                labels
              )
            }
          }
        })
      )

      return filterOptions
    }

    const service: PaginatedService<Record<string, unknown>> = {
      list,
      ...(enableFilterOptions && { getFilterOptions }),
      getConfig: () => config,
    }
    return { service, resolveScope, listFor, filterOptionsFor }
  }

  /**
   * Create a cached paginated service
   * Same as createPaginatedService but with caching. Entries are keyed by the
   * service config and, with `visibility`, by the user and the clause the rule
   * returns for them. A service with beforeQuery/afterQuery/customFilterOptions
   * or a filter `transform` is returned uncached (reported through `onWarning`).
   *
   * The visibility clause must be deterministic for a given user: a clause
   * that changes on every call, such as `{ publishedAt: { lte: new Date() } }`,
   * gives every call a new key, so nothing is ever reused and each call stores
   * one more entry. Put a time cut-off in an uncached service instead.
   */
  function createCachedPaginatedService<T extends string>(
    config: PaginatedServiceConfig<T>
  ): PaginatedService<Record<string, unknown>> {
    const { service, resolveScope, listFor, filterOptionsFor } =
      buildPaginatedService(config)
    const { model } = config

    if (!cache) {
      onWarning(
        'Cache not configured in PaginationContext, returning non-cached service'
      )
      return service
    }

    // Hooks and filter transforms are closures the key cannot tell apart: two
    // services differing only there would share entries, so they go uncached.
    const hasClosures =
      !!(
        config.beforeQuery ||
        config.afterQuery ||
        config.customFilterOptions
      ) ||
      Object.values(config.filters ?? {}).some(
        f => typeof f === 'object' && typeof f.transform === 'function'
      )
    if (hasClosures) {
      onWarning(
        `createCachedPaginatedService(${model}): beforeQuery/afterQuery/customFilterOptions and filter transforms are not part of the cache key, so this service is not cached`
      )
      return service
    }

    // Prisma clauses may hold BigInt, which plain JSON.stringify rejects
    const keyJson = (value: unknown): string =>
      JSON.stringify(value, (_key, v: unknown) =>
        typeof v === 'bigint' ? `${v}n` : v
      )

    // Everything static that shapes the result (baseWhere, select, include,
    // filters, sorting, page sizes...): two services on one model never share
    // an entry. JSON drops the functions (visibility is keyed per call below).
    // ponytail: long keys; hash them in cacheEntity if the backend limits key length.
    const serviceKey = keyJson(config)

    /**
     * With `visibility`, the key carries the user's id and the clause the rule
     * returns for them: the id alone misses a role or tenant change. The
     * clause is computed once per call, and the query runs with that same one.
     */
    const userKeyPart = (scope: {
      userId?: string
      where?: PrismaWhereClause
    }) =>
      config.visibility ? `user:${scope.userId}_${keyJson(scope.where)}_` : ''

    // Wrap list function with caching
    async function cachedList(params?: PaginationParams) {
      const scope = await resolveScope()
      // Nobody signed in: skip the cache, the service answers that case
      if (!scope) return service.list(params)

      const cacheKey = `${model}_paginated_${serviceKey}_${userKeyPart(scope)}${JSON.stringify(params || {})}`

      return cache!.cacheEntity(model, cacheKey, () =>
        listFor(params, scope.where)
      )
    }

    // Wrap getFilterOptions with caching
    async function cachedGetFilterOptions(locale?: string) {
      if (!service.getFilterOptions) {
        return {}
      }

      const scope = await resolveScope()
      if (!scope) return {}

      const cacheKey = `${model}_filter_options_${serviceKey}_${userKeyPart(scope)}${locale ?? ''}`

      return cache!.cacheEntity(model, cacheKey, () =>
        filterOptionsFor(locale, scope.where)
      )
    }

    return {
      ...service,
      list: cachedList,
      ...(service.getFilterOptions && {
        getFilterOptions: cachedGetFilterOptions,
      }),
    }
  }

  /**
   * Helper to create a simple paginated service for models without complex requirements
   */
  function createSimplePaginatedService<T extends string>(
    model: T,
    searchFields: string[] = ['nome']
  ): PaginatedService<Record<string, unknown>> {
    return createPaginatedService({
      model,
      searchFields,
      defaultOrderBy: searchFields[0] || 'id',
    })
  }

  return {
    createPaginatedService,
    createCachedPaginatedService,
    createSimplePaginatedService,
  }
}
