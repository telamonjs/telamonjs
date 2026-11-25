# Changelog

## 1.1.5

### Patch Changes

- 3fc8c80: `CrudConfig` accepts more of what apps already write, so these casts and wrappers can go:

  - **`mutations.getForEdit` may resolve the entity** (`TFormData | T`), so `getForEdit: api.getById` compiles without `as any` or an `asGetForEdit` wrapper. The edit form reads the fields it declares by name, as it always did.
  - **`headerConfig.iconColor` and `headerConfig.gradient` may be functions of the record** (`iconColor: r => (r.active ? 'green' : 'gray')`). Before, a function only compiled with a cast and was silently ignored at runtime; now it is resolved, falling back to `gray` and the default gradient when there is no record (the create dialog).
  - **`dialogs.*.defaultValues` accepts form-only keys** (`Partial<T> & Record<string, unknown>`): a create dialog can preset `categoryId` without a cast; keys of `T` keep their type.
  - **A `crud` field's `listFields` takes SubList columns** (`{ header, accessorKey | accessorFn, cell? }`, the `SubListField` type), the shape the sub-list always rendered, instead of `FormField` only. Drop the `as any` on each entry (and any `enableGlobalFilter` on it: the sub-list searches every column anyway).

  These casts are not needed with the current types and can simply be deleted: `columns: columns as any` (`ColumnDef<T>[]` is accepted), `headerConfig.badge.field: '...' as any` and `badgeField()` (`field` is a `string`), `mutations: { getForView } as any` and `readOnlyMutations()` (every mutation is optional). A local `asQueryFn` copy can be replaced by the one `@telamonjs/ui` exports.

## 1.1.4

### Patch Changes

- cc2f6ff: `@telamonjs/ui` no longer lists `framer-motion` or `@prisma/client` as peer dependencies: only `DashboardFullscreen` used framer-motion (for a fade-in, now CSS), and nothing imports `@prisma/client` (the server helpers build Prisma's object shape). Apps can drop both if nothing else of theirs uses them. Generated apps no longer install `framer-motion`.

## 1.1.3

### Patch Changes

- eb8e276: `telamonjs db dump` / `db restore` report failures correctly. A failing `pg_dump` used to print
  "Dump created successfully" and leave an empty `.sql.gz` that `db restore` then offered as a valid
  backup; it now fails, removes the partial file and says so. In `db restore`, a failed connection
  or a corrupt dump now prints its error message (under `set -e` the checks never ran), and a failed
  `prisma migrate deploy` after a successful restore only warns, as documented, instead of making the
  whole restore exit as failed.
- 5abed37: Raise the minimum versions of runtime dependencies to the current minors (no peer range changes).

  - `@telamonjs/ui`: `recharts` `~3.3.0` → `~3.11.0`; the `@radix-ui/react-*` primitives,
    `@tiptap/*` `^3.35.0`, `react-aria` `^3.53.1`, `react-stately` `^3.51.0`, `zustand` `^5.1.0`,
    `date-fns` `^4.4.0`, `dompurify` `^3.4.18`, `react-grid-layout` `^2.3.0`, `react-is` `^19.3.1`,
    `@tanstack/react-virtual` `^3.14.26`, `@uiw/react-textarea-code-editor` `^3.1.3` and
    `@vis.gl/react-google-maps` `^1.10.2`.
  - `@telamonjs/cli`: `fs-extra` `^11.4.1`. Apps created by `create-telamonjs-app` pin the same
    updated versions (`@radix-ui/*`, `@auth/prisma-adapter`, `date-fns`, `zustand`, `postcss`,
    `autoprefixer`, `prettier`, `prettier-plugin-tailwindcss`, `tsx` and friends).

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

## 1.1.2

### Patch Changes

- Scaffolded apps start on `@telamonjs/ui` ^1.3.0.

## 1.1.1

### Patch Changes

- Scaffolded apps start on `@telamonjs/ui` ^1.2.0 and `@telamonjs/queue` ^1.2.0.

## 1.1.0

### Minor Changes

- d2a50d7: New `telamonjs link [--ui <path>] [--package <path>]` and `telamonjs unlink [--package <path>]` commands switch an app between the published `@telamonjs/ui` and a local TelamonJS checkout, so apps no longer carry their own script. `link` follows the documented recipe: an injected `file:` dependency on the checkout's `packages/ui`, plus the required `pnpm.overrides["@telamonjs/logger"]` link in the workspace root's `package.json`. `unlink` removes both and restores the range committed at `HEAD`, else `^` plus the latest published version, never the checkout's own version. The edited `package.json` is `apps/web/package.json` when it exists, else `./package.json`. Neither command runs `pnpm install`.

  Monorepo template: `@telamonjs/cli` is now a root devDependency; `telamonjs:link`/`telamonjs:unlink` and the husky hooks call the command, and `scripts/telamonjs-mode.mjs` is gone. `post-commit` relinks when `node_modules` still holds the injected checkout, and `pre-commit` also stages the root `package.json`. Both templates' `next.config.js` treat a `file:` range as link mode too.

## 1.0.3

### Patch Changes

- 941da22: Scaffolded apps now use `@telamonjs/auth` instead of hand-rolled auth on raw `@auth/core`. The NextAuth config (single app and monorepo `apps/web`) uses the `jwt` and `session` callbacks of `createAuthCallbacks()` from `@telamonjs/auth/next` directly. `authorize()` returns the session contract: `role` is a `RoleInfo` and `permissions` is an array, and `authTime`/`accessAt` are stamped at login. The monorepo API's `JwtAuthGuard` extends `createJwtAuthGuard()` from `@telamonjs/auth/nest`, and its `resolveUser` still rejects inactive or deleted users and reads the role from the database. `@Public()` now comes from the package, and the API no longer depends on `@auth/core` directly (it is a peer of `@telamonjs/auth`). Role checks read `role.code`.

  Monorepo husky hooks: `post-commit` only relinks `@telamonjs/ui` when `node_modules` still resolves to the local checkout. Before, every pnpm-installed package counted, because each one is a symlink. `pre-commit` now aborts the commit when the lockfile update fails, and shows the error.

## 1.0.2

### Patch Changes

- Monorepo template: leaving link mode (`telamonjs:unlink` and the pre-commit hook) restores the committed `@telamonjs/ui` range, or the latest published version, instead of the local checkout's version, which may not be on npm yet. The logic lives in one `scripts/telamonjs-mode.mjs` shared by the scripts and the hooks.

## 1.0.1

First public release of `@telamonjs/cli`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
