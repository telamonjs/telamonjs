# CLAUDE.md — `apps/api`

NestJS, port {{apiPort}} (`API_PORT`), global prefix `v1`.

## Module pattern

```
modules/<name>/
  <name>.controller.ts   # routes, no direct Prisma
  <name>.service.ts      # orchestrates PrismaService (+ shared logic, once there is any)
  <name>.module.ts
  dto/                    # class-validator, only on write bodies
```

## Guards

- `JwtAuthGuard` — global (`APP_GUARD`), built with `createJwtAuthGuard()`
  from `@telamonjs/auth/nest`. Decodes the NextAuth session token issued by
  `apps/web` (`Authorization: Bearer`, `?token=` for SSE, or the cookie) with
  `NEXTAUTH_SECRET`, then `resolveUser` reads the user's freshness marks by
  primary key (`sessionState` of `@telamonjs/auth`): deleted, inactive or
  revoked (`sessionsRevokedAt`) → 401; access changed after the token was
  issued (`accessChangedAt`) → roles/permissions recomputed with `loadAccess`
  from `{{scope}}/shared/rbac`. `request.user` is the package's `AuthUser`
  (`roles[]`, `permissions[]`). Mark public routes with `@Public()` from
  `@telamonjs/auth/nest` (health, future webhooks).
- `PermissionsGuard` — global too, after `JwtAuthGuard`, built with
  `createPermissionsGuard()` from `@telamonjs/permissions/nest`. Put
  `@Permissions('users.write')` on every route that needs more than a session
  (string clauses are OR, an inner array is AND). The codes are the catalog in
  `packages/shared/src/rbac.ts`; no role bypasses the check (the seeded
  `admin` role simply holds every permission).

## RBAC

- `modules/roles` — role CRUD, `GET /v1/roles/matrix` (roles × permission ids,
  for the web `PermissionMatrix`) and `POST`/`DELETE
  /v1/roles/:id/permissions/:permissionId` (grant/revoke one cell). Built-in
  roles (`system`) are read-only.
- Any change to what a token says marks the affected users stale: a role's
  permissions/name/code or its deletion (`markRoleHoldersStale`), a user's
  `roleIds` (`accessChangedAt`); deactivating a user or changing their password sets
  `sessionsRevokedAt`. New permission: add it to the catalog, guard the route
  with `@Permissions`, run `pnpm db:seed`.

## Testing with a real cookie

```bash
pnpm --filter {{scope}}/api dev
curl http://localhost:{{apiPort}}/v1/health                      # 200, no cookie
curl -b "authjs.session-token=$TOKEN" http://localhost:{{apiPort}}/v1/usuarios
```

`$TOKEN` is produced by `encodeSessionToken()` from `@telamonjs/auth` (same
`NEXTAUTH_SECRET`, default salt `'authjs.session-token'`, with the
`permissions` the route needs), or copied from the browser's
`authjs.session-token` cookie after signing in to `apps/web`.
