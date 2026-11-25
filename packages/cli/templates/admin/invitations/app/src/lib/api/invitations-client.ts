/**
 * The ONLY file that calls fetch() for invitations. config.tsx and the accept
 * page import from here — never fetch() directly.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'

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

const BASE_URL = '/api/invitations'

async function parse<T>(res: Response, errorMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? errorMessage)
  }
  return res.json()
}

function send<T>(url: string, method: string, errorMessage: string, data?: unknown): Promise<T> {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: data === undefined ? undefined : JSON.stringify(data),
  }).then((res) => parse<T>(res, errorMessage))
}

export const invitationsApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<Invitation>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)

    return fetch(`${BASE_URL}?${query}`, { credentials: 'include' }).then((res) =>
      parse(res, 'Failed to load invitations')
    )
  },
  create: (data: InvitationInput): Promise<Invitation> =>
    send(BASE_URL, 'POST', 'Failed to send the invitation', data),
  resend: (id: string): Promise<Invitation> =>
    send(`${BASE_URL}/${id}/resend`, 'POST', 'Failed to resend the invitation'),
  revoke: (id: string): Promise<Invitation> =>
    send(`${BASE_URL}/${id}/revoke`, 'PUT', 'Failed to revoke the invitation'),
  /** Public: no session needed. Rejects on an unknown token. */
  byToken: (token: string): Promise<InvitationPreview> =>
    fetch(`${BASE_URL}/by-token/${encodeURIComponent(token)}`).then((res) =>
      parse(res, 'Invitation not found')
    ),
  /** Public: creates the user; sign in with the same email and password afterwards. */
  accept: (data: AcceptInvitationInput): Promise<{ email: string }> =>
    send(`${BASE_URL}/accept`, 'POST', 'Failed to accept the invitation', data),
}
