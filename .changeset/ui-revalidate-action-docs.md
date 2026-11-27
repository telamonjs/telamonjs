---
'@telamonjs/ui': patch
---

The docs for `revalidatePathAction` and `AppProviders`' `revalidateAction` now say that a Server Action a client component references is callable by any visitor. They show an app-owned action that checks the session first, instead of wiring `revalidatePathAction` directly.
