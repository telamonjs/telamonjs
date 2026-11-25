# Changelog

## ui 1.10.1 (2026-11-25)

`@telamonjs/ui`:
- Fix: the desktop "Filter..." field of `SubList` (the list inside a `crud` field) did not filter, and
  its pagination and column toggles did not update. The pieces were memoized on the TanStack table
  instance, which never changes identity.

## ui 1.10.0 (2026-11-25)

`@telamonjs/ui`:
- New `@telamonjs/ui/menu` entry point: `filterMenuByPermission` and the menu types, with no React or
  Next.js import, for menu configs in plain modules and their unit tests.
- `useCrudMutations` takes a `CrudConfig<T, TFormData, TResult>` directly, like `ListPage`.

## ui 1.9.0, auth 1.3.0, queue 1.4.1, cli 1.1.7 (2026-11-25)

`@telamonjs/queue` 1.4.1:
- Fix: 1.4.0 broke test runners that transpile the package to CommonJS (Jest + ts-jest in Nest apps)
  with "Cannot use 'import.meta' outside a module". `prom-client` is a static import again.

`@telamonjs/ui`:
- `arrayQueryFn(fetchAll, { searchFields, filterFields })` turns an endpoint that answers a plain array
  into a `queryFn`. It filters, searches (case- and accent-insensitive), sorts and pages in memory.
- `<PermissionsProvider can={...}>` gives the permission checker once. Every `ListPage` below it uses
  it for `permissions` and action `permission`, and `AdminShell` uses it for the menu. The config's own
  checker still wins.
- `permissions.export` gates the export menu.

`@telamonjs/auth`:
- `createJwtAuthGuard` has a protected `validateUser(user, payload, context)` hook for yes/no checks
  after `resolveUser`, such as user still active or session ended. `false` or a reason is a generic
  401, and the reason is logged. A thrown error propagates (5xx). The verdict can be cached per session
  token with `validateUserCacheTtlMs`.

`@telamonjs/cli`:
- The generated `AGENTS.md` points plain-array endpoints to `arrayQueryFn`, and the templates pin the
  latest packages.

## ui 1.8.0, cli 1.1.6 (2026-11-25)

`@telamonjs/ui`:
- `queryFn` takes `ListQueryParams` (new exported type). This is what `ListPage` actually passes: one
  `sortBy` column as a string, filters under `filters`. An API client typed `sortBy?: string` fits
  directly (`queryFn: api.list`), with no `asQueryFn`. `ListQueryState.params` (given to
  `toolbarContent` and `onExport`) now carries the same string `sortBy` instead of an array.
- `CrudConfig` takes a third generic, `TResult`, for what create and update resolve in `data`, for
  example `CrudConfig<Row, Form, { id: string }>` for actions that return only the id. It defaults to
  the entity, so typed `onSuccess` callbacks are unchanged.
- Upgrading: code that calls `queryFn` itself and typed its parameter `PaginationParams` (for example a
  `withExternalFilters` helper) types it `ListQueryParams` instead.

`@telamonjs/cli`:
- The generated `AGENTS.md` documents `ListQueryParams` and `TResult`.

## ui 1.7.0, cli 1.1.5 (2026-11-25)

`@telamonjs/ui`:
- `ListPage` gets a `header` slot for bars, alerts or status panels above the toolbar. In the embedded
  and infinite-scroll layouts it keeps its own height, the table fills the rest and the footer stays
  at the bottom. No wrapper is needed.
- `CrudConfig` accepts shapes apps cast with `as any` today:
  - `getForEdit` may resolve the entity itself;
  - a create dialog's `defaultValues` may carry form-only keys;
  - `headerConfig.iconColor` and `gradient` may be functions of the record (they were ignored before
    and now work);
  - a `crud` field's `listFields` takes sub-list columns (`{ header, accessorFn }`).

`@telamonjs/cli`:
- The generated `AGENTS.md` points `queryFn` adapters to `asQueryFn`.

## ui 1.6.0, queue 1.4.0, cli 1.1.4 (2026-11-25)

`@telamonjs/ui`:
- Menu items take `permission` (any of the listed permissions grants), and `AdminShell` takes `can`.
  With it, the sidebar and the command palette show only what the user may open. The breadcrumb
  still labels routes from the full menu. `filterMenuByPermission(menu, can)` is exported for custom
  shells.
- `framer-motion` and `@prisma/client` are no longer peer dependencies. `DashboardFullscreen` fades in
  with CSS.

`@telamonjs/queue`:
- New `@telamonjs/queue/metrics` entry point for `QueueMetrics` and `OptimizedQueueMetrics`. The root
  re-export still works but is deprecated.
- Importing the root, `./monitoring` or `./metrics` no longer loads `prom-client`. It loads when a
  metrics collector is constructed.

`@telamonjs/cli`:
- Generated apps no longer install `framer-motion`, and the templates pin the latest packages.

## data 1.0.1, queue 1.3.3, permissions 1.1.1, auth 1.2.1, ui 1.5.1 (2026-11-25)

Security and correctness fixes. No API changes.

`@telamonjs/data`:
- `createCachedPaginatedService` with `visibility` keys the cache per user. Before, one user could be
  served another user's cached page and filter options.
- `?page=abc` and other non-finite paging values fall back to page 1 and the default page size instead
  of reaching Prisma as `NaN`.
- `buildIncludeClause` no longer mutates the shared `config.include`. Filter options are counted with
  `groupBy` in the database instead of loading every row.

`@telamonjs/queue`:
- `createDashboardRouter` enforces `auth`. `auth.enabled` without a username and password throws at
  startup instead of serving the board unprotected.
- `startDashboard` no longer installs a SIGTERM handler that exited the process. It returns the app with
  the HTTP `server` attached, so the app can close it from its own shutdown.
- The HTTP routes reject an invalid `limit`, `offset`, `state` and invalid config bodies with 400, and an
  unknown job with 404, instead of loading a whole set or answering 500.
- `isValidCronPattern` uses BullMQ's own cron parser, so it accepts names such as `MON-FRI`.
- An empty `readPermission`/`writePermission` list throws at boot.

`@telamonjs/permissions`:
- An empty permission list denies: `canAll(user, [])`, `canAny(user, [])` and a guard that sees `[]`.
  `@Permissions()` with no clause throws when it is applied.

`@telamonjs/auth`:
- The Nest guard warns once when it accepts an impersonation token without `isImpersonationActive`,
  because such a token can't be revoked before it expires.

`@telamonjs/ui`:
- A paginated `ListPage` (`infiniteScroll: false`) honors `defaultPageSize`, `defaultSortBy` and the
  `urlSync` link. Before, it started at 10 rows with no sort.
- With `urlSync`, Back/Forward and links to the same page update the list instead of keeping the
  previous page, sort and search.

## ui 1.5.0 (2026-11-25)

`@telamonjs/ui`:
- New `useUrlFilters(defs, { omit, fixed })` hook: builds the `ListPage` "Filters" panel from filter
  definitions (`'options'` with a local list or a server `load` and `dependsOn` cascades, `'dateRange'`,
  `'text'`), with the URL as the single source of truth. Returns `filtersPanel`, `activeFilters`,
  `onClearFilters`, the stable `values` for `config.query`, and `params`.
- The "Filters" popover stays open while the person works in it (typing in a field, or a selector or
  calendar opened from it). Hovering in and out still closes it.

## queue 1.3.2 (2026-11-25)

`@telamonjs/queue`:
- `FlowProducer.add()` validates every node's merged options, like `add()` and `addBulk()`.
  Invalid options throw `InvalidJobOptionsError` before any job of the flow is added.

## ui 1.4.5 (2026-11-25)

`@telamonjs/ui`:
- `@telamonjs/ui/server` and the pagination types now re-export `@telamonjs/data`. Names and
  behavior are unchanged.
- With infinite scroll, `urlSync` keeps `page` and `pageSize` out of the URL. A link with
  `pageSize=20` used to keep 20 in the URL while the list loaded 50.

## data 1.0.0

New package `@telamonjs/data`: the server half of a list, with no dependencies. It has the
`ListPage` wire contract, the sort and paging sanitizers (`resolveSort` reads both sort wire
formats), and a Prisma adapter at `@telamonjs/data/prisma` (`orderBy`, scope-safe `where`,
`createPaginationContext`). NestJS and plain Node APIs can use it without installing React.

## ui 1.4.4 (2026-11-24)

`@telamonjs/ui`: a `ListPage` with `urlSync` opens a link in the state it carries. `page`,
`pageSize`, the sort and `search` in the URL now win over the config defaults; before, they were
only written, so a reloaded or shared link fell back to the defaults.

## ui 1.4.3 (2026-11-24)

`@telamonjs/ui`: a `ListPage` with `urlSync` opened from a link that already carries `pageSize`
and the sort keeps them in the URL. 1.4.1 rewrote them to the defaults.

## ui 1.4.2 (2026-11-24)

`@telamonjs/ui`: exports drop a known extension (`.csv`, `.xls`, `.xlsx`, `.pdf`) from
`exportFilename`, so `'report.csv'` exported as Excel saves `report_<date>.xlsx`.

## ui 1.4.1 (2026-11-24)

`@telamonjs/ui`: a `ListPage` with `urlSync` no longer calls `router.replace` in a loop when
`urlFilters` is passed inline or omitted. `useUrlSync` also skips any navigation that would not
change the query.

## queue 1.3.1 (2026-11-24)

`@telamonjs/queue`: `GetActorFn` accepts a callback typed with the app's own Express 4 or 5
`Request`, through the new minimal `ActorRequest` type.

## ui 1.4.0 (2026-11-24)

Dependency refresh, lighter export peers, an opt-in sort wire format and the fixes the new tests
found; each package's `CHANGELOG.md` has the details.

- `@telamonjs/ui` 1.4.0:
  - **Exports:**
    - Excel is written in-house: the `xlsx` peer and its CVEs are gone, and the header row is
      really bold.
    - CSV no longer needs `papaparse`.
    - `jspdf`/`jspdf-autotable` are optional peers loaded only for PDF; a missing peer shows a
      localized message instead of breaking the build (webpack and Turbopack).
    - `exportToExcel`/`exportToPDF`/`exportTableData` now return a promise.
  - **Sorting:**
    - `list.sortParam: 'path'` (opt-in) sends the column's data path (`customer.name`) instead of
      the TanStack id (`customer_name`); it becomes the default in the next major.
    - The server helpers read both forms, sort by relation counts (`_count.x`), and take
      snake_case fields listed in `sortableFields`.
  - **Row actions:** `display.mode: 'auto'` moves every action into the menu on small screens.
  - **Fixes:**
    - a required `0` blocked form submits;
    - `validateAll` stopped at the first form;
    - a freshly loaded form counted as dirty;
    - dispatch-job array fields were sent as strings.
  - **Queue dashboard:**
    - keyboard-accessible event timeline with working retry/remove;
    - a "Recurring" badge only on scheduler iterations;
    - Escape closes the queue modals.
  - **Charts:** the tooltip and legend use recharts' own types; `formatter`'s fifth argument is the
    tooltip payload, as recharts documents.
  - **Dependencies:** runtime dependency ranges refreshed, recharts 3.11 among them.
- `@telamonjs/queue` 1.3.0: `FlowProducer.add()` returns the created flow, and flows apply the job
  class and manager default options.
- `@telamonjs/logger` 1.1.0:
  - opt-in browser transport (batched, `sendBeacon` on hide, no PII by default);
  - `audit()` entries are no longer dropped by the level filter;
  - BigInt and circular context values no longer throw.
- `@telamonjs/cli` 1.1.3:
  - templates drop `xlsx`/`papaparse` and start on ui ^1.4.0;
  - `db dump`/`db restore` report pg failures instead of hiding them.

## ui 1.3.1 (2026-11-24)

`@telamonjs/ui`: `ConfirmActionDialog` (and `confirmDialog.inputs`) focuses the first input on
open; without inputs, focus still starts on Cancel.

## ui 1.3.0 (2026-11-24)

More consumer-driven additions; `packages/ui/CHANGELOG.md` has the details. Everything is opt-in,
except the paginated export fix noted below.

- `@telamonjs/ui` 1.3.0:
  - **`QueryErrorState`:** a public error state with a pending "Try again", for screens with their
    own `useQuery`. View and edit dialogs use it and gain a working retry.
  - **ListPage export:**
    - `list.exportAll` exports every matching row through the config's own `queryFn`, with
      progress, cancel and a row cap.
    - `list.onExport(state, format)` hands the export to the app (for example to the server).
    - `fetchAllPages` is public.
    - The paginated list's headerless CSV export is replaced by the regular Excel/CSV/PDF menu.
  - **`CrudConfig.permissions`:** a development warning when nothing can check them, and an opt-in
    `failClosed`.
  - **Confirm inputs:**
    - `minLength`/`maxLength` with a live character count;
    - date `min`/`max`;
    - `{ value, label }` options;
    - `placeholder`, `description`, `rows`, `suggestions`, `inputMode`, `autoComplete`;
    - opt-in `disableUntilValid`.
- `@telamonjs/cli` 1.1.2: scaffolded apps start on ui ^1.3.0.

## ui 1.2.1 (2026-11-24)

`@telamonjs/ui`: queue Real-time timeline rows no longer overlap when a job label is long; the
label truncates and the rows are measured instead of pinned to a fixed height.

## ui 1.2.0 (2026-11-24)

Driven by consumer feedback on 1.1; each package's `CHANGELOG.md` has the details. Everything new
is opt-in, and nothing breaks.

- `@telamonjs/ui` 1.2.0:
  - Fixes:
    - Clicking inside a row action's confirm dialog no longer triggers the row click, which used to
      open the view dialog behind it and lock the confirm buttons. Clicks on links and form fields
      inside a row no longer trigger it either.
    - A deep-linked dialog (`?view=`) no longer reopens on the first Escape when permissions load late.
    - Multi-section forms without tabs have spacing between sections.
    - Horizontal bars round their end.
    - The queue Real-time tables fit their panel.
    - pt-BR accents in the queue dispatch dialog.
  - `ConfirmActionDialog`:
    - caller-controlled `pending`/`pendingText`, `confirmDisabled` and a free `body` slot;
    - ReactNode titles and descriptions;
    - `date` inputs and per-input `validate`, which also work in `confirmDialog.inputs`.

    Local copies migrate by renaming their body `children` to `body`.
  - Lists that can't create show a neutral empty-state message.
  - `JobDetailPage` and the queue toasts use `jobLabel`/`moduleLabels`.
  - The `next-auth` peer accepts `^5.0.0-beta.20`.
- `@telamonjs/queue` 1.2.0: job contracts take a short `label`, served as `displayName` before
  `description`.
- `@telamonjs/cli` 1.1.1: scaffolded apps start on ui/queue ^1.2.0.

## 2026-11-24

Minor release driven by what consumer apps had to work around; each package's `CHANGELOG.md`
has the details. Everything is opt-in: apps that don't use the new options see no change, except
where noted below.

- `@telamonjs/ui` 1.1.0:
  - `CrudConfig.permissions` gates the New button, row actions, dialogs and section saving, and
    takes a `can()` that understands bypass roles.
  - Public `ConfirmActionDialog` that stays open while the action runs, and `confirmDialog.inputs`
    are rendered and passed to the handler. A failed confirmed row action now keeps the dialog
    open for a retry.
  - `form`/`validation` are optional for read-only lists, `toolbarContent` can receive the list
    query, and filters take an explicit `allValue`.
  - The view dialog footer follows the row actions' rules.
  - Queue dashboard: `moduleLabels`, `jobLabel` and the job contract's `displayName`; the group
    order is now the same in both tabs.
  - `maskType` presets (cpf/cnpj/cep), textarea `rows`, StatCard tooltips, BarChart axis props,
    `CalendarWithEvents.onMonthChange` and `ReportTable.showFooter`.
  - Form grids collapse to one column on small screens, and dialogs close after the list refetch.
- `@telamonjs/auth` 1.2.0: the JWT guard's `secret` can be resolved per request, and
  `createException` lets the guard throw the app's own exception classes.
- `@telamonjs/permissions` 1.1.0: `createException` and an `onDenied` hook.
- `@telamonjs/queue` 1.1.0:
  - Dead-letter queue retention (`maxAge`/`maxLen`, `purgeOlderThan`).
  - The scheduler reconciler uses BullMQ job schedulers and migrates legacy repeatables on its
    first pass.
  - express 4 and 5 are both supported.
- `@telamonjs/cli` 1.1.0: `telamonjs link` / `telamonjs unlink` replace the per-app link-mode
  scripts.

## 2026-11-23

Hardening release across every package; each package's `CHANGELOG.md` has the details.

- `@telamonjs/ui` 1.0.4: server pagination always combines `baseWhere`, visibility rules and
  search with `AND` (a scope rule could be dropped), sort input is validated (new
  `sortableFields`), "…" menu actions honour `confirmDialog`, and the queue real-time tab
  stops polling every 2 s while SSE is connected or the tab is hidden.
- `@telamonjs/auth` 1.1.1: API-issued tokens carry `authTime`/`accessAt`, the session callback
  is typed against the app's session, and the `@auth/core` peer accepts `<1`.
- `@telamonjs/permissions` 1.0.2: 401 for a missing user, a generic 403 message, and an opt-in
  `failClosed` mode with `Public()`.
- `@telamonjs/logger` 1.0.2: `format: 'json'` is honoured and chalk is gone (no runtime
  dependencies).
- `@telamonjs/queue` 1.0.2: `QueueHttpModule.forRoot` takes `readPermission`/`writePermission`,
  and reconciler read errors are logged.
- `@telamonjs/cli` 1.0.3: scaffolded apps use `@telamonjs/auth`, and the link-mode git hooks no
  longer relink after every commit.

## cli 1.0.2 (2026-11-19)

`@telamonjs/cli`: the monorepo template's link mode switches back to the committed or latest
published `@telamonjs/ui` range, never to an unpublished local version.

## 1.0.3 (2026-11-19)

`@telamonjs/ui`: `ModernSidebar` no longer causes a hydration mismatch for users who saved
the compact sidebar; the preference is read after hydration.

## 1.0.2 (2026-11-19)

Tagged but not published to npm: 1.0.3 includes it.

`@telamonjs/ui`: `react-grid-layout` is a dependency instead of an optional peer, so apps
that do not use `DashboardGrid` no longer fail to build with "Module not found".

## 1.0.1 (2026-11-19)

First public release:

- `@telamonjs/ui` — CRUD framework (CrudConfig + TanStack Query), 36-type field
  system, rich dialogs (View/Edit/Create, ViewPortalDialog with inline
  per-section editing, unsaved-changes guard), app shell, dashboards, charts,
  i18n (pt-BR/en/es via next-intl)
- `@telamonjs/auth` — NextAuth v5 ↔ NestJS session bridge
- `@telamonjs/permissions` — RBAC with token-materialized permissions
- `@telamonjs/logger` — structured logging with audit/perf extensions
- `@telamonjs/queue` — BullMQ engine with config-driven jobs, scheduler reconciler
  and Bull Board
- `@telamonjs/cli` — app scaffolding, CRUD generation from a Prisma schema and a
  convention linter
