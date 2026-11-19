import { encodeSessionToken, type TokenConfig } from './jwt'
import type { MfJwtPayload, RoleInfo } from './types'

/** Seconds. Impersonation token default: 1h (the normal session is 24h). */
export const DEFAULT_IMPERSONATION_MAX_AGE = 60 * 60

/**
 * Data for one side of the impersonation, ALREADY RESOLVED by the app.
 * The package never touches the database — loading the user/roles/permissions
 * is the app's job.
 */
export interface ImpersonationParty {
  id: string
  pessoaId?: string
  name?: string
  email: string
  role: RoleInfo
  roles?: RoleInfo[]
  permissions?: string[]
}

export interface CreateImpersonationTokenInput {
  /** User being impersonated — becomes the subject of the token. */
  target: ImpersonationParty & { permissions: string[] }
  /** Admin who started it (becomes the `original*` block). */
  actor: ImpersonationParty
  /** Id of the app's audit record (used by the revocation check in the guard). */
  logId: string
  /** Seconds. Default: `DEFAULT_IMPERSONATION_MAX_AGE` (1h). */
  maxAge?: number
  /**
   * Includes `originalPermissions` in the token. Default: false — it only
   * bloats the payload (chunked cookie) and nothing in the package reads
   * those permissions.
   */
  includeOriginalPermissions?: boolean
}

/**
 * Issues the impersonation token: a session JWE whose SUBJECT is the target
 * and which carries the actor in the `original*` claims — exactly the shape
 * `payloadToAuthUser` reads back (`isImpersonating` + `originalUser`).
 *
 * The token doubles as a credential: sent as `Authorization: Bearer` it
 * authenticates as the target on the API, with `impersonationLogId` for
 * revocation.
 *
 * ```ts
 * const token = await createImpersonationToken({ target, actor, logId: log.id })
 * ```
 *
 * `iat`/`exp`/`jti` are written by `@auth/core/jwt.encode` — the TTL goes
 * through `maxAge`, never as a claim in the payload.
 */
export async function createImpersonationToken(
  {
    target,
    actor,
    logId,
    maxAge,
    includeOriginalPermissions,
  }: CreateImpersonationTokenInput,
  config?: TokenConfig
): Promise<string> {
  const payload: MfJwtPayload = {
    sub: target.id,
    id: target.id,
    pessoaId: target.pessoaId,
    name: target.name,
    email: target.email,
    role: target.role,
    roles: target.roles ?? [target.role],
    permissions: target.permissions ?? [],

    impersonatedUserId: target.id,
    impersonationLogId: logId,
    originalUserId: actor.id,
    originalUserName: actor.name,
    originalUserEmail: actor.email,
    originalUserRole: actor.role,
    originalUserRoles: actor.roles ?? [actor.role],
  }

  if (includeOriginalPermissions) {
    payload.originalPermissions = actor.permissions ?? []
  }

  return encodeSessionToken(payload, {
    ...config,
    maxAge: maxAge ?? config?.maxAge ?? DEFAULT_IMPERSONATION_MAX_AGE,
  })
}
