import { encode, decode } from '@auth/core/jwt'
import { stampSessionTimes } from './session'
import type { AuthUser, MfJwtPayload, RoleInfo } from './types'

export interface TokenConfig {
  /** Default: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET */
  secret?: string
  /**
   * Key-derivation salt for the JWE — it MUST be identical on both sides.
   * Default: 'authjs.session-token' (NextAuth v5). Projects on the legacy
   * v4 cookie use 'next-auth.session-token'.
   */
  salt?: string
  /**
   * Seconds. Encoding: the token lifetime, default 24h. Decoding (and the
   * guard): only when set, rejects a token issued longer ago than this;
   * unset, the token's own `exp` is the only limit.
   */
  maxAge?: number
}

export const DEFAULT_SALT = 'authjs.session-token'
export const DEFAULT_MAX_AGE = 24 * 60 * 60

export function resolveTokenConfig(
  config?: TokenConfig
): Required<TokenConfig> {
  const secret =
    config?.secret ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET or NEXTAUTH_SECRET must be defined')
  }
  return {
    secret,
    salt: config?.salt ?? DEFAULT_SALT,
    maxAge: config?.maxAge ?? DEFAULT_MAX_AGE,
  }
}

/**
 * Issues the session JWE in the NextAuth v5 format (for server-side login on
 * the API, impersonation, etc.). Same secret+salt as the Next app.
 *
 * A payload without `authTime` is a new session: it gets `authTime`/`accessAt`
 * stamped (on a copy), so `sessionState` does not read it as issued at 0.
 */
export async function encodeSessionToken(
  payload: MfJwtPayload,
  config?: TokenConfig
): Promise<string> {
  const { secret, salt, maxAge } = resolveTokenConfig(config)
  const token =
    payload.authTime == null ? stampSessionTimes({ ...payload }) : payload
  return encode({ token, secret, salt, maxAge })
}

/**
 * Decodes the session JWE. Returns null for an invalid/expired token.
 * An explicit `config.maxAge` also rejects a token issued (`iat`) more than
 * that many seconds ago; without it, only the token's own `exp` applies.
 */
export async function decodeSessionToken(
  token: string,
  config?: TokenConfig
): Promise<MfJwtPayload | null> {
  const { secret, salt } = resolveTokenConfig(config)
  try {
    const payload = (await decode({ token, secret, salt })) as MfJwtPayload | null
    if (!payload) return null
    // A token without iat counts as issued at 0: fail closed
    if (config?.maxAge != null && (payload.iat ?? 0) + config.maxAge < Date.now() / 1000) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

/**
 * Maps the JWT payload to the request's AuthUser,
 * including the impersonation block.
 */
export function payloadToAuthUser(payload: MfJwtPayload): AuthUser {
  const role = payload.role as RoleInfo
  const roles = payload.roles ?? (role ? [role] : [])
  const user: AuthUser = {
    id: payload.id,
    pessoaId: payload.pessoaId ? String(payload.pessoaId) : undefined,
    name: payload.name,
    email: payload.email,
    role,
    roles,
    permissions: payload.permissions ?? [],
    sessionId: payload.sid ?? payload.jti,
  }

  if (payload.clienteIds) {
    user.clienteIds = payload.clienteIds
  }

  if (payload.impersonatedUserId) {
    const origRole = payload.originalUserRole as RoleInfo
    const origRoles = payload.originalUserRoles ?? (origRole ? [origRole] : [])
    user.isImpersonating = true
    user.impersonationLogId = payload.impersonationLogId
    user.originalUser = {
      id: payload.originalUserId as string,
      name: payload.originalUserName as string,
      email: payload.originalUserEmail as string,
      role: origRole,
      roles: origRoles,
    }
  }

  return user
}
