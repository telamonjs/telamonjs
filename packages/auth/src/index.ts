/**
 * @telamonjs/auth — NextAuth v5 ↔ NestJS auth bridge.
 *
 * Isomorphic core: the session token contract (JWE @auth/core) shared
 * between the Next app and the Nest API. The login authorize() belongs to
 * the app; this package owns the token format, not the login flow.
 *
 * NestJS side (guard + @Public): '@telamonjs/auth/nest'.
 * Next side (callbacks): '@telamonjs/auth/next'.
 */

export {
  encodeSessionToken,
  decodeSessionToken,
  payloadToAuthUser,
  resolveTokenConfig,
  DEFAULT_SALT,
  DEFAULT_MAX_AGE,
  type TokenConfig,
} from './jwt'

export {
  createImpersonationToken,
  DEFAULT_IMPERSONATION_MAX_AGE,
  type ImpersonationParty,
  type CreateImpersonationTokenInput,
} from './impersonation'

export type { RoleInfo, AuthUser, MfJwtPayload, JwtPayload } from './types'
