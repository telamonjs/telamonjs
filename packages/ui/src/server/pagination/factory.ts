/**
 * Main pagination factory
 * Creates paginated services with minimal configuration
 *
 * @module server/pagination
 */

import { createTranslator } from 'next-intl'
import { createPaginatedResponse } from '../../types/pagination'
import type { PaginationParams } from '../../types/pagination'
import { DEFAULT_LOCALE, type TelamonjsLocale } from '../../i18n/locales'
import { telamonjsMessages } from '../../i18n/messages'
import type {
  PaginatedService,
  PaginatedServiceConfig,
  PaginationContext,
} from './types'
import {
  buildFilterConditions,
  buildIncludeClause,
  buildOrderByClause,
  buildSearchConditions,
  buildWhereClause,
  getFilterOptionsForField,
  resolveSort,
  sanitizePaginationParams,
} from './utils'
import type { FilterOption } from './types'
import { logger } from '../../utils/logger'

/**
 * Create pagination context with dependency injection
 * This is the main entry point for projects using the pagination system
 *
 * @example
 * ```typescript
 * // In your project's lib/pagination.ts
 * import { createPaginationContext } from '@telamonjs/ui/server'
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
  const { prisma, auth, cache } = context

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
      locale: TelamonjsLocale = DEFAULT_LOCALE
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

      const t = createTranslator({
        locale,
        messages: telamonjsMessages[locale],
        namespace: 'telamonjs.common',
      })

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
                { value: 'true', label: t('yes'), count: 0 },
                { value: 'false', label: t('no'), count: 0 },
              ]
            } else {
              // Use default filter options builder with actual field name
              filterOptions[filterKey] = await getFilterOptionsForField(
                prisma,
                model,
                configObj.field,
                baseWhere,
                visibilityWhere,
                locale
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
      logger.warn(
        'Cache not configured in PaginationContext, returning non-cached service'
      )
      return service
    }

    // Wrap list function with caching
    const originalList = service.list
    async function cachedList(params?: PaginationParams) {
      const cacheKey = `${model}_paginated_${JSON.stringify(params || {})}`

      return cache!.cacheEntity(model, cacheKey, () => originalList(params))
    }

    // Wrap getFilterOptions with caching
    const originalGetFilterOptions = service.getFilterOptions
    async function cachedGetFilterOptions(locale: TelamonjsLocale = DEFAULT_LOCALE) {
      if (!originalGetFilterOptions) {
        return {}
      }

      const cacheKey = `${model}_filter_options_${locale}`

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
