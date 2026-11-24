/**
 * `@telamonjs/data` — the server half of a TelamonJS list, ORM-agnostic:
 * the wire contract a `ListPage` sends and expects, and the sort/paging
 * sanitizers an endpoint runs on it. ORM adapters live in subpaths
 * (`@telamonjs/data/prisma`).
 *
 * @module data
 */

export type { SortField, PaginationParams, PaginatedResponse } from './contract.js'
export { createPaginatedResponse, sanitizePaginationParams } from './contract.js'
export { resolveSort, resolveSortPath } from './sort.js'
