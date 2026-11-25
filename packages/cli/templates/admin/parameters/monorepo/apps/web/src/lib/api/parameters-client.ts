/**
 * The ONLY file that talks to the parameters API. config.tsx and components
 * import from here — never call apiGet/apiPost/etc. directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'

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

const BASE_URL = '/parameters'

export const parametersApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<Parameter>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)
    return apiGet(`${BASE_URL}?${query}`, 'Failed to load parameters')
  },
  getById: (id: string): Promise<Parameter> => apiGet(`${BASE_URL}/${id}`, 'Parameter not found'),
  create: (data: ParameterInput): Promise<Parameter> =>
    apiPost(BASE_URL, data, 'Failed to create parameter'),
  update: (id: string, data: Partial<ParameterInput>): Promise<Parameter> =>
    apiPatch(`${BASE_URL}/${id}`, data, 'Failed to update parameter'),
  delete: (id: string): Promise<void> => apiDelete(`${BASE_URL}/${id}`, 'Failed to delete parameter'),
}
