'use client'

import { z } from 'zod'
import {
  Badge,
  type CrudColumnDef,
  type CrudConfig,
  type DialogHeaderConfig,
  type FormSection,
} from '@telamonjs/ui'
import { msg, Msg } from '@telamonjs/ui/i18n'
import { getIcon } from '@/lib/icons'
import { rolesApi, type Role } from '@/lib/api/roles-client'

// ============================================================================
// 1. VALIDATION SCHEMA
// ============================================================================
export const validationSchema = z.object({
  name: z.string().min(1),
  code: z.string().regex(/^[a-z][a-z0-9_-]*$/),
  description: z.string().optional(),
})

export type RoleFormData = z.infer<typeof validationSchema>

// ============================================================================
// 2. HEADER CONFIG (edit/create dialogs)
// ============================================================================
const headerConfig: DialogHeaderConfig<Role> = {
  icon: 'ShieldCheck',
  iconColor: 'purple',
  title: (r) => r.name,
  subtitle: (r) => r.code,
  gradient: 'from-purple-50 to-indigo-50',
}

// ============================================================================
// 3. COLUMNS
// ============================================================================
export const columns: CrudColumnDef<Role>[] = [
  {
    header: msg('papeis.columns.name'),
    accessorKey: 'name',
    cell: ({ row }) => (
      <div>
        <div className='font-medium'>{row.original.name}</div>
        <div className='font-mono text-xs text-muted-foreground'>{row.original.code}</div>
      </div>
    ),
  },
  {
    header: msg('papeis.columns.description'),
    accessorKey: 'description',
    enableSorting: false,
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>{row.original.description}</span>
    ),
  },
  {
    header: msg('papeis.columns.users'),
    id: 'users',
    enableSorting: false,
    cell: ({ row }) => row.original._count.users,
  },
  {
    header: msg('papeis.columns.permissions'),
    id: 'permissions',
    enableSorting: false,
    cell: ({ row }) => row.original._count.permissions,
  },
  {
    header: msg('papeis.columns.type'),
    id: 'system',
    enableSorting: false,
    cell: ({ row }) => (
      <Badge variant={row.original.system ? 'default' : 'outline'}>
        <Msg k={row.original.system ? 'papeis.system' : 'papeis.custom'} />
      </Badge>
    ),
  },
]

// ============================================================================
// 4. FORM SECTIONS
// ============================================================================
export const formSections: FormSection[] = [
  {
    label: msg('papeis.sections.role.label'),
    description: msg('papeis.sections.role.description'),
    grid: '2',
    fields: [
      {
        name: 'name',
        label: msg('papeis.fields.name'),
        type: 'text',
        placeholder: msg('papeis.fields.namePlaceholder'),
        required: true,
        focus: true,
      },
      {
        name: 'code',
        label: msg('papeis.fields.code'),
        type: 'text',
        placeholder: msg('papeis.fields.codePlaceholder'),
        description: msg('papeis.fields.codeDescription'),
        required: true,
      },
      {
        name: 'description',
        label: msg('papeis.fields.description'),
        type: 'textarea',
        span: '2',
      },
    ],
  },
]

// ============================================================================
// 5. CRUD CONFIG — the role records. Their permissions are edited in the
// matrix tab (page.tsx); built-in roles are read-only everywhere.
// ============================================================================
export const papeisConfig: CrudConfig<Role, RoleFormData> = {
  module: {
    name: 'papeis',
    title: msg('papeis.title'),
    description: msg('papeis.description'),
    route: '/admin/papeis',
  },

  permissions: {
    create: 'roles.write',
    edit: 'roles.write',
    delete: 'roles.write',
  },

  list: {
    title: '',
    description: '',
    searchPlaceholder: msg('papeis.searchPlaceholder'),
    columns,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    serverSidePagination: true,
    infiniteScroll: true,
    defaultPageSize: 100,
    toolbar: { counterLabel: msg('papeis.counter') },
  },

  form: { sections: formSections, validation: validationSchema },

  query: { queryKey: ['papeis'], queryFn: rolesApi.list, staleTime: 30_000 },

  mutations: {
    create: {
      mutationFn: async (data) => ({ success: true, data: await rolesApi.create(data) }),
      invalidates: [['papeis'], ['papeis-matrix']],
    },
    update: {
      mutationFn: async ({ id, data }) => ({ success: true, data: await rolesApi.update(id, data) }),
      invalidates: [['papeis'], ['papeis-matrix']],
    },
    delete: {
      mutationFn: async ({ id }) => {
        await rolesApi.delete(id)
        return { success: true }
      },
      invalidates: [['papeis'], ['papeis-matrix']],
    },
    getForEdit: async (id) => {
      const r = await rolesApi.getById(id)
      return { name: r.name, code: r.code, description: r.description ?? '' }
    },
  },

  actionsConfig: {
    standard: {
      edit: {
        icon: getIcon('Pencil'),
        tooltip: msg('papeis.actions.edit'),
        visible: (row) => !row.system,
      },
      delete: {
        icon: getIcon('Trash2'),
        tooltip: msg('papeis.actions.delete'),
        visible: (row) => !row.system,
        confirmDialog: {
          title: (row) => msg('papeis.confirmDelete.title', { name: row.name }),
          description: msg('papeis.confirmDelete.description'),
          confirmText: msg('papeis.confirmDelete.confirmText'),
          cancelText: msg('papeis.confirmDelete.cancelText'),
          variant: 'destructive',
        },
      },
    },
  },

  dialogs: {
    edit: {
      // A hub tab: the urlParam names the module (the matrix tab shares the URL)
      urlParam: 'papel',
      title: msg('papeis.dialogs.edit.title'),
      headerConfig,
    },
    create: {
      urlParam: 'novo-papel',
      title: msg('papeis.dialogs.create.title'),
      description: msg('papeis.dialogs.create.description'),
      headerConfig: { ...headerConfig, title: msg('papeis.dialogs.create.title'), subtitle: undefined },
    },
  },
}
