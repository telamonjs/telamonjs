import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { createPermissionsGuard } from '@telamonjs/permissions/nest'

/**
 * PermissionsGuard — global (APP_GUARD, after JwtAuthGuard, which sets
 * `request.user`). Checks `@Permissions('users.write')` against the
 * `permissions[]` claim: a lookup, no query. String clauses are OR,
 * an inner array is AND. A route without `@Permissions` only needs a session.
 *
 * No bypass role: the built-in `admin` role holds every permission
 * explicitly (packages/shared/prisma/seed.ts). `createException` throws this
 * app's Nest classes, so the filters see a real 401/403 even while
 * @telamonjs/permissions is linked.
 */
export const PermissionsGuard = createPermissionsGuard({
  bypassRoles: [],
  createException: (status, message) =>
    status === 401 ? new UnauthorizedException(message) : new ForbiddenException(message),
})
