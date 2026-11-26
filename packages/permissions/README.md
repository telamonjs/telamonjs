<a href="https://github.com/telamonjs/telamonjs"><img alt="TelamonJS" src="https://cdn.jsdelivr.net/gh/telamonjs/telamonjs@main/.github/assets/logo-mark.svg" height="40"></a>

# @telamonjs/permissions

[![npm](https://img.shields.io/npm/v/@telamonjs/permissions.svg)](https://www.npmjs.com/package/@telamonjs/permissions) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/telamonjs/telamonjs/blob/main/LICENSE)

RBAC **materialized into the JWT**. Permissions are resolved once at login and
carried in the token, so every check is a pure array lookup on the claims:
**no database query per request**. The core is client-safe (fine inside a
React component); `@telamonjs/permissions/nest` adds a `@Permissions(...)`
decorator and a guard that reads the same array off `request.user`.

Zero runtime dependencies · dual ESM/CJS · `sideEffects: false`.

## Install

<!-- generated:peers -->
```bash
pnpm add @telamonjs/permissions
```

| Peer dependency | Range |
| --- | --- |
| `@nestjs/common` (optional) | `^10.0.0 \|\| ^11.0.0` |
| `@nestjs/core` (optional) | `^10.0.0 \|\| ^11.0.0` |
<!-- /generated:peers -->

The Nest peers are only needed for `@telamonjs/permissions/nest`.

## Client-safe checker, once per app

```ts
import { createPermissionChecker } from '@telamonjs/permissions'

export const { can, canAny, canAll, hasBypassRole } =
  createPermissionChecker({ bypassRoles: ['superadmin'] })

can(user, 'users.write')                 // single permission
canAny(user, ['a.read', 'b.read'])       // OR
canAll(user, ['a.read', 'a.write'])      // AND
```

An empty list (`canAny(user, [])`, `canAll(user, [])`) denies, bypass roles
included: an empty requirement is a bug, not "nothing required".

Role table in code, or a "grants everything" code? Two optional settings:

```ts
createPermissionChecker({
  bypassRoles: [],
  rolePermissions: { teacher: ['classes.read', 'grades.write'] }, // merged with user.permissions
  wildcard: '*', // holding '*' grants every permission (an empty list still denies)
})
```

`rolePermissions` reads every role in `roles[]`, with the singular `role` as the
fallback. `createPermissionsGuard` takes the same two options.

`user` is anything shaped like `UserWithPermissions`
(`{ id, role?, roles?, permissions? }`). The `AuthUser` from
[`@telamonjs/auth`](https://www.npmjs.com/package/@telamonjs/auth) satisfies it
by design: a duck-typed contract pinned by a test, with no dependency between
the packages.

## NestJS guard and decorator

```ts
import { createPermissionsGuard, Permissions } from '@telamonjs/permissions/nest'

export const PermissionsGuard = createPermissionsGuard() // bypassRoles defaults to ['superadmin']

@Get('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)   // auth first: it sets request.user
@Permissions('admin.read', 'admin.write')    // string clauses are OR
getAdminData() {}

@Permissions(['admin.read', 'admin.write'])  // an inner array is AND
```

The guard delegates to the same checker, so client and server checks can't drift.
A request with no `request.user` gets a 401; a user without the permission gets a
403 with the generic message `Insufficient permissions` (the required codes are
never sent to the client).

`@Permissions()` with no clause, or with an empty `[]` clause, throws when the
decorator is applied, and the guard denies (403) any route whose permission
metadata is an empty list — it is never read as "no decorator".

By default a route without `@Permissions` is open. Opt into deny-by-default with
`failClosed`; then only routes marked `@Public()` skip the decorator:

```ts
import { createPermissionsGuard, Public } from '@telamonjs/permissions/nest'

export const PermissionsGuard = createPermissionsGuard({ failClosed: true })

@Public()          // same metadata key as Public() from @telamonjs/auth/nest
@Get('health')
health() {}
```

Two more options:

- `onDenied({ user, required, request })` is called right before every 403
  (log the denial there). The client still gets the generic message.
- `createException(status, message)` builds the 401/403. Set it while the
  package is linked (`link:`/`file:`), so the guard throws the host's
  `@nestjs/common` classes instead of its own copy's, which the host's filters
  would turn into a 500:

```ts
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'

export const PermissionsGuard = createPermissionsGuard({
  onDenied: ({ user, required }) => logger.warn('permission denied', { userId: user?.id, required }),
  createException: (status, message) =>
    status === 401 ? new UnauthorizedException(message) : new ForbiddenException(message),
})
```

## Role helpers

```ts
isAdminRole(role, roles)             // 'admin' | 'superadmin'
isSuperAdminRole(role, roles)        // privilege gates only
hasGlobalDataVisibility(role, roles) // data scoping only: don't mix the two
getPrimaryRole(role, roles)
```

Multi-role first: `roles[]` wins everywhere, and the singular `role` is the fallback.

## Prisma schema: the RBAC tables

The tables the admin kit generates ship with the package as a fragment. Copy
it into your `schema.prisma` and migrate: it is a template, not a managed
migration.

```bash
cat node_modules/@telamonjs/permissions/src/prisma/schema.prisma
```

| Model | Columns |
| --- | --- |
| `Role` | `id`, `name`, unique `code` (`superadmin`, `admin`, …), `description?`, `system` (built-in, not deletable) |
| `Permission` | `id`, unique `code` (`module.action`), `module`, `action`, `category?`, `description?` |
| `RolePermission` | `roleId` + `permissionId`, unique together |
| `UserRole` | `userId` + `roleId`, unique together (multi-role) |

`action` is a `String` holding the suffix of the code (`read`, `write`,
`execute`, `approve`), not an enum: a new action needs no migration, and the
catalog helper below derives it from the code. Your app owns the `User` model:
add `roles UserRole[]` to it (the fragment's comments show where). Rename the
models freely; the checker only reads the `permissions[]` claim.

## Syncing the permission catalog

Define the catalog in code and reconcile the `Permission` table with it — at
deploy, in a seed or on boot. `diffPermissionCatalog(catalog, rows)` is pure:
it matches by `code` and returns `{ toCreate, toUpdate, toDelete, unchanged }`.
`module`/`action` default to the two halves of `code` (split at the last dot);
only a changed `description` or `category` counts as an update.

```ts
import { diffPermissionCatalog, type PermissionDefinition } from '@telamonjs/permissions'

export const PERMISSIONS: PermissionDefinition[] = [
  { code: 'users.read', category: 'Records', description: 'View users' },
  { code: 'users.write', category: 'Records', description: 'Create, edit and remove users' },
]

export async function syncPermissions(prisma: PrismaClient) {
  const rows = await prisma.permission.findMany()
  const { toCreate, toUpdate, toDelete } = diffPermissionCatalog(PERMISSIONS, rows)

  await prisma.$transaction([
    prisma.permission.createMany({ data: toCreate }),
    ...toUpdate.map(({ id, category, description }) =>
      prisma.permission.update({ where: { id }, data: { category, description } }),
    ),
    // RolePermission rows go with them (onDelete: Cascade)
    prisma.permission.deleteMany({ where: { id: { in: toDelete.map((row) => row.id) } } }),
  ])
}
```

Leave out the `deleteMany` to keep permissions that are no longer in code.
A duplicate code in the catalog, or a code without a dot and no explicit
`module`/`action`, throws.

This package **checks** permissions. *Resolving* them at login (database →
`permissions[]` claim) is your app's job, typically in your NextAuth
`authorize()` or API login, feeding `@telamonjs/auth`'s session claims.

## Entry points

<!-- generated:entries -->
- `@telamonjs/permissions`
- `@telamonjs/permissions/nest`
- `@telamonjs/permissions/prisma/schema.prisma` (file `./src/prisma/schema.prisma`)

Every name each entry point exports, runtime and types: [Public API index](https://github.com/telamonjs/telamonjs/blob/main/docs/exports.md).
<!-- /generated:entries -->

## Full docs

**Full docs →** [the permissions page of the docs site](https://telamonjs.com/docs/packages/permissions)
(MDX sources, readable on GitHub).
