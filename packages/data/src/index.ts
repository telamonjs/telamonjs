/**
 * `@telamonjs/data` — the server half of a TelamonJS list, ORM-agnostic:
 * the wire contract a `ListPage` sends and expects, and the sort/paging
 * sanitizers an endpoint runs on it, plus the audit helpers (`computeDiff`,
 * `redactPayload`). ORM adapters live in subpaths (`@telamonjs/data/prisma`).
 *
 * @module data
 */

export type { SortField, PaginationParams, PaginatedResponse } from './contract.js'
export { createPaginatedResponse, sanitizePaginationParams } from './contract.js'
export { resolveSort, resolveSortPath } from './sort.js'
export type {
  AuthUser,
  FilterFieldConfig,
  FilterFieldType,
  FilterLabels,
  FilterOption,
  FilterValue,
} from './types.js'
export type { FieldChange, ComputeDiffOptions } from './audit.js'
export { computeDiff, redactPayload, DEFAULT_REDACT_KEYS } from './audit.js'
