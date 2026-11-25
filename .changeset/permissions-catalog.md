---
'@telamonjs/permissions': minor
---

The Prisma fragment (`@telamonjs/permissions/prisma/schema.prisma`) is now the RBAC core every consumer app shares, in English: `Role`, `Permission` (`code` = `module.action`, `action` a String), `RolePermission` and `UserRole`, with the relation to the app's own `User` explained in comments. The one-app extras of the old pt-BR fragment (`AcaoPermissao` with nine actions, `cor`/`prioridade`, `requerContexto`/`tempoExpiracao`, `condicoes`/`escopo`, `PermissaoUsuario`, `LogPermissao`) are gone. The fragment is a template apps copy, not runtime code: schemas already copied from the old one keep working untouched.

New `diffPermissionCatalog(catalog, rows)`, a pure helper (root entry, Nest-free) that compares the permission catalog defined in code with the `Permission` rows and returns `{ toCreate, toUpdate, toDelete, unchanged }`; the README and the docs site show the sync with Prisma in one transaction.
