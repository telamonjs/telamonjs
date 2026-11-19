# Changelog

## 1.0.2

### Patch Changes

- `react-grid-layout` is now a dependency instead of an optional peer. The root entry reaches `DashboardGrid`, whose dynamic `import('react-grid-layout')` failed the build ("Module not found") in apps that had not installed it.

## 1.0.1

First public release of `@telamonjs/ui`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
