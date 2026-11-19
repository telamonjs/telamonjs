# Changelog

## 1.0.2

### Patch Changes

- Monorepo template: leaving link mode (`telamonjs:unlink` and the pre-commit hook) restores the committed `@telamonjs/ui` range, or the latest published version, instead of the local checkout's version, which may not be on npm yet. The logic lives in one `scripts/telamonjs-mode.mjs` shared by the scripts and the hooks.

## 1.0.1

First public release of `@telamonjs/cli`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
