---
"@telamonjs/auth": patch
---

`encodeSessionToken` now stamps `authTime`/`accessAt` when the payload has no `authTime` (on a copy; existing claims are kept). Tokens issued on the API side (server-side login, `createImpersonationToken`) previously carried neither claim, so `sessionState()` reported them as `revoked` once the user had a `revokedAt` mark and `stale` once `accessChangedAt` was set. The `@auth/core` peer range is widened to `>=0.34.0 <1`, so apps on next-auth 5 beta.31 (`@auth/core` 0.41) no longer get a peer warning and a second copy. The README documents `stampSessionTimes` and `JwtAuthGuardBase`, and warns that refreshing a `stale` token must only re-stamp `accessAt`.

`createAuthCallbacks().session` is now generic over the app's session type and returns it with the TelamonJS fields added (`SessionExtras`), so `callbacks: { session: base.session }` type-checks against next-auth's `Session` interface and keeps `expires`. Before, the callback only accepted plain records and apps needed an `as unknown as Session` cast.
