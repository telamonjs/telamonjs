---
'@telamonjs/permissions': patch
---

Harden the NestJS permissions guard.

- **Behaviour change:** a request with no `request.user` now gets a 401
  (`UnauthorizedException`) instead of a 403 (`ForbiddenException`). A user
  without the required permission still gets a 403.
- The 403 message is now the generic `Insufficient permissions`; it no longer
  lists the required permission codes to the client.
- New opt-in `failClosed` option on `createPermissionsGuard`: when true, a route
  without `@Permissions` is denied unless marked `@Public()`. New `Public()` /
  `IS_PUBLIC_KEY` exports in `@telamonjs/permissions/nest` use the same `'isPublic'`
  key as `@telamonjs/auth/nest`, so one decorator works for both guards. Default
  stays `false`.
