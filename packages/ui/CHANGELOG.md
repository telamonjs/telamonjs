# Changelog

## 1.1.0

### Minor Changes

- c3537bb: New public `ConfirmActionDialog`: the confirmation behind `confirmDialog` on row and menu actions, now exported for any button. It stays open while `onConfirm` is pending (spinner, disabled buttons, no dismiss), closes when it resolves, and stays open showing the error when it rejects (resolve `false` to stay open without a message). It also renders optional `inputs`.

  `confirmDialog.inputs` (`ConfirmDialogInput`: `text`, `textarea`, `select`) were typed but never rendered; they now render, required ones block the confirm while empty, and their values reach the action as a second argument — `handler(row, { inputs })` / `onClick(row, { inputs })` (`ActionContext`), passed only when inputs are declared so existing handlers keep receiving the row alone. `ConfirmDialogInput.label` accepts `I18nText`. A row action whose confirmed run fails keeps its error toast and now leaves the dialog open for a retry instead of closing it.

- 500114c: `CrudConfig` gains an optional `permissions` model (`CrudPermissions`): `create`, `edit`, `delete` and `view` name the permission each operation needs, checked with `can` (e.g. `perm => checker.can(user, perm)` from `@telamonjs/permissions`, so bypass roles and wildcards work) or, without it, against `actionsConfig.userPermissions`. It gates the "New" button and the create dialog, the row view/edit/delete (including the edit/view actions `ListPage` injects for `dialogs.edit`/`dialogs.view`), the view dialog footer, the edit dialog, the `?create`/`?edit`/`?view` deep links and `dialogs.view.portal.onSaveSection` (also in `CrudViewDialog`). `DataTableActionsConfig` gains `can`, which decides every action `permission` instead of the exact lookup in `userPermissions`.

  `CrudConfig.form` and `FormConfig.validation` are now optional. A read-only list drops `form` (no more `validation: undefined as any`): `ListPage` then offers no "New" button and no create or edit dialog. Configs without `permissions` and with a `form` behave exactly as before.

- a936899: Queue dashboard: module and job labels (#7).

  - `QueueTabbedDashboard` takes `moduleLabels` (module key → `I18nText`), used as the group titles in the Real-time and Configuration tabs. Its key order is the group order.
  - Job labels prefer the job contract's `displayName` over the formatted job name, in queue rows, timeline and history rows, job details and modal titles. A new `jobLabel` prop overrides both.
  - `moduleIcons` also accepts React nodes and icon components (e.g. Lucide icons), not only emoji strings.
  - Both tabs now order module groups the same way (`moduleLabels` order, then alphabetically). The queues table has fixed column widths, so columns line up across groups.
  - The "Disabled"/"Inactive" job badges are neutral instead of the blue `secondary` variant.

- c5bf250: `ListPage`'s `toolbarContent` also accepts a function that receives the list's current query (`ListQueryState`: `search`, `filters`, `sorting` and the `params` the list passes to `query.queryFn`), so an app's own export/PDF button can fetch exactly what the list shows. The plain `ReactNode` form keeps working.
- dd1a1a4: Toolbar filters (`list.toolbar.filters`) gain `allValue`, the explicit "no filter" value: it is dropped from the query, shown when nothing is selected and targeted by resets (chips, toggling a button off). With it, the first option is an ordinary option (rendered as a button), `'todos'`/`'all'` are ordinary values, and `defaultValue` applies even when it equals the first option. `TabToolbar.FilterButtons` accepts the same `allValue`. Filters without `allValue` keep the previous rules.
- bcb74d5: Close small component gaps found in consumer workarounds:

  - `masked` fields: `maskType` gains the `'cpf'`, `'cnpj'` and `'cep'` presets next to `'tel'` and is typed as that union (any other string still falls back to `mask`).
  - `textarea` fields: optional `rows` (default 4).
  - `StatCard`: truncated label, subtitle and `tinted` value carry their full text in a `title` tooltip.
  - `BarChart`: `allowDecimals` for the value axis and `categoryAxisWidth` for the category axis in `vertical` layout.
  - `CalendarWithEvents`: `onMonthChange(month)` fires with the first day of the month the user navigates to.
  - `ReportTable`: `showFooter` (default `true`) hides the "Showing X of Y records" line.
  - Form grids (`AdminForm`, `BaseForm`, `ZustandForm`, `WizardForm`) collapse to one column below `sm`, and every `grid`/`span` value now ships as a static class (`col-span-3`/`col-span-4` were never generated). Desktop layout is unchanged.
  - `useCrudMutations`: the mutation resolves after the invalidated list's first refetch attempt, so dialogs close over a fresh list; a failing refetch still settles on its first failure instead of waiting for retries.
  - Dialog header `badge.getLabel` may return an `I18nText` (a `msg()` is resolved), like `badge.labels`.

### Patch Changes

- a461d05: The view dialog footer now follows the row actions: **Edit** is hidden when `standard.edit` is `false`, and both **Edit** and **Delete** honor the action's `permission` (against `userPermissions`) and its `visible`/`enabled` for the record — evaluated against the list row, or the fetched record on a deep link. Before, the footer offered Edit whenever `dialogs.edit` existed and Delete whenever `standard.delete` was set, so users who could not edit or delete a row from the table still got the buttons in the dialog. `ViewDialog` gains the optional `canEdit`/`canDelete` gates (also accepted by `CrudViewDialog`'s `footer`).

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
