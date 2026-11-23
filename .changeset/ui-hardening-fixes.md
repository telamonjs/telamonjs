---
'@telamonjs/ui': patch
---

Server pagination, row actions, queue polling and form-path hardening:

- `createPaginatedService`: `baseWhere`, visibility rules and search/filters are now always combined with `AND`. Before, a `baseWhere` with its own `AND` replaced the search conditions, and a visibility rule with a top-level `AND`/`OR` dropped `baseWhere`'s other keys (e.g. `deletedAt: null`), which could show hidden rows.
- `createPaginatedService`: an invalid `sortOrder` falls back to `defaultOrderDirection` instead of reaching Prisma, and the new optional `sortableFields` option ignores any `sortBy` outside the list (the default sort applies).
- Row actions in the "…" menu now honour `confirmDialog` (including a standard delete moved to the menu by `display.mode: 'dropdown'`). They used to run straight away.
- `QueueTabbedDashboard`: the real-time timeline polls only as a 30s safety net while SSE is connected and stops polling while another tab is open. The new optional `pollInterval` prop (default 2000 ms) sets the interval used while SSE is down.
- Form visibility helpers ignore field paths that go through `__proto__`, `constructor` or `prototype`.
