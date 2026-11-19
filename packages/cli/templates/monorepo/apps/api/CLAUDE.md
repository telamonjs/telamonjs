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

- `JwtAuthGuard` — global (`APP_GUARD`). Decodes the NextAuth session cookie
  (`@auth/core/jwt`, `NEXTAUTH_SECRET`) or an `Authorization: Bearer` header.
  Mark public routes with `@Public()` (health, future webhooks).
- `@AdminOnly()` — `role === 'ADMIN'`.

## Testing with a real cookie

```bash
pnpm --filter {{scope}}/api dev
curl http://localhost:{{apiPort}}/v1/health                      # 200, no cookie
curl -b "authjs.session-token=$TOKEN" http://localhost:{{apiPort}}/v1/usuarios
```

`$TOKEN` is produced by `@auth/core/jwt`'s `encode()` with the same
`NEXTAUTH_SECRET` and `salt: 'authjs.session-token'`, or copied from the
browser's `authjs.session-token` cookie after signing in to `apps/web`.
