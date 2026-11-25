/**
 * `@telamonjs/data/prisma` — the Prisma adapter of a TelamonJS list:
 * `orderBy` from the sort a `ListPage` sends, `where` composition that keeps
 * every scope rule, and a declarative paginated service. Builds plain
 * objects in Prisma's shape; it never imports `@prisma/client`.
 *
 * @module data/prisma
 */

export { buildPrismaOrderBy, buildPrismaOrderByMulti } from './order-by.js'
export type { PrismaOrderBy } from './order-by.js'
export { buildSearchConditions, buildFilterConditions, buildWhereClause } from './where.js'
export { createPaginationContext } from './pagination.js'
export type {
  AuthUser,
  FilterFieldConfig,
  FilterFieldType,
  FilterLabels,
  FilterOption,
  FilterValue,
  PaginatedService,
  PaginatedServiceConfig,
  PaginationContext,
  PrismaClient,
  PrismaIncludeClause,
  PrismaWhereClause,
  SearchCondition,
} from './types.js'
