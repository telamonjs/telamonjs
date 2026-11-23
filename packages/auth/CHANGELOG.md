# Changelog

## 1.1.0

### Minor Changes

- 45506e9: Session freshness and revocation building blocks. The `jwt` callback now stamps `authTime` and `accessAt` (epoch ms) at login, and the new `stampSessionTimes` / `sessionState` helpers compare them with per-user timestamps the app keeps, so permission changes can apply without a re-login and every session of a user can be revoked. The Nest guard is now subclassable: `createJwtAuthGuard<TUser>()` exposes a protected `resolveUser(payload, context)` hook (its return value becomes `request.user`, `null` is a 401) and `allowQueryToken(request)` to ignore `?token=` outside SSE routes. The base class `JwtAuthGuardBase`, the constructor type `JwtAuthGuardClass` and `RequestLike` are exported from `@telamonjs/auth/nest`, so an exported subclass compiles under `declaration: true` (no TS4094/TS4020). Existing `createJwtAuthGuard()` usage behaves as before.

## 1.0.1

First public release of `@telamonjs/auth`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
