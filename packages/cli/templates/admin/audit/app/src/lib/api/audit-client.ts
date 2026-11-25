/**
 * The ONLY file that calls fetch() for the audit log. config.tsx and
 * components import from here — never fetch() directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'

export interface AuditLog {
  id: string
  userId: string | null
  impersonatedBy: string | null
  action: string
  entityType: string
  entityId: string | null
  /** Request body or `{ field: { old, new } }` diff, secrets redacted */
  changes: unknown
  ipAddress: string | null
  userAgent: string | null
  method: string | null
  path: string | null
  statusCode: number | null
  createdAt: string
  /** Who acted (null when anonymous or since deleted) */
  user: { id: string; name: string | null; email: string } | null
}

const BASE_URL = '/api/audit'

async function parse<T>(res: Response, errorMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? errorMessage)
  }
  return res.json()
}

export const auditApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<AuditLog>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)
    // Toolbar filters (config.tsx) and any filter the API takes
    for (const key of ['action', 'entityType', 'entityId', 'userId', 'from', 'to']) {
      const value = params.filters?.[key]
      if (typeof value === 'string' && value) query.set(key, value)
    }

    return fetch(`${BASE_URL}?${query}`, { credentials: 'include' }).then((res) =>
      parse(res, 'Failed to load the audit log')
    )
  },
  getById: (id: string): Promise<AuditLog> =>
    fetch(`${BASE_URL}/${id}`, { credentials: 'include' }).then((res) =>
      parse(res, 'Audit entry not found')
    ),
}
