/**
 * The Prisma pagination service: one `list` (and `getFilterOptions`) per
 * model, from a declarative config.
 *
 * @module data/prisma
 */

import { createPaginatedResponse, sanitizePaginationParams } from '../contract.js'
import type { PaginationParams, SortField } from '../contract.js'
import { resolveSort } from '../sort.js'
import { buildPrismaOrderBy, buildPrismaOrderByMulti, type PrismaOrderBy } from './order-by.js'
import type {
  FilterLabels,
  FilterOption,
  PaginatedService,
  PaginatedServiceConfig,
  PaginationContext,
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
   *   visibility: (user) =>
   *     user.role.code === 'admin' ? {} : {
   *       visoes: {
   *         some: {
   *           usuario: { id: user.id }
   *         }
   *       }
   *     }
   * })
   *
   * export const listClientesPaginated = service.list
   * export const getClientesFilterOptions = service.getFilterOptions
   * ```
   */
  function createPaginatedService<T extends string>(
    config: PaginatedServiceConfig<T>
  ): PaginatedService<Record<string, unknown>> {
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

    // Main pagination function
    async function list(params?: PaginationParams): Promise<{
      data: Record<string, unknown>[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }> {
      // Get authenticated user if visibility rules are defined
      let visibilityWhere: Record<string, unknown> | undefined = undefined
      if (visibility) {
        const session = await auth()
        if (!session?.user) {
          // No user, return empty result
          return createPaginatedResponse([], 0, 1, 10)
        }
        visibilityWhere = visibility(session.user)
      }

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

      const labels = filterLabels(locale)

      // Get authenticated user if visibility rules are defined
      let visibilityWhere: Record<string, unknown> | undefined = undefined
      if (visibility) {
        const session = await auth()
        if (!session?.user) {
          return {}
        }
        visibilityWhere = visibility(session.user)
      }

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

    // Return service object
    return {
      list,
      ...(enableFilterOptions && { getFilterOptions }),
      getConfig: () => config,
    }
  }

  /**
   * Create a cached paginated service
   * Same as createPaginatedService but with caching
   */
  function createCachedPaginatedService<T extends string>(
    config: PaginatedServiceConfig<T>
  ): PaginatedService<Record<string, unknown>> {
    const service = createPaginatedService(config)
    const { model } = config

    if (!cache) {
      onWarning(
        'Cache not configured in PaginationContext, returning non-cached service'
      )
      return service
    }

    /**
     * With `visibility`, each user sees different rows, so the key carries the
     * user's id. `null` means nobody is signed in: skip the cache and let the
     * service answer the unauthenticated case.
     */
    async function userKeyPart(): Promise<string | null> {
      if (!config.visibility) return ''
      const session = await auth()
      return session?.user ? `user:${session.user.id}_` : null
    }

    // Wrap list function with caching
    const originalList = service.list
    async function cachedList(params?: PaginationParams) {
      const userPart = await userKeyPart()
      if (userPart === null) return originalList(params)

      const cacheKey = `${model}_paginated_${userPart}${JSON.stringify(params || {})}`

      return cache!.cacheEntity(model, cacheKey, () => originalList(params))
    }

    // Wrap getFilterOptions with caching
    const originalGetFilterOptions = service.getFilterOptions
    async function cachedGetFilterOptions(locale?: string) {
      if (!originalGetFilterOptions) {
        return {}
      }

      const userPart = await userKeyPart()
      if (userPart === null) return originalGetFilterOptions(locale)

      const cacheKey = `${model}_filter_options_${userPart}${locale ?? ''}`

      return cache!.cacheEntity(model, cacheKey, () =>
        originalGetFilterOptions(locale)
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
