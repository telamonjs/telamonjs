---
'@telamonjs/auth': patch
---

`createJwtAuthGuard()` now logs a one-time warning (Nest `Logger`) the first time it accepts an impersonation token without an `isImpersonationActive` hook: without that hook, ending an impersonation cannot revoke its token before it expires. Pass `isImpersonationActive` to make impersonation revocable and silence the warning.
