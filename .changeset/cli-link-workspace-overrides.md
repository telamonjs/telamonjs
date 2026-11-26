---
'@telamonjs/cli': patch
---

`telamonjs link` adds an override for every package the checkout's `@telamonjs/ui` declares as `workspace:^`, now `@telamonjs/data` as well as `@telamonjs/logger`. Before, `pnpm install` failed with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` against a checkout of ui 1.10.0 or later. `telamonjs unlink` removes them all.
