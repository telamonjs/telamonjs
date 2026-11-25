---
'@telamonjs/ui': minor
'@telamonjs/cli': patch
---

`SignInForm` and `ForgotPasswordForm`: localized credentials sign-in over next-auth (zod validation, password visibility toggle, pending state, next-auth error mapping with per-code overrides, same-origin `?callbackUrl` only, `onSubmit`/`onSuccess` overrides) and a forgot-password form that never reveals whether an account exists. The CLI app template's sign-in page now uses `SignInForm` instead of its own copy.
