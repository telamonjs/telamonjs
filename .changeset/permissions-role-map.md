---
'@telamonjs/permissions': minor
---

`createPermissionChecker` (and `createPermissionsGuard`) take two optional settings: `rolePermissions` (permissions granted by role code, merged with the user's own `permissions[]`) and `wildcard` (a code such as `'*'` that grants every permission). Without them the checks behave as before; an empty requirement list still denies.
