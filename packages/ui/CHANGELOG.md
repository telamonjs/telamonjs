# Changelog

## 1.0.3

### Patch Changes

- `ModernSidebar` no longer causes a hydration mismatch for users who saved the compact sidebar. The sidebar store read the preference from localStorage while being created, so the first client render differed from the server's and Radix ids shifted; it now reads it after hydration.

## 1.0.2

### Patch Changes

- `react-grid-layout` is now a dependency instead of an optional peer. The root entry reaches `DashboardGrid`, whose dynamic `import('react-grid-layout')` failed the build ("Module not found") in apps that had not installed it.

## 1.0.1

First public release of `@telamonjs/ui`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
