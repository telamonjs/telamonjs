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
  roles: Array<{ id: string; code: string; name: string }>
  active: boolean
  createdAt: string
  updatedAt: string
}

/** What the API takes: the form data, or any part of it (e.g. `{ active }`). */
export type UsuarioInput = Partial<UsuarioFormData>

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
      parse(res, 'Failed to load users')
    )
  },
  getById: (id: string): Promise<Usuario> =>
    fetch(`${BASE_URL}/${id}`, { credentials: 'include' }).then((res) =>
      parse(res, 'User not found')
    ),
  create: (data: UsuarioFormData): Promise<Usuario> =>
    fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then((res) => parse(res, 'Failed to create user')),
  update: (id: string, data: UsuarioInput): Promise<Usuario> =>
    fetch(`${BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then((res) => parse(res, 'Failed to update user')),
}
