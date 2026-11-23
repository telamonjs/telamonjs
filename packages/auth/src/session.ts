/**
 * Session freshness & revocation — pure, isomorphic, DB-agnostic.
 *
 * Roles/permissions are materialized in the session token, so a change in the
 * database only reaches the token at the next login, and a token cannot be
 * revoked by itself. The app keeps two per-user timestamps (e.g.
 * `accessChangedAt`, `sessionsRevokedAt`) and compares them with the times
 * stamped into the token at login; these helpers do the comparison.
 */

/** Login/claims times stamped into the session token. */
export interface SessionTimes {
  /** Login time, epoch ms */
  authTime?: number
  /** When roles/permissions in the token were computed, epoch ms */
  accessAt?: number
}

/** Per-user marks the app stores. `null`/`undefined` mean "nothing changed". */
export interface SessionMarks {
  /** Every session that logged in before this instant is revoked */
  revokedAt?: Date | number | null
  /** Roles/permissions changed at this instant */
  accessChangedAt?: Date | number | null
}

/**
 * - `revoked`: the session must end (sign out / 401)
 * - `stale`: the session is valid, but its roles/permissions must be recomputed
 * - `fresh`: the token is up to date
 */
export type SessionState = 'revoked' | 'stale' | 'fresh'

/** Stamps `authTime` and `accessAt` (epoch ms). Mutates and returns the token. */
export function stampSessionTimes<T extends object>(
  token: T,
  now: number = Date.now()
): T & Required<SessionTimes> {
  return Object.assign(token, { authTime: now, accessAt: now })
}

function toMs(mark: Date | number | null | undefined): number | null {
  if (mark == null) return null
  return typeof mark === 'number' ? mark : mark.getTime()
}

/**
 * Compares the token's times with the user's marks. Revoked wins over stale.
 * A missing claim counts as 0, so tokens issued before adoption are caught by
 * the next revocation/access change.
 */
export function sessionState(
  token: SessionTimes,
  marks: SessionMarks
): SessionState {
  const revokedAt = toMs(marks.revokedAt)
  if (revokedAt !== null && revokedAt > (token.authTime ?? 0)) return 'revoked'
  const accessChangedAt = toMs(marks.accessChangedAt)
  if (accessChangedAt !== null && accessChangedAt > (token.accessAt ?? 0)) {
    return 'stale'
  }
  return 'fresh'
}
