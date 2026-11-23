---
'@telamonjs/cli': patch
---

Scaffolded apps now use `@telamonjs/auth` instead of hand-rolled auth on raw `@auth/core`. The NextAuth config (single app and monorepo `apps/web`) uses the `jwt` and `session` callbacks of `createAuthCallbacks()` from `@telamonjs/auth/next` directly. `authorize()` returns the session contract: `role` is a `RoleInfo` and `permissions` is an array, and `authTime`/`accessAt` are stamped at login. The monorepo API's `JwtAuthGuard` extends `createJwtAuthGuard()` from `@telamonjs/auth/nest`, and its `resolveUser` still rejects inactive or deleted users and reads the role from the database. `@Public()` now comes from the package, and the API no longer depends on `@auth/core` directly (it is a peer of `@telamonjs/auth`). Role checks read `role.code`.

Monorepo husky hooks: `post-commit` only relinks `@telamonjs/ui` when `node_modules` still resolves to the local checkout. Before, every pnpm-installed package counted, because each one is a symlink. `pre-commit` now aborts the commit when the lockfile update fails, and shows the error.
