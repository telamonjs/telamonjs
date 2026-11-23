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
  `NEXTAUTH_SECRET`, then `resolveUser` loads the user by primary key: inactive
  or deleted users get a 401, and `role` comes from the database. `request.user`
  is the package's `AuthUser` (`role` is a `RoleInfo`: `{ id, name, code }`).
  Mark public routes with `@Public()` from `@telamonjs/auth/nest` (health,
  future webhooks).
- `@AdminOnly()` — `role.code === 'ADMIN'`.

## Testing with a real cookie

```bash
pnpm --filter {{scope}}/api dev
curl http://localhost:{{apiPort}}/v1/health                      # 200, no cookie
curl -b "authjs.session-token=$TOKEN" http://localhost:{{apiPort}}/v1/usuarios
```

`$TOKEN` is produced by `encodeSessionToken()` from `@telamonjs/auth` (same
`NEXTAUTH_SECRET`, default salt `'authjs.session-token'`), or copied from the
browser's `authjs.session-token` cookie after signing in to `apps/web`.
