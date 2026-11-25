/**
 * The ONLY file that calls fetch() for roles. config.tsx and components
 * import from here — never fetch() directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'
import type { RoleFormData } from '@/app/admin/papeis/config'

export interface Role {
  id: string
  name: string
  code: string
  description: string | null
  /** Built-in: not editable, not deletable, locked in the matrix */
  system: boolean
  _count: { users: number; permissions: number }
}

export interface RoleMatrix {
  roles: Array<Pick<Role, 'id' | 'name' | 'code' | 'system'> & { permissionIds: string[] }>
  permissions: Array<{
    id: string
    code: string
    module: string
    action: string
    category: string | null
    description: string | null
  }>
}

const BASE_URL = '/api/roles'

async function parse<T>(res: Response, errorMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? errorMessage)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

const send = <T>(url: string, method: string, errorMessage: string, data?: unknown): Promise<T> =>
  fetch(url, {
    method,
    credentials: 'include',
    ...(data === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  }).then((res) => parse<T>(res, errorMessage))

export const rolesApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<Role>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)
    return send(`${BASE_URL}?${query}`, 'GET', 'Failed to load roles')
  },
  getById: (id: string): Promise<Role> => send(`${BASE_URL}/${id}`, 'GET', 'Role not found'),
  create: (data: RoleFormData): Promise<Role> => send(BASE_URL, 'POST', 'Failed to create role', data),
  update: (id: string, data: Partial<RoleFormData>): Promise<Role> =>
    send(`${BASE_URL}/${id}`, 'PATCH', 'Failed to update role', data),
  delete: (id: string): Promise<void> => send(`${BASE_URL}/${id}`, 'DELETE', 'Failed to delete role'),
  matrix: (): Promise<RoleMatrix> => send(`${BASE_URL}/matrix`, 'GET', 'Failed to load permissions'),
  grant: (roleId: string, permissionId: string): Promise<void> =>
    send(`${BASE_URL}/${roleId}/permissions/${permissionId}`, 'POST', 'Failed to grant permission'),
  revoke: (roleId: string, permissionId: string): Promise<void> =>
    send(`${BASE_URL}/${roleId}/permissions/${permissionId}`, 'DELETE', 'Failed to revoke permission'),
}
