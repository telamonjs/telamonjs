---
name: telamonjs-crud
description: Use when creating or modifying a CRUD module in this app — a new admin section backed by a Prisma model with list/create/edit/view screens, or changes to an existing one's fields, columns, or dialogs.
---

Build the module in this order. Each step depends on the previous one — do
not skip ahead to `config.tsx` before the API layer exists.

For a new module, `pnpm telamonjs generate crud <module> --model <Model>`
writes steps 2–6 from the Prisma model in one go (config, page, detail, API
client, Route Handlers, menu entry, and the `messages/*.json` keys). Then
review each file against the steps below and fill the `loadField` TODOs.

## Workflow

1. **Prisma model** — add/edit the model in `prisma/schema.prisma`, then
   `pnpm db:migrate`.
2. **Route Handlers** — `src/app/api/<module>/route.ts` (GET list, POST
   create) and `src/app/api/<module>/[id]/route.ts` (GET/PATCH/DELETE).
   These are the ONLY files that import Prisma for this module.
3. **API client** — `src/lib/api/<module>-client.ts`. The ONLY file that
   calls `fetch()` against those routes. Export `list`, `create`, `update`,
   `delete`, `getById` — shape them to match what `config.tsx` needs (see
   step 4).
4. **`config.tsx`** — `src/app/admin/<module>/config.tsx`, `'use client'`
   at the top (required — React Query hooks). Build the `CrudConfig<T,
   TFormData>`: `module`, `list.columns`, `form.sections` +
   `form.validation` (Zod), `query.queryFn` (must return
   `PaginatedResponse<T>`), `mutations.create/update/delete` (each
   `mutationFn` must resolve `{ success, data? }`), `mutations.getForEdit` /
   `getForView` for dialogs. `config.tsx` never imports Prisma and never
   calls `fetch()` directly — only the client from step 3.
5. **`page.tsx`** — `src/app/admin/<module>/page.tsx`:
   `<ListPage config={<module>Config} />` and nothing else. View/create/edit
   are `dialogs.view/create/edit` in the config (view body =
   `_components/<Module>Detail.tsx`, ContentTabs + SemanticCard); delete is
   `actionsConfig.standard.delete.confirmDialog`. Never add `adicionar/`,
   `[id]/` or `[id]/editar/` routes — `telamonjs lint` fails on them.
6. **Menu entry** — add an item to `src/config/menu.ts` (`MenuItem[]`).
   `icon` is always a STRING (a key in the app's `iconRegistry`), never an
   imported Lucide component. If the icon name isn't in the registry it
   silently renders a blank circle — verify the string against
   `src/lib/icons.ts` (this app's `iconRegistry`, registered via
   `setIconResolver` in `app-providers.tsx`).
7. **Test** — `pnpm dev`, exercise list/create/edit/delete/view in the
   browser, then `pnpm type-check` and `pnpm lint:telamonjs` (0 errors). Add a
   co-located test for any custom logic (validation, derived columns, custom
   cell renderers).

Read `src/app/admin/usuarios/` as a working reference for all of the above
before asking questions about shape or wiring.

## Gotchas checklist (verify before calling the module done)

- [ ] `config.tsx` has `'use client'` on line 1.
- [ ] `form.sections[].fields[].label` — not `title`.
- [ ] `form.sections[].fields[].description` — not `helperText`.
- [ ] `relationship` / `multiselect` fields use `loadField: async () =>
      IOption[]` — there is no `options` prop on `FormField`.
- [ ] `query.queryFn` resolves `PaginatedResponse<T>` (`page`, `totalPages`,
      `total`), not a bare array — infinite scroll is the default and needs
      this metadata.
- [ ] Every `mutationFn` resolves `{ success: boolean, data? }`. If the
      client returns the raw entity, wrap it in the `mutationFn`, not in the
      client.
- [ ] A field's full-width layout uses `span` (must match the section's
      `grid`, default `'2'`) — `className: 'w-full'` is a no-op, BaseForm is
      CSS Grid, not flexbox.
- [ ] No `'select'` field type anywhere — it's `'relationship'`.
- [ ] No `AdminLayout`/`CrudLayout`/`Sidebar` import — the shell is
      `AdminShell`, already wired in `src/app/admin/layout.tsx`.
- [ ] A rich view (6+ sections) uses `dialogs.view.portal` in `CrudConfig`,
      not a standalone `ViewPortalDialog` — and does NOT pass `onEdit`,
      `onDelete`, or `deleteConfirmation` to it (they do not exist; delete
      lives in row actions, edit is inline per section via `edit` +
      `onSaveSection`).
- [ ] `list` has `title: ''`, `description: ''`, `serverSidePagination: true`,
      `defaultPageSize: 100`, `toolbar.counterLabel` — and never
      `infiniteScroll: false`.
- [ ] `actionsConfig.standard.view/edit/delete` are `{ icon: getIcon('…'),
      tooltip }` objects (delete with `confirmDialog`), never `true`.
- [ ] `dialogs.view` has `headerConfig` + `renderContent` (≤5 sections) or
      `portal` (6+); the Detail wraps each tab in
      `h-[min(600px,60vh)] overflow-y-auto`.
- [ ] Route Handlers are the only files touching Prisma for this module —
      grep the module's directory for `PrismaClient`/`@/lib/prisma` outside
      `src/app/api/<module>/`.
- [ ] i18n: no hardcoded UI string in `config.tsx` — `I18nText` slots use
      `msg('<module>.<key>')`, JSX-rendered text uses `<Msg k="…" />` (both
      from `@telamonjs/ui/i18n`); every new key goes in all three
      `messages/{pt-BR,en,es}.json` files. See "i18n" in `AGENTS.md`.

## Evidence rule

Before using any symbol from a `@telamonjs/*` package (a component, a prop,
a field type, a hook) that you are not 100% sure exists, confirm it in the
installed version:

- grep the shipped types, `node_modules/@telamonjs/*/dist/**/*.d.ts`, or
- read the package's `node_modules/@telamonjs/<package>/README.md`.

If the symbol isn't in either, it does not exist — do not guess from
an older project, a blog post, or a plausible-sounding name. Ask instead.
