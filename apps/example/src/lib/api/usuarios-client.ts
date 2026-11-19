/**
 * The ONLY file that calls fetch() for this module. config.tsx and
 * components import from here — never fetch() directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'
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

const BASE_URL = '/api/usuarios'

async function parse<T>(res: Response, errorMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? errorMessage)
  }
  return res.json()
}

export const usuariosApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<Usuario>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)

    return fetch(`${BASE_URL}?${query}`, { credentials: 'include' }).then((res) =>
      parse(res, 'Erro ao carregar usuários')
    )
  },
  getById: (id: string): Promise<Usuario> =>
    fetch(`${BASE_URL}/${id}`, { credentials: 'include' }).then((res) =>
      parse(res, 'Usuário não encontrado')
    ),
  create: (data: UsuarioFormData): Promise<Usuario> =>
    fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then((res) => parse(res, 'Erro ao criar usuário')),
  update: (id: string, data: Partial<UsuarioFormData>): Promise<Usuario> =>
    fetch(`${BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then((res) => parse(res, 'Erro ao atualizar usuário')),
  delete: (id: string): Promise<void> =>
    fetch(`${BASE_URL}/${id}`, { method: 'DELETE', credentials: 'include' }).then((res) => {
      if (!res.ok) throw new Error('Erro ao desativar usuário')
    }),
}
