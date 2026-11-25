---
'@telamonjs/ui': minor
---

New `useUrlFilters(defs, { omit, fixed })` hook: builds the `ListPage` "Filters" panel from filter definitions (`'options'` with a local list or a server `load`, cascades via `dependsOn`, defaults shown as chips; `'dateRange'`; `'text'`) with the URL as the single source of truth. Returns `filtersPanel`, `activeFilters`, `onClearFilters`, the stable `values` for `config.query`, and `params`. The panel is a one-column `minmax(0, 1fr)` grid, so long options no longer overflow the popover.

The "Filters" popover now stays open while the person works in it: typing in a field, or a selector/calendar opened from it with the focus inside. A plain hover-and-leave still closes it.
