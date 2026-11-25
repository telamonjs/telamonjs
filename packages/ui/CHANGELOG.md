# Changelog

## 1.5.1

### Patch Changes

- e7e3bd1: - Paginated `ListPage` (`list.infiniteScroll: false`) now honors `list.defaultPageSize`, `list.defaultSortBy`/`defaultSortOrder` and, with `urlSync`, a link's `page`/`pageSize`/`sortBy`/`sortOrder`/`search`. The `DataTable` created the table first with the store defaults (10 rows, no sort), so the first query and the URL ignored them.
  - `ListPage` with `urlSync` follows the URL after mount: Back/Forward and a link to the same page now update page, page size, sort, search, `urlFilters` and the toolbar filters listed in them (and refetch), instead of keeping the state read at mount. Returning to the page through a link that carries the list's params applies them, where the state left by the previous visit used to overwrite the link. Params the list does not own (`useUrlFilters`, dialogs) are left alone.
- Updated dependencies [5d52681]
  - @telamonjs/data@1.0.1

## 1.5.0

### Minor Changes

- 8f1ff5a: New `useUrlFilters(defs, { omit, fixed })` hook: builds the `ListPage` "Filters" panel from filter definitions (`'options'` with a local list or a server `load`, cascades via `dependsOn`, defaults shown as chips; `'dateRange'`; `'text'`) with the URL as the single source of truth. Returns `filtersPanel`, `activeFilters`, `onClearFilters`, the stable `values` for `config.query`, and `params`. The panel is a one-column `minmax(0, 1fr)` grid, so long options no longer overflow the popover.

  The "Filters" popover now stays open while the person works in it: typing in a field, or a selector/calendar opened from it with the focus inside. A plain hover-and-leave still closes it.

## 1.4.5

### Patch Changes

- 9696a07: `@telamonjs/ui/server` and the pagination types re-export `@telamonjs/data`, the new
  dependency-free package for the server half of a list, so a Next.js app and its backend share one
  definition. Nothing to change in apps: every name and behavior stays, and `getFilterOptions` still
  labels boolean options in the library's locale (pt-BR by default).
- 4f4ca89: With infinite scroll (the default), `ListPage`'s `urlSync` keeps `page` and `pageSize` out of the
  URL and ignores them in a link: every load starts at page 1 with batches of the config's size, so
  `pageSize=20` in the URL showed 50 rows. Sort, search and filters still sync.

## 1.4.4

### Patch Changes

- 21fdf84: `ListPage` with `urlSync` opens a link in the state it carries: `page`, `pageSize`, `sortBy`/
  `sortOrder` and `search` from the URL win over the config defaults on mount. Before, they were
  only written, so a shared or reloaded link fell back to the defaults. Invalid values are ignored.

## 1.4.3

### Patch Changes

- 899da7a: `ListPage` with `urlSync` keeps `pageSize` and the sort in the URL when a deep link already
  carries them: 1.4.1 skipped the second write of the mount (back to the URL being opened) while
  the first one, with the store's defaults, was still in flight, so the URL ended on the defaults.
  `useUrlSync` now compares a write against its own pending navigation.

## 1.4.2

### Patch Changes

- 548bb65: Exports drop a known extension (`.csv`, `.xls`, `.xlsx`, `.pdf`) from `exportFilename` before
  adding the date and the format's own extension: `'report.csv'` exported as Excel used to save
  `report.csv_<date>.xlsx`.

## 1.4.1

### Patch Changes

- `ListPage` with `urlSync` no longer loops on `router.replace` when `urlFilters` is passed inline
  (or omitted): the URL sync effect keys the toolbar filters by content, and `useUrlSync` skips a
  navigation that would not change the query.

## 1.4.0

### Minor Changes

- f87e9ae: Sort by data paths: opt-in `list.sortParam` and server helpers that read both wire forms.

  **Client.** `list.sortParam: 'path'` makes `ListPage` send a column's `accessorKey` with its dots
  (`customer.name`, `_count.items`) as `sortBy`, instead of TanStack's column id (`customer_name`,
  `_count_items`). Columns without an `accessorKey` keep sending their `id`. It applies to `queryFn`,
  `exportAll`, `list.onExport`, `toolbarContent` and the `urlSync` URL. The default stays `'id'`, so
  nothing changes on the wire until a list opts in; `'path'` becomes the default in the next major.
  Stored sorts accept both forms in both modes: `defaultSortBy: 'customer.name'` and saved views now
  highlight the right header (before, a dotted stored field showed no arrow and a header click added
  a second sort entry).

  **Backend contract.** `'id'`: `sortBy` is the column id, a dotted `accessorKey` with `.` → `_`.
  `'path'`: `sortBy` is the data path; order `_count.<relation>` with `{ <relation>: { _count: dir } }`.
  Before opting in, make sure the endpoint accepts the dotted form: a whitelist keyed by
  `customer_name` falls back to its default order for `customer.name` — add the dotted key alongside.

  **Server helpers.** `buildPrismaOrderBy` / `buildPrismaOrderByMulti` take an optional
  `sortableFields` and read both forms: a value with a dot is used as-is (underscores kept, e.g.
  `order_item.created_at`); `_count.x` / `_count_x` produce Prisma's relation-count order; a listed
  value is used as-is (`created_at` stays a column); other underscored values are decoded as legacy
  ids (`customer_name` → `customer.name`) — with `sortableFields`, only when the decoded path is listed.
  `createPaginatedService` passes its `sortableFields` through, and `sortableFields` now accepts a
  legacy id whose dotted form is listed (a dotted entry was rejected before, contrary to its docs).

  Behaviour changes for helper callers: `_count`/leading-underscore fields now build valid Prisma
  (they produced an empty key before); a value mixing dots and underscores is no longer re-split on
  its underscores; a `sortableFields` entry in `_` form (`customer_name`) is now taken as a scalar —
  list the dotted path (`customer.name`) instead.

- f32a4c4: Row actions `display.mode: 'auto'` now does what it promised: every action goes into the "⋯" menu on mobile (below 768px, the `useIsMobile` breakpoint) and stays inline (with `maxInline`) elsewhere. It used to behave exactly like `'inline'`.
- 4ea79f7: Export peers are lazy and optional.

  - `papaparse` is no longer a peer: `exportToCSV` writes RFC 4180 CSV itself (UTF-8 BOM, CRLF, same quoting). Columns that share a header no longer collapse into one.
  - `jspdf` and `jspdf-autotable` are now **optional** peers (`peerDependenciesMeta`), loaded with `import()` only when a PDF is exported. Without them the app still builds, and the PDF export fails with a localized toast naming the packages to install (new message `data.exportMissingPeer`) instead of a module-not-found error. `exportToPDF` returns a `Promise<void>` (it returned `void`) and rejects with an error naming both packages.
  - `scripts/check-lazy-deps.mjs` now fails the build if any file in `dist/` statically imports an optional peer.

  **Apps:** nothing to change; PDF export keeps working where `jspdf` + `jspdf-autotable` are installed. Apps that never export PDF can drop them, and every app can drop `papaparse` and `@types/papaparse` unless it uses them directly. New apps from `create-telamonjs-app` keep the `jspdf` pair and no longer list `papaparse`.

- 21eef48: Excel export no longer depends on SheetJS: the `xlsx` peer is gone. npm only carries `xlsx` 0.18.5, flagged by CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS), and the fixed builds are published outside the registry. `exportToExcel` now writes the workbook itself (OOXML parts, zipped with the platform `CompressionStream`), with no dependency at all.

  - Same output: columns, headers, cell values, filename, sheet name and 10–50 character column widths. The header row is now really bold on a light gray fill (SheetJS community silently ignored that styling).
  - Sheet names follow Excel's rules instead of throwing: at most 31 characters, `\ / ? * [ ] :` become spaces.
  - `exportToExcel` and `exportTableData` return a `Promise<void>` that resolves once the download starts (they returned `void`); await it to catch failures.

  **Apps:** nothing to change. `xlsx` can be removed from the app's dependencies (`pnpm remove xlsx`) unless the app uses it directly. New apps from `create-telamonjs-app` no longer list it.

### Patch Changes

- b6dcc0b: `ChartTooltipContent` and `ChartLegendContent` type their `payload` (and the tooltip's `active`
  and `label`) with recharts' own `TooltipContentProps` and `LegendPayload` instead of a hand-written
  copy, so the payload recharts hands to `content` type-checks as-is and future recharts minors no
  longer break the build. `formatter` now receives recharts' documented fifth argument, the whole
  tooltip payload, instead of the hovered data row (still available as `item.payload`).
- 5abed37: Raise the minimum versions of runtime dependencies to the current minors (no peer range changes).

  - `@telamonjs/ui`: `recharts` `~3.3.0` → `~3.11.0`; the `@radix-ui/react-*` primitives,
    `@tiptap/*` `^3.35.0`, `react-aria` `^3.53.1`, `react-stately` `^3.51.0`, `zustand` `^5.1.0`,
    `date-fns` `^4.4.0`, `dompurify` `^3.4.18`, `react-grid-layout` `^2.3.0`, `react-is` `^19.3.1`,
    `@tanstack/react-virtual` `^3.14.26`, `@uiw/react-textarea-code-editor` `^3.1.3` and
    `@vis.gl/react-google-maps` `^1.10.2`.
  - `@telamonjs/cli`: `fs-extra` `^11.4.1`. Apps created by `create-telamonjs-app` pin the same
    updated versions (`@radix-ui/*`, `@auth/prisma-adapter`, `date-fns`, `zustand`, `postcss`,
    `autoprefixer`, `prettier`, `prettier-plugin-tailwindcss`, `tsx` and friends).

- 9600019: `DispatchJobModal` sends an `array` schema field as an array: the input (whose placeholder asks
  for `["id1", "id2"]`) is parsed as JSON instead of being dispatched as the raw string, and a value
  that is not a JSON array is refused with the "invalid JSON" toast. Each field label is now
  associated with its input.
- 913a234: `useFormStore().setFormData()` (which `useForm(formId, initialData)` and `ZustandForm` call to load
  the record) no longer marks the form dirty. Loading data is the baseline, like react-hook-form's
  `reset()`: `isDirty` / `useForms().anyDirty` now turn `true` only after a field is edited
  (`updateField`), so they can drive an unsaved-changes guard. Before, every form was dirty as soon as
  it opened.
- 7a768f5: `ZustandForm` / `useForm().validate()` accept `0` in a required field (it was reported as
  missing) and reject an empty array (an empty required multiselect passed). `useForms().validateAll()`
  now validates every form instead of stopping at the first invalid one, so later wizard steps get
  their errors too.
- 4cbf64c: Queue dashboard real-time timeline (`QueueDashboard`): job rows are now buttons (Tab, Enter/Space
  open the details, visible focus ring) inside a list, and the row actions work: retry calls the
  adapter's `retryJob` (failed jobs only; hidden for `manualRetry: false` queues), remove calls
  `removeJob` after an inline confirmation (not offered for active jobs), both with the same toasts
  as the jobs list, and both hidden under `readOnly`. The actions also appear on keyboard focus, not
  only on hover. The hardcoded `#REPEAT` tag is gone; a "Recurring" badge marks only job scheduler /
  repeatable iterations. The timeline details (and its expanded view) and `DispatchJobModal` close
  on Escape and are announced as modal dialogs.
- Updated dependencies [2d019f6]
- Updated dependencies [ac040f3]
- Updated dependencies [06e660f]
  - @telamonjs/logger@1.1.0

## 1.3.1

### Patch Changes

- 25f34e0: `ConfirmActionDialog` (and `confirmDialog.inputs` on row actions) focuses the first input on open,
  so a reason can be typed right away. Without inputs, focus still starts on Cancel.

## 1.3.0

### Minor Changes

- 5a8b1b6: `ConfirmActionDialog` and `confirmDialog.inputs`: length, date and native field options, and an opt-in "disabled until valid" mode.

  - `ConfirmDialogInput` gains `minLength`/`maxLength` (on the trimmed value; `minLength` checks an optional field only once it is filled), `min`/`max` for `date` (set on the native input and validated), `options` as `{ value, label }` (new `ConfirmDialogOption`; plain strings still work), `placeholder`, `description` (help text announced with the field), `rows` for `textarea`, `suggestions` for `text` (a native `<datalist>`) and the native `inputMode`/`autoComplete`.
  - A `minLength`/`maxLength` input shows how many characters are missing or over as the user types, before any confirm attempt (new `validation.charactersMissing`/`charactersOver` messages in pt-BR, en and es).
  - New `disableUntilValid` (on `ConfirmActionDialog` and on `ConfirmDialogConfig`): the confirm stays disabled while any input fails, and every failing field shows its message live — muted until edited, as an error once edited or after an attempt — so the reason is always visible. Without it, nothing changes: the confirm stays enabled and messages show from the first attempt, as in 1.2.

- 0429b6c: `CrudConfig.permissions` no longer fails open silently.

  - In development, `ListPage` warns once per config when `permissions` declares operations but there is no way to check them (neither `permissions.can`, `actionsConfig.can` nor `actionsConfig.userPermissions`), which means every write button shows. Production behaviour is unchanged.
  - New opt-in `permissions.failClosed` (same name and meaning as in `@telamonjs/permissions`): with no checker, every declared operation and every action `permission` is denied instead of allowed — useful while the session that feeds `can` is still loading. Default `false`.
  - `applyCrudPermissions` now checks against the `actionsConfig` the list actually uses (it read `config.actionsConfig` for the dialogs only).

- 6349bde: `ListPage` export can cover every matching row, or hand the export to the app. The default is unchanged: "All" exports the rows already loaded.

  - `list.exportAll: true | { pageSize?, maxRows? }`: "All" fetches every row matching the current search, filters and sort through `query.queryFn`, page by page and sequentially, honoring `totalPages`. A progress toast offers Cancel. Rows are capped at `maxRows` (default 10 000), with a warning when the file holds fewer rows than the server total. Requests use `exportAll.pageSize`, else `defaultPageSize` (50).
  - `list.onExport(state: ListQueryState, format)`: an app-side export (e.g. a server-generated file). The menu lists the formats only and calls it with the same query `toolbarContent` receives. It wins over `exportAll`, shows the menu without `enableExport`, and errors show the export error toast.
  - `list.exportFormats` picks the formats offered.
  - `ExportMenu` gains `loadAll` (+ `allCount`) and `onServerExport`, and `DataTable` gains `exportMenuProps` to pass them through. New public `fetchAllPages()` helper and `ExportFormat`, `ExportLoadAllContext`, `ExportAllOptions`, `FetchAllPagesOptions`, `DataTableExportMenuProps` types.

  Fix: the paginated `ListPage` (`infiniteScroll: false`) no longer exports through a raw `Object.values` CSV without headers. It uses the same Excel/CSV/PDF menu as the infinite list, with the list's columns and filename, now also available below `lg` through a compact trigger.

- df92415: New public `QueryErrorState`: the error state for screens that run their own `useQuery`, so apps stop keeping a local `QueryErrorAlert`.

  - `error` (an `Error`, a string or any object with a string `message`) becomes the description; `title` and `description` take `I18nText`, with a localized "Failed to load data" default.
  - `onRetry` shows a "Try again" button, called with no arguments (`onRetry={refetch}` is safe), pending (disabled, spinner, `aria-busy`) while the promise it returns runs; `retrying` drives the same state from the caller. The button is `type="button"`.
  - It is now the single implementation behind the CRUD view/edit dialogs' load error, which gain a working "Try again" (they had none). The internal `DialogErrorState` is gone, and so is the never-set error branch of `CreateDialog`.

  Migrating a local `QueryErrorAlert({ message, onRetry })`: `message` → `title` (or `description`), `onRetry={() => refetch()}` → `onRetry={refetch}`, and add `className='mb-4'` where the layout relied on the local copy's margin.

## 1.2.1

### Patch Changes

- 790823c: Queue Real-time timeline: rows no longer overlap when a job label is long (for example a contract
  `description` used as the display name). The label truncates with a tooltip, the duration keeps its
  width, and the virtualized rows are measured instead of pinned to a fixed height.

## 1.2.0

### Minor Changes

- 575bf56: `ConfirmActionDialog` covers what apps kept local copies for. All additions are optional; `children` is still the trigger.

  - `body`: free content between the description and the buttons.
  - `confirmDisabled`: disables only the confirm button, from the caller's state.
  - `pending` + `pendingText`: caller-controlled pending. Passing `pending` (even `false`) means confirming never closes the dialog; the caller closes it when its mutation settles. While `true`, both buttons are disabled, the confirm shows a spinner and `pendingText`, and the dialog cannot be dismissed. Without `pending` the dialog keeps awaiting `onConfirm` and closing on success; `pendingText` labels that pending state too.
  - `title` / `description` accept JSX as well as text or `msg()`.
  - `ConfirmDialogInput` (also used by `confirmDialog.inputs` on row and menu actions) gains `type: 'date'` (native input, `YYYY-MM-DD`) and `validate(value, values) => I18nText | undefined`, shown as the field error and blocking the confirm.

  Migrating a local `ConfirmActionDialog` / `ConfirmFormDialog` copy (open/onOpenChange, pending, JSX title):

  | Local prop                                                                                                                         | Public prop                                          |
  | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
  | `open`, `onOpenChange`, `title`, `description`, `confirmText`, `pendingText`, `pending`, `variant`, `confirmDisabled`, `onConfirm` | same name, same meaning                              |
  | `children` (content between description and buttons)                                                                               | `body`                                               |
  | hard-coded "Confirmar" / "Cancelar"                                                                                                | localized defaults (or `confirmText` / `cancelText`) |

  Behaviour differences: with `pending` set, ESC and the overlay no longer dismiss the dialog while pending (the local copies only disabled Cancel), and a promise rejected by `onConfirm` is shown inside the dialog.

- 3276e93: `JobDetailPage` takes `moduleLabels` and `jobLabel`, like `QueueTabbedDashboard`. Its title and module badge now resolve through the dashboard's label precedence (`jobLabel` > contract `displayName` > formatted name), and the contract's `description` shows below the title. The page's enable switch also gets an accessible name.

### Patch Changes

- b44aa68: Four fixes reported by consumer apps:

  - `BarChart` rounds the bar's end in `layout='vertical'` (horizontal bars): `[0, 4, 4, 0]` instead of the top corners.
  - `ListPage`'s empty state no longer says "Start by adding a new item" when the "New" button is hidden (no `form`, no `dialogs.create`, or `permissions.create` denied). It shows the neutral `list.emptyDescriptionNoCreate` message instead; an explicit `list.emptyDescription` still wins and the search/filter "no results" copy is unchanged.
  - The `next-auth` peer is widened from exactly `5.0.0-beta.31` to `^5.0.0-beta.20`, the first v5 beta that accepts Next 15 and React 19 and already has every `next-auth/react` API the package uses.
  - `AdminForm` now spaces its sections in the non-flush layout without tabs (a `display: contents` wrapper kept the form's `space-y-6` from reaching them).

- 48df933: ListPage: closing a deep-linked dialog (`?view=<id>`) no longer reopens it when the
  set of dialog URL params changes during the close — e.g. `permissions` enabling
  `edit`/`create` as the session arrives. The first Escape now always closes the dialog
  and clears the param. The URL ↔ dialog sync compares what the URL asks for, not the
  spelling of the configured params.
- 1a6d140: Queue dashboard polish. The Real-time queue tables fit their panel: they no longer force a 704px minimum width (horizontal scroll, "Actions" cut off, job name hidden next to the "Late" badge); the job name truncates with a tooltip, status badges wrap below it and the action buttons wrap inside their column. Toasts and the Run Job dialog name the job through `jobLabel` instead of the raw id (enable/disable, settings saved, queue actions, dispatch). pt-BR: missing accents in the Run Job dialog messages.
- 339b47f: Clicking inside a row action's confirm dialog (its title, an `inputs` field) no longer opens the row's view dialog behind it, which left the confirm buttons unclickable. React bubbles clicks from portaled content (dialogs, the "..." menu, popovers) through the component tree, so they reached the row's click handler. `InfiniteList`, `DataTable` (table rows), `VirtualDataTable` and `MobileCard` now only treat clicks inside the row's own DOM as row clicks, and ignore links and form fields as well as buttons and checkboxes. `VirtualDataTable` rows previously reacted to every click, buttons included.

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
