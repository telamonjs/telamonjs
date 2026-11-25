/**
 * The ONLY file that talks to the roles API. config.tsx and components
 * import from here — never call apiGet/apiPost/etc. directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
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

const BASE_URL = '/roles'

export const rolesApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<Role>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)
    return apiGet(`${BASE_URL}?${query}`, 'Failed to load roles')
  },
  getById: (id: string): Promise<Role> => apiGet(`${BASE_URL}/${id}`, 'Role not found'),
  create: (data: RoleFormData): Promise<Role> => apiPost(BASE_URL, data, 'Failed to create role'),
  update: (id: string, data: Partial<RoleFormData>): Promise<Role> =>
    apiPatch(`${BASE_URL}/${id}`, data, 'Failed to update role'),
  delete: (id: string): Promise<void> => apiDelete(`${BASE_URL}/${id}`, 'Failed to delete role'),
  matrix: (): Promise<RoleMatrix> => apiGet(`${BASE_URL}/matrix`, 'Failed to load permissions'),
  grant: (roleId: string, permissionId: string): Promise<void> =>
    apiPost(`${BASE_URL}/${roleId}/permissions/${permissionId}`, {}, 'Failed to grant permission'),
  revoke: (roleId: string, permissionId: string): Promise<void> =>
    apiDelete(`${BASE_URL}/${roleId}/permissions/${permissionId}`, 'Failed to revoke permission'),
}
