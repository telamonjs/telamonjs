/**
 * Server-side utilities for TelamonJS
 *
 * The pagination and Prisma helpers come from `@telamonjs/data`, the package a
 * backend without React installs directly; they are re-exported here for
 * Next.js server code.
 *
 * @module server
 */

// Cache revalidation Server Action (left the root barrel in 6.0)
export { revalidatePathAction } from './cache'

// Prisma/pagination helpers safe for 'use server'
// (the main entry has 'use client' — services must NOT import from there)
export { buildPrismaOrderBy, buildPrismaOrderByMulti } from '@telamonjs/data/prisma'
export { createPaginatedResponse } from '@telamonjs/data'
export type { PaginationParams, PaginatedResponse, SortField } from '@telamonjs/data'

// createPaginationContext (with the library's labels) + the config/return types
export { createPaginationContext } from './pagination'
export type {
  FilterFieldType,
  FilterFieldConfig,
  PaginatedServiceConfig,
  PaginatedService,
  FilterValue,
  SearchCondition,
  PaginationContext,
} from '@telamonjs/data/prisma'
