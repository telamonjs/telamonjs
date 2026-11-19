# TelamonJS

[![CI](https://github.com/telamonjs/telamonjs/actions/workflows/ci.yml/badge.svg)](https://github.com/telamonjs/telamonjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@telamonjs/ui.svg)](https://www.npmjs.com/package/@telamonjs/ui)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

> **The admin framework that holds your systems up.**

In classical architecture, a *telamon* is the sculpted figure that carries the
weight of the building. TelamonJS does the same for admin systems: declare what
a module is, and it holds up the list, the forms, the dialogs, the permissions
and the data layer around it. Built for Next.js on TanStack Query, Radix UI,
Tailwind CSS, Zod and React Hook Form.

## Get started

```bash
npx -p @telamonjs/cli create-telamonjs-app my-admin
```

The CLI scaffolds a Next.js admin with sign-in, a reference CRUD module, the app
shell and pt-BR/en/es messages, then prints the remaining steps (database, env,
seed). Adding TelamonJS to an existing app instead? See the
[`@telamonjs/ui` README](./packages/ui/README.md).

## The core idea: `CrudConfig`

One object describes a module (list, form, queries and mutations) and
`ListPage` renders the whole experience:

```tsx
'use client'
import { type CrudConfig, ListPage } from '@telamonjs/ui'

export const config: CrudConfig<User, UserFormData> = {
  module: { name: 'users', title: 'Users', route: '/admin/users' },
  list: { title: 'Users', columns, searchPlaceholder: 'Search…' },
  form: { sections, validation: userSchema },
  query: { queryKey: ['users'], queryFn: usersApi.list }, // → PaginatedResponse<User>
  mutations: {
    create: { mutationFn: async d => ({ success: true, data: await usersApi.create(d) }), invalidates: [['users']] },
    update: { mutationFn: async ({ id, data }) => ({ success: true, data: await usersApi.update(id, data) }), invalidates: [['users']] },
    delete: { mutationFn: async ({ id }) => { await usersApi.delete(id); return { success: true } }, invalidates: [['users']] },
  },
}

// page.tsx
<ListPage<User> config={config} />
```

You get a virtualized table with infinite scroll, toolbar, filters,
create/edit/view dialogs, exports and URL deep-linking.

## Packages

Each package works standalone.

| Package | What it does |
| --- | --- |
| [`@telamonjs/ui`](./packages/ui/README.md) | The admin framework: `CrudConfig` + `ListPage`, 36-type field system, dialogs, app shell with Cmd+K, dashboards, charts, i18n |
| [`@telamonjs/auth`](./packages/auth/README.md) | NextAuth v5 ↔ NestJS bridge: the JWE session-token contract, a Nest guard and revocable impersonation |
| [`@telamonjs/permissions`](./packages/permissions/README.md) | RBAC materialized into the JWT: every check is an array lookup, no database query per request |
| [`@telamonjs/logger`](./packages/logger/README.md) | One `ILogger` across browser, server and worker, with `audit()`, `perf()` and child loggers |
| [`@telamonjs/queue`](./packages/queue/README.md) | BullMQ job engine: config-driven jobs, Bull Board, Prometheus metrics and an HTTP backend for the ui queue dashboard |
| [`@telamonjs/cli`](./packages/cli/README.md) | `create-telamonjs-app` scaffolding, CRUD generation from a Prisma schema and a convention linter |

## Documentation

The documentation site is not deployed yet. Until it is:

- each package README above covers install, a canonical example and the entry points;
- the site sources (MDX) are readable on GitHub:
  [`apps/docs/content/docs`](https://github.com/telamonjs/telamonjs/tree/main/apps/docs/content/docs).

## Requirements

Node ≥ 22 · Next.js `^15.5.29 || ^16.4.6` · React 18 or 19

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the build order, the example app,
the docs workflow and how releases work.

## Status

TelamonJS 1.0 is out. Every package runs its test suite in CI, accessibility is
asserted with axe against real primitives, and the public API is pinned by a
snapshot test and follows semver: a removed or renamed export means a new major.
Release notes live in [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) © Marcos Tullyo. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
