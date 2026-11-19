/**
 * The ONLY file that talks to the usuarios API. config.tsx and components
 * import from here — never call apiGet/apiPost/etc. directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'
import { apiGet, apiPost, apiPatch, apiDelete } from './client'
import type { UsuarioFormData } from '@/app/admin/usuarios/config'

export interface Usuario {
  id: string
  name: string | null
  email: string
  image: string | null
  role: 'ADMIN' | 'USER'
  ativo: boolean
  createdAt: string
  updatedAt: string
}

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

    return apiGet(`${BASE_URL}?${query}`, 'Erro ao carregar usuários')
  },
  getById: (id: string): Promise<Usuario> => apiGet(`${BASE_URL}/${id}`, 'Usuário não encontrado'),
  create: (data: UsuarioFormData): Promise<Usuario> => apiPost(BASE_URL, data, 'Erro ao criar usuário'),
  update: (id: string, data: Partial<UsuarioFormData>): Promise<Usuario> =>
    apiPatch(`${BASE_URL}/${id}`, data, 'Erro ao atualizar usuário'),
  delete: (id: string): Promise<void> => apiDelete(`${BASE_URL}/${id}`, 'Erro ao desativar usuário'),
}
