# Changelog

## 1.1.2

### Patch Changes

- Scaffolded apps start on `@telamonjs/ui` ^1.3.0.

## 1.1.1

### Patch Changes

- Scaffolded apps start on `@telamonjs/ui` ^1.2.0 and `@telamonjs/queue` ^1.2.0.

## 1.1.0

### Minor Changes

- d2a50d7: New `telamonjs link [--ui <path>] [--package <path>]` and `telamonjs unlink [--package <path>]` commands switch an app between the published `@telamonjs/ui` and a local TelamonJS checkout, so apps no longer carry their own script. `link` follows the documented recipe: an injected `file:` dependency on the checkout's `packages/ui`, plus the required `pnpm.overrides["@telamonjs/logger"]` link in the workspace root's `package.json`. `unlink` removes both and restores the range committed at `HEAD`, else `^` plus the latest published version, never the checkout's own version. The edited `package.json` is `apps/web/package.json` when it exists, else `./package.json`. Neither command runs `pnpm install`.

  Monorepo template: `@telamonjs/cli` is now a root devDependency; `telamonjs:link`/`telamonjs:unlink` and the husky hooks call the command, and `scripts/telamonjs-mode.mjs` is gone. `post-commit` relinks when `node_modules` still holds the injected checkout, and `pre-commit` also stages the root `package.json`. Both templates' `next.config.js` treat a `file:` range as link mode too.

## 1.0.3

### Patch Changes

- 941da22: Scaffolded apps now use `@telamonjs/auth` instead of hand-rolled auth on raw `@auth/core`. The NextAuth config (single app and monorepo `apps/web`) uses the `jwt` and `session` callbacks of `createAuthCallbacks()` from `@telamonjs/auth/next` directly. `authorize()` returns the session contract: `role` is a `RoleInfo` and `permissions` is an array, and `authTime`/`accessAt` are stamped at login. The monorepo API's `JwtAuthGuard` extends `createJwtAuthGuard()` from `@telamonjs/auth/nest`, and its `resolveUser` still rejects inactive or deleted users and reads the role from the database. `@Public()` now comes from the package, and the API no longer depends on `@auth/core` directly (it is a peer of `@telamonjs/auth`). Role checks read `role.code`.

  Monorepo husky hooks: `post-commit` only relinks `@telamonjs/ui` when `node_modules` still resolves to the local checkout. Before, every pnpm-installed package counted, because each one is a symlink. `pre-commit` now aborts the commit when the lockfile update fails, and shows the error.

## 1.0.2

### Patch Changes

- Monorepo template: leaving link mode (`telamonjs:unlink` and the pre-commit hook) restores the committed `@telamonjs/ui` range, or the latest published version, instead of the local checkout's version, which may not be on npm yet. The logic lives in one `scripts/telamonjs-mode.mjs` shared by the scripts and the hooks.

## 1.0.1

First public release of `@telamonjs/cli`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
