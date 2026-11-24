# @telamonjs/ui

The TelamonJS admin framework for Next.js and React. A single `CrudConfig`
object declares a module (list, form, queries, mutations, dialogs) and
`ListPage` renders the whole CRUD experience: table, toolbar, filters, dialogs
and exports. Around it you get an app shell with a command palette, a 36-type
field renderer registry, dashboards, charts and a queue dashboard. The public
API is pinned by a snapshot test, and accessibility is asserted with axe.

## Install

The fastest path is a generated app, which comes with everything wired up:
`npx -p @telamonjs/cli create-telamonjs-app my-admin`. To add the package to an
existing Next.js app:

<!-- generated:peers -->
```bash
pnpm add @telamonjs/ui framer-motion jspdf jspdf-autotable next next-auth papaparse react react-dom react-hook-form sonner xlsx zod next-intl @tanstack/react-query
```

| Peer dependency | Range |
| --- | --- |
| `framer-motion` | `^11.0.0 \|\| ^12.0.0` |
| `jspdf` | `^4.2.1` |
| `jspdf-autotable` | `^5.0.7` |
| `next` | `^15.5.29 \|\| ^16.4.6` |
| `next-auth` | `^5.0.0-beta.20` |
| `papaparse` | `^5.5.0` |
| `react` | `^18.0.0 \|\| ^19.0.0` |
| `react-dom` | `^18.0.0 \|\| ^19.0.0` |
| `react-hook-form` | `^7.0.0` |
| `sonner` | `^1.7.1 \|\| ^2.0.7` |
| `xlsx` | `^0.18.0` |
| `zod` | `^3.0.0` |
| `next-intl` | `^4.14.0` |
| `@tanstack/react-query` | `^5.90.2` |
| `@prisma/client` (optional) | `^5.0.0 \|\| ^6.0.0` |
<!-- /generated:peers -->

`DashboardGrid` needs the `react-grid-layout` stylesheet
(`import 'react-grid-layout/css/styles.css'`), and `@prisma/client` is only needed for the
`./server` pagination helpers. Then load the styles and the Tailwind preset:

```tsx
// app/layout.tsx
import '@telamonjs/ui/styles'

// tailwind.config.js (darkMode: 'class')
presets: [require('@telamonjs/ui/tailwind-preset')]
```

> **Import `@tanstack/react-query` and `next-intl` directly in your app.** This
> package deliberately does not re-export them: a re-export creates a second
> instance under `optimizePackageImports`, and you get "No QueryClient set".

## A module in one object

```tsx
'use client' // config.tsx needs it: the hooks run on the client

import { type CrudConfig, ListPage } from '@telamonjs/ui'

export const config: CrudConfig<Product, ProductFormData> = {
  module: { name: 'products', title: 'Products', route: '/admin/products' },
  list: { title: 'Products', columns, searchPlaceholder: 'Search products…', serverSidePagination: true },
  form: { sections, validation: productSchema },
  query: { queryKey: ['products'], queryFn: productsApi.list }, // must resolve PaginatedResponse<Product>
  mutations: {
    create: { mutationFn: async d => ({ success: true, data: await productsApi.create(d) }), invalidates: [['products']] },
    update: { mutationFn: async ({ id, data }) => ({ success: true, data: await productsApi.update(id, data) }), invalidates: [['products']] },
    delete: { mutationFn: async ({ id }) => { await productsApi.delete(id); return { success: true } }, invalidates: [['products']] },
  },
}

// page.tsx
<ListPage<Product> config={config} />
```

Field types are `'text'`, `'email'`, `'relationship'` (options come from an
async `loadField`), `'multiselect'`, `'richtext'` and 31 more; there is no
`'select'` type. Forms are CSS Grid: widen a field with `span`, not a class.

## What's inside

| Area | Highlights |
| --- | --- |
| Pages | `ListPage`, `DetailPage`, `CreatePage`, `EditPage` |
| Dialogs | `CreateDialog`, `EditDialog`, `ViewDialog`, `ViewPortalDialog` (launcher grid, inline per-section editing), `DialogFrame`, `SplitDialogFrame`, `ConfirmActionDialog` (validated inputs incl. dates, free `body`, dialog- or caller-controlled `pending`) |
| Forms | `AdminForm`, `CreateForm`, `EditForm`, `Stepper`, `FileUpload`, `useUnsavedChangesGuard` |
| Field system | 36 field types; `registerFieldRenderer` adds your own |
| Shell | `AdminShell` (sidebar, breadcrumb, header, Cmd+K palette fed from your menu), `ShellPage`, `AdminTabs`, `ImpersonationBanner` |
| Data | `DataTable`, `VirtualDataTable`, `InfiniteList`, bulk actions, Excel/CSV/PDF export, `QueryErrorState` (error + pending "Try again" for your own `useQuery`) |
| Dashboards and charts | `DashboardGrid`, `DashboardShell`, `StatCard`, `ChartWidget`, `LineChart`, `BarChart`, `PieChart`, `AreaChart`, `KPICard` |
| Queue UI | `@telamonjs/ui/queue`: `QueueTabbedDashboard`, `QueueApiProvider`, `createNestJSAdapter`, a frontend for `@telamonjs/queue` |
| Server | `@telamonjs/ui/server`: `createPaginationContext`, `buildPrismaOrderBy`, `createPaginatedResponse`, `revalidatePathAction` |
| i18n | `@telamonjs/ui/i18n`: `msg`, `useText`, `LocaleSwitcher`; UI copy ships in pt-BR (default), en and es |

Menu icons are strings resolved through `setIconResolver()`: the icon registry
belongs to your app.

## Entry points

<!-- generated:entries -->
- `@telamonjs/ui`
- `@telamonjs/ui/server`
- `@telamonjs/ui/charts`
- `@telamonjs/ui/business`
- `@telamonjs/ui/detail`
- `@telamonjs/ui/styles` (stylesheet)
- `@telamonjs/ui/tailwind-preset` (file `./tailwind-preset.js`)
- `@telamonjs/ui/queue`
- `@telamonjs/ui/cards`
- `@telamonjs/ui/pickers`
- `@telamonjs/ui/filters`
- `@telamonjs/ui/i18n`

Every name each entry point exports, runtime and types: [Public API index](https://github.com/telamonjs/telamonjs/blob/main/docs/exports.md).
<!-- /generated:entries -->

## Full docs

**Full docs →** [getting started, components and patterns](https://github.com/telamonjs/telamonjs/tree/main/apps/docs/content/docs)
(MDX sources of the docs site, readable on GitHub).

MIT licensed. Base primitives are derived from [shadcn/ui](https://ui.shadcn.com);
see [THIRD_PARTY_NOTICES.md](https://github.com/telamonjs/telamonjs/blob/main/packages/ui/THIRD_PARTY_NOTICES.md).
