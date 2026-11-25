---
'@telamonjs/auth': minor
---

`createJwtAuthGuard`: a protected `validateUser(user, payload, context)` hook for
yes/no checks after `resolveUser` (user still active, account suspended, session
ended). `true` passes; `false` or a reason string is a 401 with a generic message,
the reason logged through the guard's Nest `Logger`; a thrown error propagates (a 5xx, like `resolveUser`), so an outage does not sign users out.
The new `validateUserCacheTtlMs` option caches its verdict per session token (in
memory, bounded to 1000 tokens, thrown errors never cached), so the check does not
hit the database on every request.
