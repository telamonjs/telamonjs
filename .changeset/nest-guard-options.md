---
'@telamonjs/auth': minor
'@telamonjs/permissions': minor
---

Nest guard options for late configuration, linked packages and denial logging.

- `@telamonjs/auth`: `createJwtAuthGuard({ secret })` also accepts a function (sync or async) resolved on every request, e.g. `secret: () => process.env.AUTH_SECRET`, so the secret can come from env loaded after the guard module is imported. Static values keep working.
- `@telamonjs/auth` and `@telamonjs/permissions`: new `createException?: (status: 401 | 403, message: string) => Error` option on `createJwtAuthGuard` and `createPermissionsGuard`. While a package is linked, pass the host's `UnauthorizedException`/`ForbiddenException` so the host's exception filters recognize them (otherwise they surface as a 500). Default unchanged.
- `@telamonjs/permissions`: new `onDenied?: ({ user, required, request }) => void` option, called right before every 403 (the response message stays the generic `Insufficient permissions`). New exported type `PermissionDeniedContext`.
