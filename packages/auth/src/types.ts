export interface RoleInfo {
  id: string
  name: string
  code: string
}

/** Authenticated user attached to the request by the JwtAuthGuard */
export interface AuthUser {
  id: string
  pessoaId?: string
  name?: string
  email: string
  role: RoleInfo
  roles?: RoleInfo[]
  permissions: string[]

  /**
   * Session tracking: the stable per-login `sid` claim, falling back to the
   * JWT's `jti` (which NextAuth rotates on every cookie renewal)
   */
  sessionId?: string

  /** Client IDs derived from view/scope (optional, app domain) */
  clienteIds?: string[]

  isImpersonating?: boolean
  /** Id of the impersonation audit log (`impersonationLogId` claim) */
  impersonationLogId?: string
  originalUser?: {
    id: string
    name: string
    email: string
    role: RoleInfo
    roles?: RoleInfo[]
  }
}

/** Session JWE payload (shared Next ↔ Nest contract) */
export interface MfJwtPayload {
  id: string
  pessoaId?: string
  name?: string
  email: string
  role: RoleInfo
  roles?: RoleInfo[]
  permissions: string[]

  clienteIds?: string[]

  // NextAuth claims
  sub?: string
  iat?: number
  exp?: number
  jti?: string
  /** Stable per-login session id — survives cookie/token renewal */
  sid?: string

  // Impersonation
  impersonatedUserId?: string
  impersonationLogId?: string
  originalUserId?: string
  originalUserName?: string
  originalUserEmail?: string
  originalUserRole?: RoleInfo
  originalUserRoles?: RoleInfo[]
  originalPermissions?: string[]
  originalPessoaId?: string
  /** The actor's accessToken, kept while impersonation is active */
  originalAccessToken?: string

  [claim: string]: unknown
}

/** Compatibility alias for the name used in the apps */
export type JwtPayload = MfJwtPayload
