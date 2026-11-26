# CLI Generator - Example Output

Real output of the generator (Node 22, CLI built from this tree) inside an
app created with `telamonjs create app-gen --provider postgresql`, then
type-checked against `@telamonjs/ui` and linted with
`telamonjs lint src/app/admin` → 0 problems.

## Command

```bash
telamonjs generate crud produtos --model Produto
```

Run without `--model`/`-p` for interactive prompts (module name, Prisma
model, path, menu update).

## Detected Prisma Model

```prisma
model Produto {
  id         String   @id @default(cuid())
  nome       String
  descricao  String?
  preco      Float
  estoque    Int      @default(0)
  ativo      Boolean  @default(true)
  validade   DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## Generated Output

```
📦 TelamonJS CRUD Generator

✔ Detected Prisma model 'Produto' with 9 fields
✔ Created ./src/app/admin/produtos/config.tsx
✔ Created ./src/app/admin/produtos/page.tsx
✔ Created ./src/app/admin/produtos/_components/ProdutoDetail.tsx
✔ Created ./src/lib/api/produtos-client.ts
✔ Created ./src/app/api/produtos/route.ts
✔ Created ./src/app/api/produtos/[id]/route.ts
✔ Permissions produtos.read, produtos.write in src/rbac.ts
✔ Code formatted

✓ CRUD module 'produtos' created successfully!

Next steps:
  1. Review generated files in src/app/admin/produtos
  2. Fill in relationship TODOs in config.tsx (loadField stubs)
  3. The Route Handlers require produtos.read (GET) and produtos.write (POST, PATCH, DELETE)
  4. Run pnpm db:seed so the admin role gets them, then grant them to other roles
  5. Icons are resolved by name from src/lib/icons.ts -- add any you change there
  6. Run pnpm dev to see your new module
```

```
$ telamonjs lint src/app/admin
✔ 8 arquivo(s), nenhum problema
```

## Generated Files Content

### 1. config.tsx — the CrudConfig

```tsx
'use client'

import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import type {
  CrudConfig,
  DialogHeaderConfig,
  FormSection,
} from '@telamonjs/ui'
import { getIcon } from '@/lib/icons'
import { produtosApi, type Produto } from '@/lib/api/produtos-client'
import { formatDate } from '@/lib/utils'
import ProdutoDetail from './_components/ProdutoDetail'

// ============================================================================
// 1. VALIDATION SCHEMA
// ============================================================================
export const validationSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório'),
  descricao: z.string().min(1, 'descricao é obrigatório').nullish(),
  preco: z.coerce.number(),
  estoque: z.coerce.number(),
  ativo: z.preprocess(
    (v) => (typeof v === 'string' ? v === 'true' : v),
    z.boolean()
  ),
  validade: z.coerce.date().nullish(),
})

export type ProdutoFormData = z.infer<typeof validationSchema>

// ============================================================================
// 2. HEADER CONFIG (view/edit/create dialogs)
// ============================================================================
const headerConfig: DialogHeaderConfig<Produto> = {
  icon: 'FileText',
  iconColor: 'blue',
  title: (item) => String(item.nome ?? item.id),
  gradient: 'from-blue-50 to-indigo-50',
  badge: {
    field: 'ativo',
    variants: { true: 'default', false: 'secondary' },
    labels: { true: 'Ativo', false: 'Inativo' },
  },
}

// ============================================================================
// 3. COLUMNS
// ============================================================================
export const columns: ColumnDef<Produto>[] = [
  { header: 'Nome', accessorKey: 'nome' },
  { header: 'Descricao', accessorKey: 'descricao' },
  { header: 'Preco', accessorKey: 'preco' },
  { header: 'Estoque', accessorKey: 'estoque' },
  {
    header: 'Ativo',
    accessorKey: 'ativo',
    cell: ({ row }) => (row.original.ativo ? 'Sim' : 'Não'),
  },
  {
    header: 'Validade',
    accessorKey: 'validade',
    cell: ({ row }) =>
      row.original.validade ? formatDate(row.original.validade) : null,
  },
]

// ============================================================================
// 4. FORM SECTIONS (rendered inside the create/edit dialogs)
// ============================================================================
export const formSections: FormSection[] = [
  {
    label: 'Dados',
    description: 'Dados do registro',
    grid: '2',
    fields: [
      {
        name: 'nome',
        label: 'Nome',
        type: 'text',
        required: true,
        focus: true,
      },
      { name: 'descricao', label: 'Descricao', type: 'text' },
      { name: 'preco', label: 'Preco', type: 'number', required: true },
      { name: 'estoque', label: 'Estoque', type: 'number', required: true },
      { name: 'ativo', label: 'Ativo', type: 'boolean', required: true },
      { name: 'validade', label: 'Validade', type: 'date' },
    ],
  },
]

// ============================================================================
// 5. CRUD CONFIG
// ============================================================================
export const produtosConfig: CrudConfig<Produto, ProdutoFormData> = {
  module: {
    name: 'produtos',
    title: 'Produtos',
    description: 'Gerenciamento de produtos',
    route: '/admin/produtos',
  },

  // Checked with the PermissionsProvider's can (LayoutProviders): a denied
  // operation loses its button, row action and dialog deep link. The Route
  // Handlers enforce the same codes.
  permissions: {
    view: 'produtos.read',
    create: 'produtos.write',
    edit: 'produtos.write',
    delete: 'produtos.write',
  },

  list: {
    // Empty: the shell breadcrumb already names the page; the list is content, not a header.
    title: '',
    description: '',
    searchPlaceholder: 'Buscar...',
    columns,
    defaultSortBy: 'nome',
    defaultSortOrder: 'asc',
    serverSidePagination: true,
    infiniteScroll: true,
    defaultPageSize: 100,
    toolbar: {
      counterLabel: (count: number) => (count === 1 ? 'registro' : 'registros'),
    },
  },

  form: { sections: formSections, validation: validationSchema },

  query: {
    queryKey: ['produtos'],
    queryFn: produtosApi.list,
    staleTime: 30_000,
  },

  mutations: {
    // mutationFn must resolve to { success, data? } -- produtosApi.* returns the
    // raw entity, so we shape the result here rather than in the client.
    create: {
      mutationFn: async (data) => ({
        success: true,
        data: await produtosApi.create(data),
      }),
      invalidates: [['produtos']],
    },
    update: {
      mutationFn: async ({ id, data }) => ({
        success: true,
        data: await produtosApi.update(id, data),
      }),
      invalidates: [['produtos']],
    },
    delete: {
      mutationFn: async ({ id }) => {
        await produtosApi.delete(id)
        return { success: true }
      },
      invalidates: [['produtos']],
    },
    getForEdit: async (id) => {
      const item = await produtosApi.getById(id)
      return {
        nome: item.nome,
        descricao: item.descricao,
        preco: item.preco,
        estoque: item.estoque,
        ativo: item.ativo,
        validade:
          item.validade == null ? item.validade : new Date(item.validade),
      }
    },
    getForView: produtosApi.getById,
  },

  actionsConfig: {
    standard: {
      view: { icon: getIcon('Eye'), tooltip: 'Ver detalhes' },
      edit: { icon: getIcon('Pencil'), tooltip: 'Editar' },
      delete: {
        icon: getIcon('Trash2'),
        tooltip: 'Excluir',
        confirmDialog: {
          title: (row) => `Excluir ${String(row.nome ?? row.id)}?`,
          description: () => 'Esta ação não pode ser desfeita.',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          variant: 'destructive',
        },
      },
    },
  },

  dialogs: {
    view: {
      urlParam: 'view',
      title: 'Detalhes',
      headerConfig,
      renderContent: (item) => <ProdutoDetail item={item} />,
    },
    edit: {
      urlParam: 'edit',
      title: 'Editar',
      description: 'Atualize as informações do registro',
      headerConfig,
    },
    create: {
      urlParam: 'create',
      title: 'Novo Registro',
      description: 'Cadastre um novo registro',
      headerConfig: {
        ...headerConfig,
        title: 'Novo Registro',
        subtitle: undefined,
        badge: undefined,
      },
    },
  },
}
```

### 2. page.tsx — the module's only route

```tsx
'use client'

import { ListPage } from '@telamonjs/ui'
import { produtosConfig } from './config'

// All CRUD (view/create/edit/delete) happens in dialogs on this list --
// there are no adicionar/ or [id]/ routes.
export default function ProdutosPage() {
  return <ListPage config={produtosConfig} />
}
```

### 3. _components/ProdutoDetail.tsx — view dialog body

```tsx
'use client'

import { memo } from 'react'
import {
  ContentTabs,
  SemanticCard,
  SemanticField,
  type TabItem,
} from '@telamonjs/ui'
import { getIcon } from '@/lib/icons'
import { formatDate } from '@/lib/utils'
import type { Produto } from '@/lib/api/produtos-client'

const InfoIcon = getIcon('Info')
const CalendarIcon = getIcon('Calendar')

interface ProdutoDetailProps {
  item: Produto
}

/**
 * Rendered INSIDE the view dialog (`dialogs.view.renderContent`) -- never on
 * its own route. Up to 5 sections: ContentTabs. 6+ sections: switch the
 * config to `dialogs.view.portal`.
 */
function ProdutoDetail({ item }: ProdutoDetailProps) {
  // Fixed height: the dialog must not resize when switching tabs.
  const contentHeight = 'h-[min(600px,60vh)] overflow-y-auto'

  const tabs: TabItem[] = [
    {
      value: 'info',
      label: 'Informações',
      icon: 'Info',
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <SemanticCard title="Dados" icon={InfoIcon} color="blue">
              <SemanticField label="Nome" value={item.nome} />
              <SemanticField label="Descricao" value={item.descricao} />
              <SemanticField label="Preco" value={item.preco} />
              <SemanticField label="Estoque" value={item.estoque} />
              <SemanticField label="Ativo" value={item.ativo ? 'Sim' : 'Não'} />
              <SemanticField
                label="Validade"
                value={item.validade ? formatDate(item.validade) : null}
              />
            </SemanticCard>
          </div>
        </div>
      ),
    },
    {
      value: 'auditoria',
      label: 'Auditoria',
      icon: 'History',
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <SemanticCard title="Registro" icon={CalendarIcon} color="purple">
              <SemanticField
                label="CreatedAt"
                value={formatDate(item.createdAt)}
              />
              <SemanticField
                label="UpdatedAt"
                value={formatDate(item.updatedAt)}
              />
            </SemanticCard>
          </div>
        </div>
      ),
    },
  ]

  return <ContentTabs tabs={tabs} variant="default" defaultValue="info" flush />
}

export default memo(ProdutoDetail)
```

### 4. src/lib/api/produtos-client.ts — API client

```ts
import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'
import type { ProdutoFormData } from '@/app/admin/produtos/config'

export interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: number
  estoque: number
  ativo: boolean
  validade: string | null
  createdAt: string
  updatedAt: string
}

const BASE_URL = '/api/produtos'

export const produtosApi = {
  list: (params: PaginationParams): Promise<PaginatedResponse<Produto>> => { /* fetch with page/pageSize/search/sortBy/sortOrder */ },
  getById: (id: string): Promise<Produto> => { /* GET /api/produtos/:id */ },
  create: (data: ProdutoFormData): Promise<Produto> => { /* POST */ },
  update: (id: string, data: Partial<ProdutoFormData>): Promise<Produto> => { /* PATCH */ },
  delete: (id: string): Promise<void> => { /* DELETE */ },
}
// every call: credentials: 'include'; non-OK responses throw Error(body.message)
```

### 5. src/app/api/produtos/route.ts and [id]/route.ts — Route Handlers

Every handler does **authorize → validate → execute**:
`requirePermission('produtos.read')` on GET and `requirePermission('produtos.write')`
on POST/PATCH/DELETE (401 without a session, 403 without the permission), Zod `createSchema` / all-optional `updateSchema`, validated
pagination (`pageSize` capped at 100), `sortBy` whitelisted against
`SORTABLE_FIELDS`, insensitive search on String fields, Prisma P2025 → 404
on PATCH/DELETE, hard delete → 204. Models with `password`/`senha`/`hash`
fields get a `serialize()` helper that strips them from every response.

## Result

A complete CRUD module in the CrudConfig + React Query + dialogs pattern:

- Consolidated `config.tsx` (schema, header, columns, form, query, mutations, actions, dialogs)
- One-line `ListPage`; view/create/edit/delete in dialogs, no extra routes
- `ProdutoDetail` with `ContentTabs` + `SemanticCard`/`SemanticField`
- Route Handlers with a permission gate, Zod validation, sortBy whitelist,
  pagination caps and sensitive-field stripping
- Typed REST client as the single seam between UI and API
- Passes `telamonjs lint` and `tsc` as generated
