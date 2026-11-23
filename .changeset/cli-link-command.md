---
'@telamonjs/cli': minor
---

New `telamonjs link [--ui <path>] [--package <path>]` and `telamonjs unlink [--package <path>]` commands switch an app between the published `@telamonjs/ui` and a local TelamonJS checkout, so apps no longer carry their own script. `link` follows the documented recipe: an injected `file:` dependency on the checkout's `packages/ui`, plus the required `pnpm.overrides["@telamonjs/logger"]` link in the workspace root's `package.json`. `unlink` removes both and restores the range committed at `HEAD`, else `^` plus the latest published version, never the checkout's own version. The edited `package.json` is `apps/web/package.json` when it exists, else `./package.json`. Neither command runs `pnpm install`.

Monorepo template: `@telamonjs/cli` is now a root devDependency; `telamonjs:link`/`telamonjs:unlink` and the husky hooks call the command, and `scripts/telamonjs-mode.mjs` is gone. `post-commit` relinks when `node_modules` still holds the injected checkout, and `pre-commit` also stages the root `package.json`. Both templates' `next.config.js` treat a `file:` range as link mode too.
