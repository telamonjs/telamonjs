/**
 * The ONLY file that calls fetch() for system parameters. config.tsx and
 * components import from here — never fetch() directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'

export type ParameterType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'

export interface Parameter {
  id: string
  key: string
  /** Always text; read it through `type` */
  value: string
  type: ParameterType
  description: string | null
  group: string | null
  public: boolean
  createdAt: string
  updatedAt: string
}

/** What the API takes (PATCH: any part of it). */
export type ParameterInput = Pick<Parameter, 'key' | 'value' | 'type' | 'public'> &
  Partial<Pick<Parameter, 'description' | 'group'>>

const BASE_URL = '/api/parameters'

async function parse<T>(res: Response, errorMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? errorMessage)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

function send<T>(url: string, method: string, errorMessage: string, data?: unknown): Promise<T> {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: data === undefined ? undefined : JSON.stringify(data),
  }).then((res) => parse<T>(res, errorMessage))
}

export const parametersApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<Parameter>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)

    return fetch(`${BASE_URL}?${query}`, { credentials: 'include' }).then((res) =>
      parse(res, 'Failed to load parameters')
    )
  },
  getById: (id: string): Promise<Parameter> =>
    fetch(`${BASE_URL}/${id}`, { credentials: 'include' }).then((res) =>
      parse(res, 'Parameter not found')
    ),
  create: (data: ParameterInput): Promise<Parameter> =>
    send(BASE_URL, 'POST', 'Failed to create parameter', data),
  update: (id: string, data: Partial<ParameterInput>): Promise<Parameter> =>
    send(`${BASE_URL}/${id}`, 'PATCH', 'Failed to update parameter', data),
  delete: (id: string): Promise<void> =>
    send(`${BASE_URL}/${id}`, 'DELETE', 'Failed to delete parameter'),
}
