/**
 * Type-level tests for `CrudConfig`: the shapes real apps write, which used to
 * need `as any` or a local wrapper. Type-checked by `pnpm type-check`
 * (`tsconfig.typetest.json`); the runtime assertions only keep vitest happy.
 */
import { describe, expect, it } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import type {
  CrudConfig,
  CrudConfigWithAnyForm,
  ListQueryState,
  MutationsConfig,
} from './crud'
import type { DialogHeaderConfig } from './dialog-header'
import type { FormField } from './forms/admin-form'
import type { ListQueryParams, PaginatedResponse, SortField } from './pagination'
import { asQueryFn } from './pagination'

// What an API returns: nullable columns, relations, a status enum
interface Product {
  id: string
  name: string | null
  status: 'active' | 'archived'
  active: boolean
  category: { id: string; label: string } | null
}

// What the form edits: required strings, the relation as an id
interface ProductFormData {
  name: string
  categoryId: string
  active: boolean
}

// A typical HTTP client: its own list params (single-column sort, optional
// page) and a getById that returns the entity, not the form data
interface ClientListParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  status?: string
}
const page: PaginatedResponse<Product> = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }
const productsApi = {
  list: async (_params?: ClientListParams): Promise<PaginatedResponse<Product>> => page,
  getById: async (id: string): Promise<Product> => ({
    id,
    name: null,
    status: 'active',
    active: true,
    category: null,
  }),
}
// What many apps' create/update actions resolve: an envelope whose `data` is
// not the entity (an id, or nothing in particular)
interface ActionResponse<D = unknown> {
  success: boolean
  message: string
  data?: D
}
const created = async (_input: ProductFormData): Promise<ActionResponse<{ id: string }>> => ({
  success: true,
  message: '',
  data: { id: '1' },
})
const saved = async (_input: ProductFormData): Promise<ActionResponse> => ({ success: true, message: '' })
const base: Omit<CrudConfig<Product, ProductFormData>, 'mutations'> = {
  module: { name: 'products', title: 'Products', description: '', route: '/admin/products' },
  list: { title: 'Products', description: '', columns: [] },
  query: { queryKey: ['products'], queryFn: async () => page },
}

describe('CrudConfig types', () => {
  it('mutations.getForEdit may resolve the entity, not only the form data', () => {
    const config: CrudConfig<Product, ProductFormData> = {
      ...base,
      mutations: {
        getForEdit: productsApi.getById,
        getForView: productsApi.getById,
      },
    }
    const formOnly: MutationsConfig<Product, ProductFormData> = {
      getForEdit: async () => ({ name: 'n', categoryId: 'c', active: true }),
    }
    const wrong: MutationsConfig<Product, ProductFormData> = {
      // @ts-expect-error neither the entity nor the form data
      getForEdit: async () => ({ unrelated: 1 }),
    }
    expect([config, formOnly, wrong]).toHaveLength(3)
  })

  it('headerConfig.iconColor and gradient may be functions of the item', () => {
    const header: DialogHeaderConfig<Product> = {
      icon: 'Package',
      iconColor: p => (p.active ? 'green' : 'gray'),
      gradient: p => (p.active ? 'from-green-50 to-emerald-50' : undefined),
      title: p => p.name ?? '',
      // a plain string field path, no cast (has been `string` all along)
      badge: { field: 'status', variants: { active: 'default', archived: 'secondary' } },
    }
    const wrong: DialogHeaderConfig<Product> = {
      icon: 'Package',
      // @ts-expect-error not a ColorPreset
      iconColor: () => 'magenta',
      title: 'T',
    }
    expect([header, wrong]).toHaveLength(2)
  })

  it('dialogs.create.defaultValues may hold form-only keys', () => {
    const config: CrudConfig<Product, ProductFormData> = {
      ...base,
      mutations: {},
      dialogs: {
        create: { title: 'New', defaultValues: { active: true, categoryId: 'c1' } },
      },
    }
    const wrong: CrudConfig<Product, ProductFormData> = {
      ...base,
      mutations: {},
      // @ts-expect-error a known key keeps its type
      dialogs: { create: { title: 'New', defaultValues: { active: 'yes' } } },
    }
    expect([config, wrong]).toHaveLength(2)
  })

  it('a crud field takes SubList columns in listFields', () => {
    const field: FormField = {
      name: 'items',
      label: 'Items',
      type: 'crud',
      listFields: [
        { header: 'Name', accessorKey: 'name' },
        { header: 'Code', accessorFn: row => row.code },
      ],
    }
    expect(field.listFields).toHaveLength(2)
  })

  it('query.queryFn takes the client list function directly', () => {
    const config: CrudConfig<Product, ProductFormData> = {
      ...base,
      query: { queryKey: ['products'], queryFn: productsApi.list },
      mutations: {},
    }
    // a client that takes any record of params
    const loose = async (_p: Record<string, unknown>) => page
    const looseConfig: CrudConfig<Product, ProductFormData> = {
      ...base,
      query: { queryKey: ['products'], queryFn: loose },
      mutations: {},
    }
    // the params as ListPage passes them: one sort column, a string
    const inline: CrudConfig<Product, ProductFormData> = {
      ...base,
      query: {
        queryKey: ['products'],
        queryFn: async p => {
          const sortBy: string | undefined = p.sortBy
          // @ts-expect-error sortBy is a string here, never a SortField[]
          p.sortBy?.map(s => s)
          return { ...page, page: p.page, pageSize: p.pageSize, data: sortBy ? [] : [] }
        },
      },
      mutations: {},
    }
    const multiSort: CrudConfig<Product, ProductFormData> = {
      ...base,
      // @ts-expect-error a client that wants a SortField[] would not get one
      query: { queryKey: ['products'], queryFn: async (_p: { sortBy?: SortField[] }) => page },
      mutations: {},
    }
    // list.onExport hands the same params the queryFn gets
    const onExport = ({ params }: ListQueryState) => productsApi.list({ ...params, page: 1 })
    const params: ListQueryParams = { page: 1, pageSize: 10, sortBy: 'name', sortOrder: 'asc' }
    expect([config, looseConfig, inline, multiSort, onExport, params]).toHaveLength(6)
  })

  it('create/update may resolve a data that is not the entity', () => {
    const idOnly: CrudConfig<Product, ProductFormData, { id: string }> = {
      ...base,
      mutations: {
        create: {
          mutationFn: created,
          invalidates: [['products']],
          onSuccess: result => {
            const id: string | undefined = result.data?.id
            expect(id).toBeDefined()
          },
        },
        update: { mutationFn: ({ data }) => created(data as ProductFormData), invalidates: [] },
      },
    }
    const anything: CrudConfig<Product, ProductFormData, unknown> = {
      ...base,
      mutations: { create: { mutationFn: saved, invalidates: [] } },
    }
    // ListPage takes them as any other config
    const forList: CrudConfigWithAnyForm<Product>[] = [idOnly, anything]
    const entityByDefault: CrudConfig<Product, ProductFormData> = {
      ...base,
      mutations: {
        // @ts-expect-error by default `data` is the entity: an id-only result is caught
        create: { mutationFn: created, invalidates: [] },
      },
    }
    expect([forList, entityByDefault]).toHaveLength(2)
  })

  it('an app that returns the entity keeps a typed onSuccess', () => {
    const config: CrudConfig<Product, ProductFormData> = {
      ...base,
      mutations: {
        create: {
          mutationFn: async () => ({ success: true, data: await productsApi.getById('1') }),
          invalidates: [],
          onSuccess: result => {
            const name: string | null | undefined = result.data?.name
            // @ts-expect-error data is the entity, not unknown/any
            void result.data?.missing
            expect(name).toBeNull()
          },
        },
      },
    }
    expect(config.mutations.create).toBeDefined()
  })

  // Pinned: these already compile — a regression here is a breaking change
  it('keeps accepting the shapes that already compiled', () => {
    const plain: ColumnDef<Product>[] = [{ accessorKey: 'name', header: 'Name' }]
    const config: CrudConfig<Product, ProductFormData> = {
      ...base,
      list: {
        ...base.list,
        columns: plain,
      },
      // asQueryFn (an unchecked cast) keeps compiling
      query: { queryKey: ['products'], queryFn: asQueryFn<Product>(productsApi.list) },
      // read-only module: no create/update/delete stubs
      mutations: { getForView: productsApi.getById },
    }
    expect(config.module.name).toBe('products')
  })
})
