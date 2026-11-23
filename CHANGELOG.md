# Changelog

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
