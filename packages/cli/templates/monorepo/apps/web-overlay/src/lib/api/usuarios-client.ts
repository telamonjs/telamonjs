/**
 * The ONLY file that talks to the usuarios API. config.tsx and components
 * import from here — never call apiGet/apiPost/etc. directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'
import { apiGet, apiPost, apiPatch } from './client'
import type { UsuarioFormData } from '@/app/admin/usuarios/config'

export interface Usuario {
  id: string
  name: string | null
  email: string
  image: string | null
  roles: Array<{ id: string; code: string; name: string }>
  active: boolean
  createdAt: string
  updatedAt: string
}

/** What the API takes: the form data, or any part of it (e.g. `{ active }`). */
export type UsuarioInput = Partial<UsuarioFormData>

const BASE_URL = '/usuarios'

export const usuariosApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<Usuario>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)

    return apiGet(`${BASE_URL}?${query}`, 'Failed to load users')
  },
  getById: (id: string): Promise<Usuario> => apiGet(`${BASE_URL}/${id}`, 'User not found'),
  create: (data: UsuarioFormData): Promise<Usuario> => apiPost(BASE_URL, data, 'Failed to create user'),
  update: (id: string, data: UsuarioInput): Promise<Usuario> =>
    apiPatch(`${BASE_URL}/${id}`, data, 'Failed to update user'),
}
