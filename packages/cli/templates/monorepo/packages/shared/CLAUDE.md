# CLAUDE.md — {{scope}}/shared

Prisma client + schema, the only thing shared by `apps/web`, `apps/api` and
`apps/jobs`. Compiled with `tsc` to `dist/`, consumed via the `exports` map
in `package.json` — never via a relative `../../packages/shared/src` import.

## Exports

```
./prisma  → dist/lib/prisma.js
./rbac    → dist/rbac.js        # PERMISSIONS catalog, loadAccess, markRoleHoldersStale
```

`src/rbac.ts` is the RBAC source of the whole repo: the permission catalog
(the seed syncs the `Permission` table with it), `loadAccess()` (roles +
permission codes, read by `apps/web` at sign-in and by `apps/api`'s guard on a
stale token) and `markRoleHoldersStale()`. Add a permission there, enforce it
with `@Permissions()` in `apps/api`, then `pnpm db:seed`.

Add more entries here as real shared logic moves in (e.g. `./lib/*` →
`dist/lib/*.js`) — don't add a barrel `index.ts` re-exporting everything:
some future modules here may import Prisma/`node:fs` and would break any
client bundle that imports the barrel by accident.

## Rules

- **Never import `next` or `next-auth` here.** The NextAuth config
  (`auth.ts`) and anything that reads `next/headers` belongs in
  `apps/web` — `packages/shared` has to stay importable from `apps/api`
  (plain Node/NestJS) and `apps/jobs` (plain Node), neither of which runs
  inside Next's request lifecycle.
- **`declaration: false` in `tsconfig.json` is intentional** — consumers
  resolve against `dist/*.js` via the `exports` map, not `.d.ts` project
  references, so emitting declarations here is dead weight.
- `prisma/` holds the schema, migrations and seed — `apps/web` and
  `apps/api` never have their own `prisma/` directory or `schema.prisma`.

## Commands

```bash
pnpm --filter {{scope}}/shared build         # tsc -> dist
pnpm --filter {{scope}}/shared prisma:push   # or db:push from the root
pnpm --filter {{scope}}/shared prisma:seed   # admin@example.com / 12345
```
