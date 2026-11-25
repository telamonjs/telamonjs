/**
 * Type-level tests for `CrudConfig`: the shapes real apps write, which used to
 * need `as any` or a local wrapper. Type-checked by `pnpm type-check`
 * (`tsconfig.typetest.json`); the runtime assertions only keep vitest happy.
 */
import { describe, expect, it } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import type { CrudConfig, MutationsConfig } from './crud'
import type { DialogHeaderConfig } from './dialog-header'
import type { FormField } from './forms/admin-form'
import type { PaginatedResponse } from './pagination'
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

  // Pinned: these already compile — a regression here is a breaking change
  it('keeps accepting the shapes that already compiled', () => {
    const plain: ColumnDef<Product>[] = [{ accessorKey: 'name', header: 'Name' }]
    const config: CrudConfig<Product, ProductFormData> = {
      ...base,
      list: {
        ...base.list,
        columns: plain,
      },
      // asQueryFn bridges a client whose params are narrower than PaginationParams
      query: { queryKey: ['products'], queryFn: asQueryFn<Product>(productsApi.list) },
      // read-only module: no create/update/delete stubs
      mutations: { getForView: productsApi.getById },
    }
    expect(config.module.name).toBe('products')
  })
})
