# Working in this repository (agent guide)

TelamonJS is a pnpm monorepo: an admin framework for Next.js + React,
plus the auth/permissions/logger/queue packages around it, and a CLI
that scaffolds apps using them.

This file is for AI agents (and new contributors) working **on the framework
itself**. If you are working **in an app that consumes TelamonJS**, read the
`AGENTS.md` that the CLI generates inside that app instead.

## Packages

| Package | What it is |
| --- | --- |
| `packages/ui` | The framework: `CrudConfig` + `ListPage`, field system, dialogs, app shell, dashboards, charts, i18n |
| `packages/auth` | NextAuth v5 ↔ NestJS JWE session-token contract, Nest guard, impersonation |
| `packages/permissions` | RBAC materialized into the JWT — checks are array lookups, no queries |
| `packages/logger` | One `ILogger` across browser/server/worker; `audit()`/`perf()` |
| `packages/queue` | BullMQ engine: config-driven jobs, scheduler reconciler, Bull Board |
| `packages/cli` | `create-telamonjs-app` + CRUD generation from a Prisma schema + `telamonjs lint` |

Each package README documents its own API — read it before proposing code.

## Commands — order matters

The full contributor setup (Node, pnpm, Redis, the docs site) is in
[CONTRIBUTING.md](./CONTRIBUTING.md). The gate sequence, in CI order:

```bash
pnpm install
pnpm build        # ALWAYS first: workspace deps resolve types from dist/
pnpm lint
pnpm type-check
pnpm test
pnpm docs:check
pnpm docs:generate --check
```

Call `pnpm` directly, not `corepack pnpm`: with a global pnpm 10+ on the `PATH`,
the corepack form fails with a version mismatch (the root scripts call `pnpm`
again), while plain `pnpm` switches to the pinned version on its own.

Running `type-check` or `test` before `build` fails with
`Cannot find module '@telamonjs/logger'` — that is the missing build, not a
broken import.

The documentation site lives in `apps/docs` and is **not** part of the
aggregate scripts (it would slow every run). Build it separately — after
`pnpm build`, because its live previews import the packages' `dist/`:

```bash
pnpm docs:build
pnpm docs:dev     # local preview on :3001
```

`packages/queue` needs a reachable Redis on `127.0.0.1:6379`; without it, the
Redis-dependent suites skip gracefully (`docker run -d -p 6379:6379 redis:7-alpine`).

## The evidence rule

**`docs/exports.md` is the index of the public API**: every entry point of
every package, with the names each one exports, types marked. It is generated
from the barrels and from `packages/ui/src/__snapshots__/index.test.ts.snap`,
the snapshot that pins every runtime name of the ui root barrel
(`src/index.test.ts` fails when that list changes).

- Before using or documenting a symbol, confirm it is in `docs/exports.md` (or
  in the `.d.ts` of the relevant entry point). **If a name is not there, it does
  not exist** — do not invent it, do not assume a symbol from another admin
  framework exists here.
- A snapshot diff is a deliberate public-API change, never "a test to fix".
  Update it consciously (`pnpm test index -u`), regenerate the index
  (`pnpm docs:generate`) and say so in the commit.

Never propose code without at least one piece of evidence — an existing usage,
a type definition, a test. When there is no evidence, ask instead of guessing.

## Traps that cost the most time

1. **There is no `'select'` field type** — use `'relationship'`.
2. **`relationship`/`multiselect` load options via `loadField`**, an async
   function returning options. There is no `options` prop on `FormField`.
3. **Field props are `label` and `description`** — not `title`, not `helperText`.
4. **`BaseForm` is CSS Grid, not flexbox**: `className: 'w-full'` is ignored.
   Use `span: '2'` (match the section's `grid` value).
5. **`config.tsx` must start with `'use client'`** — React Query hooks need it.
6. **`queryFn` must resolve `PaginatedResponse<T>`** (`page`/`total`/`totalPages`),
   not a bare array: infinite scroll is the default and misbehaves silently.
7. **`mutationFn` must resolve `{ success, data? }`** — adapt inside the
   mutationFn, not in your REST client.
8. **The app shell is `AdminShell`** — there is no `AdminLayout`, `CrudLayout`,
   `FormLayout`, `Sidebar` or `LayoutProvider`.
9. **Menu icons are strings**, resolved through `setIconResolver()`; the icon
   registry belongs to the app, never to the library.
10. **Dynamic Zustand selectors inside custom hooks cause infinite loops**
    (`getSnapshot should be cached`) — subscribe to the store, select locally.
11. **`@tanstack/react-query` is deliberately NOT re-exported** by the barrel.
    Apps import it directly; re-exporting creates a second instance under
    `optimizePackageImports` → "No QueryClient set".
12. **Nested CRUD functions get the data first**: `create(data, { id: parentId })`
    and `update(data, { id, itemId })`; delete gets `({ id }, { parentId })`.
    `crudConfig.*` and the exported `CrudCreateFn`/`CrudEditFn`/`CrudDeleteFn`
    types all say so.
13. **Text slots are `I18nText`, not `string`** — literals still work, but code
    reading a slot must resolve it with `useText()`, or a `msg()` renders as
    `[object Object]`. Library text comes from `src/i18n/messages`, and `pnpm lint`
    fails on a stray pt-BR literal.
14. **`next-intl` is deliberately NOT re-exported either** — same reason as
    react-query. Apps import it directly.

## Conventions

- **TypeScript strict, zero `any`** (use `unknown`). Explicit types on public
  APIs; inference is fine for locals.
- **Named exports only** — no default exports in package source.
- **Server Components by default**; `'use client'` only for hooks, event
  handlers, browser APIs, stores and Lucide icons.
- **Tests are co-located** (`Component.test.tsx` next to `Component.tsx`) and
  organized as: Rendering, Interactions, State Management, Edge Cases,
  Accessibility. Accessibility assertions use `vitest-axe` against real
  (unmocked) primitives — never silence a violation by disabling the rule.
- New components ship with tests. The enforced global floor is 50%; review
  expects near-full coverage of the new component itself.
- Conventional Commits: `type(scope): description`.

## Changing docs

A fact lives in exactly one place. Change it there; every other surface
generates it, renders it at build time, links to it, or doesn't state it.

| Fact | Lives in | Everyone else |
| --- | --- | --- |
| Public API (names, types, entry points) | the package barrels, `packages/*/package.json` `exports`, the ui snapshot | `docs/exports.md` and the site's exports page, generated by `pnpm docs:generate` |
| Peer deps, supported Next/React/Node | `packages/*/package.json` (`peerDependencies`, `engines`), root `packageManager` | the site's `<PeerDeps>` / `<PkgVersion>` components; prose links instead of copying |
| Package versions | `package.json` | `<PkgVersion>` / `<VersionMatrix>` on the site; never in prose |
| Field types | the `FieldType` union in `packages/ui/src/field-system` | the field-types reference page |
| CLI commands and options | `packages/cli/src/cli.ts` + `commands/*/index.ts` | the CLI README and site page (hand-written, checked by `docs:check`) |
| CLI lint rules | `packages/cli/src/commands/lint/rules.ts` | the rule table in `packages/cli/templates/app/AGENTS.md` and on the site (ids must match) |
| Repo commands | root `package.json` scripts + `.github/workflows/ci.yml` | `CONTRIBUTING.md`, this file |
| The canonical `CrudConfig` example | `apps/example/src/app/admin/usuarios/config.tsx` (compiled in CI) | one full copy in `getting-started/crud-config.mdx`; other pages show short excerpts and link there |
| Test, export and page counts | — | not stated anywhere; they drift |

Generated files — never edit them by hand:

- `docs/exports.md`, `llms.txt` and `llms-full.txt` come from the code and the
  docs site: edit the sources, then `pnpm docs:generate`. CI fails on a stale
  copy (`pnpm docs:generate --check`).
- `apps/example` is generated by the CLI from its template: change
  `packages/cli/templates`, then `pnpm --filter @telamonjs/cli build && pnpm example:generate`.

Docs site pages (`apps/docs/content/docs/**`) never start with a `# Title`
line — the page renders `title` from the frontmatter. After a docs change, run
`pnpm docs:check` and `pnpm docs:build` (after `pnpm build`).

## Releases

A change that should reach npm ships with a changeset (`pnpm changeset`).
Maintainers run `pnpm version-packages` and commit the result. Once CI passes on `main`,
the Release workflow publishes every version that is not on npm yet (trusted publishing,
with provenance) and pushes the `@telamonjs/<pkg>@<version>` tags.

## Before you finish

Run the full sequence above and report the real output. If tests fail, say so
with the failure — never claim a suite is green without having seen it.
