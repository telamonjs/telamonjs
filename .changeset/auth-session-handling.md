---
"@telamonjs/auth": patch
---

Stricter session and API-key handling:

- API-key guards treat any falsy verifier result (`false`, `0`, `''`, `NaN`) as a rejection, like `null`.
- An explicit `maxAge` passed to `decodeSessionToken`, `createJwtAuthGuard` or `createAuthCallbacks({ tokenConfig })` is now enforced against the token's issue time. Without one, only the token's own expiry applies, as before.
- `createJwtAuthGuard` reads the `__Secure-authjs.session-token` cookie first and, while it is present, never falls back to the plain one. APIs served only over HTTPS can pass `cookieNames: ['__Secure-authjs.session-token']`.
- `createAuthCallbacks` applies an impersonation cookie only to the session that started the impersonation, and only for tokens issued by `createImpersonationToken`. Ending an impersonation also restores the actor's `accessAt`.
