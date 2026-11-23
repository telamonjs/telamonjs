import { decodeSessionToken, type TokenConfig } from '../jwt'
import { stampSessionTimes } from '../session'
import type { MfJwtPayload, RoleInfo } from '../types'

/**
 * Canonical claims the app's authorize() must return on the user object
 * so the callbacks can copy them into the token.
 */
export interface SessionClaims {
  id: string
  pessoaId?: string
  name?: string
  email: string
  role: RoleInfo
  roles?: RoleInfo[]
  permissions: string[]
  accessToken?: string
  refreshToken?: string
  /** Stable per-login session id, kept across cookie renewals */
  sid?: string
  /** Login time, epoch ms. Stamped by `jwt` at login — authorize() need not return it */
  authTime?: number
  /** When roles/permissions were computed, epoch ms. Stamped by `jwt` at login */
  accessAt?: number
}

/** Impersonation cookies read by the app (the package does not import next/headers). */
export interface ImpersonationCookies {
  /** Token issued by `createImpersonationToken` */
  token?: string
  /** Audit log id */
  logId?: string
}

export interface AuthCallbacksOptions {
  /**
   * Enables impersonation in the callbacks (opt-in). Reads the cookies in the app:
   *
   * ```ts
   * createAuthCallbacks({
   *   getImpersonationCookies: async () => {
   *     const c = await cookies()
   *     return {
   *       token: c.get('impersonation-token')?.value,
   *       logId: c.get('impersonation-log-id')?.value
   *     }
   *   },
   *   clearImpersonationCookies: async () => {
   *     const c = await cookies()
   *     c.delete('impersonation-token')
   *     c.delete('impersonation-log-id')
   *   }
   * })
   * ```
   */
  getImpersonationCookies?: () => Promise<
    ImpersonationCookies | null | undefined
  >
  /** Called when the impersonation token expires or is invalid. Optional. */
  clearImpersonationCookies?: () => Promise<void> | void
  /** secret/salt to decode the impersonation token. Default: env + v5 salt. */
  tokenConfig?: TokenConfig
}

/**
 * Token field ↔ claim where the ACTOR's value is kept while impersonation
 * is active. `refreshToken` is left out on purpose: it stays the actor's,
 * which is what keeps the session refresh healthy.
 */
const IMPERSONATION_SWAP = {
  id: 'originalUserId',
  pessoaId: 'originalPessoaId',
  name: 'originalUserName',
  email: 'originalUserEmail',
  role: 'originalUserRole',
  roles: 'originalUserRoles',
  permissions: 'originalPermissions',
  accessToken: 'originalAccessToken',
} as const

type MutableToken = Record<string, unknown>

/** Ends the impersonation: restores the actor's values and clears the claims. */
function restoreActor(token: MutableToken): void {
  if (token.originalUserId) {
    for (const [field, claim] of Object.entries(IMPERSONATION_SWAP)) {
      token[field] = token[claim]
    }
  }
  for (const claim of Object.values(IMPERSONATION_SWAP)) delete token[claim]
  delete token.impersonatedUserId
  delete token.impersonationLogId
  delete token.isImpersonating
}

async function applyImpersonation(
  token: MutableToken,
  options: AuthCallbacksOptions
): Promise<void> {
  // The expiry flag lives for EXACTLY one cycle: set below on restore,
  // read by `session` in the same pass, deleted here on the next pass.
  delete token.impersonationExpired

  const cookies = await options.getImpersonationCookies?.()
  const impersonationToken = cookies?.token
  const logId = cookies?.logId

  if (!impersonationToken || !logId) {
    // Cookie is gone (stop-impersonate) → back to the actor, silently.
    if (token.impersonatedUserId) restoreActor(token)
    return
  }

  const payload = await decodeSessionToken(
    impersonationToken,
    options.tokenConfig
  )

  if (!payload) {
    // Expired/invalid. Orphan cookie with no active impersonation: ignore.
    if (!token.impersonatedUserId) return
    restoreActor(token)
    token.impersonationExpired = true
    await options.clearImpersonationCookies?.()
    return
  }

  if (!token.originalUserId) {
    for (const [field, claim] of Object.entries(IMPERSONATION_SWAP)) {
      token[claim] = token[field]
    }
  }

  token.id = payload.id
  token.pessoaId = payload.pessoaId
  token.name = payload.name
  token.email = payload.email
  token.role = payload.role
  token.roles = payload.roles ?? (payload.role ? [payload.role] : [])
  token.permissions = payload.permissions ?? []
  // The impersonation token IS the API credential. Without swapping the
  // accessToken the impersonation is merely cosmetic: the UI shows the target
  // while API calls keep going out with the admin's credential.
  token.accessToken = payload.accessToken ?? impersonationToken
  token.impersonatedUserId = payload.id
  token.impersonationLogId = payload.impersonationLogId ?? logId
  token.isImpersonating = true
}

type JwtArgs = { token: Record<string, unknown>; user?: unknown }
// Generic over the app's session type (next-auth's `Session` is an interface
// without an index signature), so `base.session` plugs straight into
// `callbacks.session` and keeps fields like `expires`.
type SessionArgs<S> = { session: S; token: Record<string, unknown> }

/** What `session` adds on top of the app's session object. */
export interface SessionExtras {
  user: Record<string, unknown> & {
    id?: string
    pessoaId?: string
    role?: RoleInfo
    roles: RoleInfo[]
    permissions?: string[]
    accessToken?: string
    refreshToken?: string
  }
  isImpersonating: boolean
  impersonationLogId?: string
  impersonationExpired: boolean
  originalUser?: {
    id: string
    name?: string
    email?: string
    role?: RoleInfo
    roles: RoleInfo[]
  }
}

/**
 * jwt/session callbacks with the canonical claim-copy of the session
 * contract (id, role, roles[], permissions, impersonation).
 *
 * When `getImpersonationCookies` is passed, `jwt` also applies/ends
 * impersonation (swaps id/role/permissions **and accessToken** for the
 * target's, restoring everything on stop/expiry). Without that option the
 * behavior is exactly as before. The app composes on top for its own logic
 * (sliding window etc.):
 *
 * ```ts
 * const base = createAuthCallbacks()
 * callbacks: {
 *   jwt: async (args) => { const token = await base.jwt(args); ...; return token },
 *   session: base.session
 * }
 * ```
 */
export function createAuthCallbacks(options: AuthCallbacksOptions = {}) {
  return {
    async jwt({ token, user }: JwtArgs): Promise<Record<string, unknown>> {
      if (user) {
        const u = user as Partial<SessionClaims>
        token.id = u.id
        token.pessoaId = u.pessoaId
        token.name = u.name
        token.email = u.email
        token.role = u.role
        token.roles = u.roles || (u.role ? [u.role] : [])
        token.permissions = u.permissions
        token.accessToken = u.accessToken
        token.refreshToken = u.refreshToken
        // stable across renewals (NextAuth rotates jti on every encode)
        if (u.sid) token.sid = u.sid
        // only at a real login — renewals and impersonation swaps keep the times
        stampSessionTimes(token)
      }
      if (options.getImpersonationCookies) {
        await applyImpersonation(token, options)
      }
      return token
    },

    session<S extends { user?: object | null }>({
      session,
      token,
    }: SessionArgs<S>): S & SessionExtras {
      const t = token as Partial<MfJwtPayload> &
        Pick<SessionClaims, 'accessToken' | 'refreshToken'> &
        Record<string, unknown>
      const extras: SessionExtras = {
        user: {
          ...(session.user as Record<string, unknown> | null | undefined),
          id: t.id,
          pessoaId: t.pessoaId,
          role: t.role,
          roles: t.roles || (t.role ? [t.role] : []),
          permissions: t.permissions,
          accessToken: t.accessToken,
          refreshToken: t.refreshToken,
        },
        isImpersonating: !!t.impersonatedUserId,
        impersonationLogId: t.impersonationLogId,
        // true for ONE pass, right after the impersonation expires (toast)
        impersonationExpired: !!t.impersonationExpired,
        originalUser: t.originalUserId
          ? {
              id: t.originalUserId,
              name: t.originalUserName,
              email: t.originalUserEmail,
              role: t.originalUserRole,
              roles:
                t.originalUserRoles ||
                (t.originalUserRole ? [t.originalUserRole] : []),
            }
          : undefined,
      }
      return { ...session, ...extras }
    },
  }
}

export type { MfJwtPayload, RoleInfo } from '../types'
