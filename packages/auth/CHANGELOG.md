# Changelog

## 1.4.1

### Patch Changes

- 7289ce5: Stricter session and API-key handling:

  - API-key guards treat any falsy verifier result (`false`, `0`, `''`, `NaN`) as a rejection, like `null`.
  - An explicit `maxAge` passed to `decodeSessionToken`, `createJwtAuthGuard` or `createAuthCallbacks({ tokenConfig })` is now enforced against the token's issue time. Without one, only the token's own expiry applies, as before.
  - `createJwtAuthGuard` reads the `__Secure-authjs.session-token` cookie first and, while it is present, never falls back to the plain one. APIs served only over HTTPS can pass `cookieNames: ['__Secure-authjs.session-token']`.
  - `createAuthCallbacks` applies an impersonation cookie only to the session that started the impersonation, and only for tokens issued by `createImpersonationToken`. Ending an impersonation also restores the actor's `accessAt`.

## 1.4.0

### Minor Changes

- 77a2ecc: Service-to-service auth with API keys. `@telamonjs/auth/nest` adds `createApiKeyGuard({ verify, header?, bearer?, createException? })` (the verifier's principal goes to `request.servicePrincipal`, `request.user` is untouched, failures are a generic 401, nothing is logged), `staticApiKey(expected, name?)` (constant-time check of one shared secret, closed while unset), and `@AllowServiceToken()` with a new `apiKey` option on `createJwtAuthGuard`, so a marked route accepts a session or a key. The core adds `generateApiKey(prefix?)` and `hashApiKey(key)` (hex sha256, Web Crypto).

## 1.3.0

### Minor Changes

- b00ad5f: `createJwtAuthGuard`: a protected `validateUser(user, payload, context)` hook for
  yes/no checks after `resolveUser` (user still active, account suspended, session
  ended). `true` passes; `false` or a reason string is a 401 with a generic message,
  the reason logged through the guard's Nest `Logger`; a thrown error propagates (a 5xx, like `resolveUser`), so an outage does not sign users out.
  The new `validateUserCacheTtlMs` option caches its verdict per session token (in
  memory, bounded to 1000 tokens, thrown errors never cached), so the check does not
  hit the database on every request.

## 1.2.1

### Patch Changes

- a6e2eb3: `createJwtAuthGuard()` now logs a one-time warning (Nest `Logger`) the first time it accepts an impersonation token without an `isImpersonationActive` hook: without that hook, ending an impersonation cannot revoke its token before it expires. Pass `isImpersonationActive` to make impersonation revocable and silence the warning.

## 1.2.0

### Minor Changes

- 0384dc9: Nest guard options for late configuration, linked packages and denial logging.

  - `@telamonjs/auth`: `createJwtAuthGuard({ secret })` also accepts a function (sync or async) resolved on every request, e.g. `secret: () => process.env.AUTH_SECRET`, so the secret can come from env loaded after the guard module is imported. Static values keep working.
  - `@telamonjs/auth` and `@telamonjs/permissions`: new `createException?: (status: 401 | 403, message: string) => Error` option on `createJwtAuthGuard` and `createPermissionsGuard`. While a package is linked, pass the host's `UnauthorizedException`/`ForbiddenException` so the host's exception filters recognize them (otherwise they surface as a 500). Default unchanged.
  - `@telamonjs/permissions`: new `onDenied?: ({ user, required, request }) => void` option, called right before every 403 (the response message stays the generic `Insufficient permissions`). New exported type `PermissionDeniedContext`.

## 1.1.1

### Patch Changes

- 22a3fe5: `encodeSessionToken` now stamps `authTime`/`accessAt` when the payload has no `authTime` (on a copy; existing claims are kept). Tokens issued on the API side (server-side login, `createImpersonationToken`) previously carried neither claim, so `sessionState()` reported them as `revoked` once the user had a `revokedAt` mark and `stale` once `accessChangedAt` was set. The `@auth/core` peer range is widened to `>=0.34.0 <1`, so apps on next-auth 5 beta.31 (`@auth/core` 0.41) no longer get a peer warning and a second copy. The README documents `stampSessionTimes` and `JwtAuthGuardBase`, and warns that refreshing a `stale` token must only re-stamp `accessAt`.

  `createAuthCallbacks().session` is now generic over the app's session type and returns it with the TelamonJS fields added (`SessionExtras`), so `callbacks: { session: base.session }` type-checks against next-auth's `Session` interface and keeps `expires`. Before, the callback only accepted plain records and apps needed an `as unknown as Session` cast.

## 1.1.0

### Minor Changes

- 45506e9: Session freshness and revocation building blocks. The `jwt` callback now stamps `authTime` and `accessAt` (epoch ms) at login, and the new `stampSessionTimes` / `sessionState` helpers compare them with per-user timestamps the app keeps, so permission changes can apply without a re-login and every session of a user can be revoked. The Nest guard is now subclassable: `createJwtAuthGuard<TUser>()` exposes a protected `resolveUser(payload, context)` hook (its return value becomes `request.user`, `null` is a 401) and `allowQueryToken(request)` to ignore `?token=` outside SSE routes. The base class `JwtAuthGuardBase`, the constructor type `JwtAuthGuardClass` and `RequestLike` are exported from `@telamonjs/auth/nest`, so an exported subclass compiles under `declaration: true` (no TS4094/TS4020). Existing `createJwtAuthGuard()` usage behaves as before.

## 1.0.1

First public release of `@telamonjs/auth`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
