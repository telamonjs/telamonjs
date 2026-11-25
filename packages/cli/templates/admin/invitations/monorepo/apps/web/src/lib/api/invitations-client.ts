/**
 * The ONLY file that talks to the invitations API. config.tsx and the accept
 * page import from here — never call apiGet/apiPost/etc. directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'
import { apiFetch, apiGet, apiPost } from './client'

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'

export interface Invitation {
  id: string
  email: string
  name: string | null
  roleIds: string[]
  roles: Array<{ id: string; name: string }>
  /** EXPIRED: a pending invitation past `expiresAt` */
  status: InvitationStatus
  expiresAt: string
  acceptedAt: string | null
  resendCount: number
  invitedBy: { id: string; name: string | null; email: string } | null
  userId: string | null
  createdAt: string
  updatedAt: string
}

export interface InvitationInput {
  email: string
  name?: string | null
  roleIds: string[]
}

/** What the accept page gets for a token: email and name only while it is usable. */
export type InvitationPreview =
  | { status: 'PENDING'; email: string; name: string | null; expiresAt: string }
  | { status: Exclude<InvitationStatus, 'PENDING'> }

export interface AcceptInvitationInput {
  token: string
  name: string
  password: string
}

const BASE_URL = '/invitations'

export const invitationsApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<Invitation>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)
    return apiGet(`${BASE_URL}?${query}`, 'Failed to load invitations')
  },
  create: (data: InvitationInput): Promise<Invitation> =>
    apiPost(BASE_URL, data, 'Failed to send the invitation'),
  resend: (id: string): Promise<Invitation> =>
    apiPost(`${BASE_URL}/${id}/resend`, {}, 'Failed to resend the invitation'),
  revoke: (id: string): Promise<Invitation> =>
    apiFetch(`${BASE_URL}/${id}/revoke`, { method: 'PUT' }, 'Failed to revoke the invitation'),
  /** Public: no session needed. Rejects on an unknown token. */
  byToken: (token: string): Promise<InvitationPreview> =>
    apiGet(`${BASE_URL}/by-token/${encodeURIComponent(token)}`, 'Invitation not found'),
  /** Public: creates the user; sign in with the same email and password afterwards. */
  accept: (data: AcceptInvitationInput): Promise<{ email: string }> =>
    apiPost(`${BASE_URL}/accept`, data, 'Failed to accept the invitation'),
}
