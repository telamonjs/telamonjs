# @telamonjs/permissions

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

## Role helpers

```ts
isAdminRole(role, roles)             // 'admin' | 'superadmin'
isSuperAdminRole(role, roles)        // privilege gates only
hasGlobalDataVisibility(role, roles) // data scoping only: don't mix the two
getPrimaryRole(role, roles)
```

Multi-role first: `roles[]` wins everywhere, and the singular `role` is the fallback.

## Reference Prisma schema

A starting-point schema ships with the package. Copy it into your
`schema.prisma` and adapt it: it is a reference, not a managed migration.

```bash
cat node_modules/@telamonjs/permissions/src/prisma/schema.prisma
```

The model and enum names are in **Portuguese (pt-BR)**: `Papel` (role),
`UsuarioPapel` (user ↔ role), `Permissao` (permission), `PermissaoPapel`
(role ↔ permission), `PermissaoUsuario` (per-user grant/revoke overrides) and
`LogPermissao` (audit log), plus the enums `AcaoPermissao`, `TipoOverride` and
`ResultadoPermissao`. Rename them freely in your copy; the checker only reads
the `permissions[]` claim.

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

**Full docs →** [the permissions page of the docs site](https://github.com/telamonjs/telamonjs/tree/main/apps/docs/content/docs/packages)
(MDX sources, readable on GitHub).
