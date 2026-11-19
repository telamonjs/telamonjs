# Changelog

## 1.0.2 (2026-11-19)

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
