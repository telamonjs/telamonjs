# Changelog

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
