# Changelog

## 1.1.0

### Minor Changes

- 0384dc9: Nest guard options for late configuration, linked packages and denial logging.

  - `@telamonjs/auth`: `createJwtAuthGuard({ secret })` also accepts a function (sync or async) resolved on every request, e.g. `secret: () => process.env.AUTH_SECRET`, so the secret can come from env loaded after the guard module is imported. Static values keep working.
  - `@telamonjs/auth` and `@telamonjs/permissions`: new `createException?: (status: 401 | 403, message: string) => Error` option on `createJwtAuthGuard` and `createPermissionsGuard`. While a package is linked, pass the host's `UnauthorizedException`/`ForbiddenException` so the host's exception filters recognize them (otherwise they surface as a 500). Default unchanged.
  - `@telamonjs/permissions`: new `onDenied?: ({ user, required, request }) => void` option, called right before every 403 (the response message stays the generic `Insufficient permissions`). New exported type `PermissionDeniedContext`.

## 1.0.2

### Patch Changes

- 3f8c5f7: Harden the NestJS permissions guard.

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

## 1.0.1

First public release of `@telamonjs/permissions`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
