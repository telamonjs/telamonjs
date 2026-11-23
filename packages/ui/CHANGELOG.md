# Changelog

## 1.0.4

### Patch Changes

- 7177dfb: Server pagination, row actions, queue polling and form-path hardening:

  - `createPaginatedService`: `baseWhere`, visibility rules and search/filters are now always combined with `AND`. Before, a `baseWhere` with its own `AND` replaced the search conditions, and a visibility rule with a top-level `AND`/`OR` dropped `baseWhere`'s other keys (e.g. `deletedAt: null`), which could show hidden rows.
  - `createPaginatedService`: an invalid `sortOrder` falls back to `defaultOrderDirection` instead of reaching Prisma, and the new optional `sortableFields` option ignores any `sortBy` outside the list (the default sort applies).
  - Row actions in the "…" menu now honour `confirmDialog` (including a standard delete moved to the menu by `display.mode: 'dropdown'`). They used to run straight away.
  - `QueueTabbedDashboard`: the real-time timeline polls only as a 30s safety net while SSE is connected and stops polling while another tab is open. The new optional `pollInterval` prop (default 2000 ms) sets the interval used while SSE is down.
  - Form visibility helpers ignore field paths that go through `__proto__`, `constructor` or `prototype`.

- Updated dependencies [a599b51]
  - @telamonjs/logger@1.0.2

## 1.0.3

### Patch Changes

- `ModernSidebar` no longer causes a hydration mismatch for users who saved the compact sidebar. The sidebar store read the preference from localStorage while being created, so the first client render differed from the server's and Radix ids shifted; it now reads it after hydration.

## 1.0.2

Tagged but not published to npm: 1.0.3 includes it.

### Patch Changes

- `react-grid-layout` is now a dependency instead of an optional peer. The root entry reaches `DashboardGrid`, whose dynamic `import('react-grid-layout')` failed the build ("Module not found") in apps that had not installed it.

## 1.0.1

First public release of `@telamonjs/ui`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
