/**
 * Server-side utilities for TelamonJS
 *
 * @module server
 */

// Cache revalidation Server Action (left the root barrel in 6.0)
export { revalidatePathAction } from './cache'

// Prisma/pagination helpers safe for 'use server'
// (the main entry has 'use client' — services must NOT import from there)
export {
  buildPrismaOrderBy,
  buildPrismaOrderByMulti,
} from './prisma-helpers'
export { createPaginatedResponse } from '../types/pagination'
export type {
  PaginationParams,
  PaginatedResponse,
  SortField,
} from '../types/pagination'

// createPaginationContext + the config/return types needed to call it
export { createPaginationContext } from './pagination/factory'
export type {
  FilterFieldType,
  FilterFieldConfig,
  PaginatedServiceConfig,
  PaginatedService,
  FilterValue,
  SearchCondition,
  PaginationContext,
} from './pagination/types'
