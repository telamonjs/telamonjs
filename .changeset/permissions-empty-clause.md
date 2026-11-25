---
'@telamonjs/permissions': patch
---

An empty permission list now denies instead of granting access. `canAll(user, [])` and `canAny(user, [])` return `false` for every user, bypass roles included. `@Permissions()` with no clause, or with an empty `[]` clause, throws when the decorator is applied, and `createPermissionsGuard()` denies (403) a route whose permission metadata is an empty list instead of treating it as a route without the decorator (which left it open unless `failClosed` was set).
