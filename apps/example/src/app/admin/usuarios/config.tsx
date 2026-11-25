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
import { usuariosApi, type Usuario } from '@/lib/api/usuarios-client'
import { rolesApi } from '@/lib/api/roles-client'
import { formatDate } from '@/lib/utils'
import UsuarioDetail from './_components/UsuarioDetail'

// ============================================================================
// 1. VALIDATION SCHEMA
// ============================================================================
export const validationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  // Required on create, optional on edit (blank keeps the current password) --
  // enforced server-side in the API route, not here.
  password: z.string().min(5).optional().or(z.literal('')),
  // Multi-role: the user holds the union of the roles' permissions
  roleIds: z.array(z.string()).default([]),
  // AdminForm's FormData submit path serializes booleans as the literal
  // strings 'true'/'false' -- z.coerce.boolean() would treat ANY non-empty
  // string (including 'false') as true, so coerce explicitly instead.
  active: z.preprocess((v) => (typeof v === 'string' ? v === 'true' : v), z.boolean()).default(true),
})

export type UsuarioFormData = z.infer<typeof validationSchema>

// ============================================================================
// 2. HEADER CONFIG (view/edit/create dialogs)
// ============================================================================
const headerConfig: DialogHeaderConfig<Usuario> = {
  icon: 'User',
  iconColor: 'blue',
  title: (u) => u.name ?? u.email,
  subtitle: (u) => u.email,
  gradient: 'from-blue-50 to-indigo-50',
  badge: {
    field: 'active',
    variants: { true: 'default', false: 'secondary' },
    labels: { true: msg('usuarios.statusActive'), false: msg('usuarios.statusInactive') },
  },
}

// ============================================================================
// 3. COLUMNS
// ============================================================================
export const columns: CrudColumnDef<Usuario>[] = [
  {
    header: msg('usuarios.columns.name'),
    accessorKey: 'name',
    enableGlobalFilter: true,
    cell: ({ row }) => (
      <div>
        <div className='font-medium'>{row.original.name || <Msg k='usuarios.noName' />}</div>
        <div className='text-xs text-muted-foreground'>{row.original.email}</div>
      </div>
    ),
  },
  {
    header: msg('usuarios.columns.roles'),
    id: 'roles',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.roles.length ? (
        <div className='flex flex-wrap gap-1'>
          {row.original.roles.map((role) => (
            <Badge key={role.id} variant='outline'>
              {role.name}
            </Badge>
          ))}
        </div>
      ) : (
        <span className='text-sm text-muted-foreground'>
          <Msg k='usuarios.noRoles' />
        </span>
      ),
  },
  {
    header: msg('usuarios.columns.status'),
    accessorKey: 'active',
    cell: ({ row }) => (
      <Badge variant={row.original.active ? 'default' : 'secondary'}>
        <Msg k={row.original.active ? 'usuarios.statusActive' : 'usuarios.statusInactive'} />
      </Badge>
    ),
  },
  {
    header: msg('usuarios.columns.createdAt'),
    accessorKey: 'createdAt',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>{formatDate(row.original.createdAt)}</span>
    ),
  },
]

// ============================================================================
// 4. FORM SECTIONS (rendered inside the create/edit dialogs)
// ============================================================================
export const formSections: FormSection[] = [
  {
    label: msg('usuarios.sections.personal.label'),
    description: msg('usuarios.sections.personal.description'),
    grid: '2',
    fields: [
      {
        name: 'name',
        label: msg('usuarios.fields.name'),
        type: 'text',
        placeholder: msg('usuarios.fields.namePlaceholder'),
        required: true,
        focus: true,
      },
      {
        name: 'email',
        label: msg('usuarios.fields.email'),
        type: 'email',
        placeholder: msg('usuarios.fields.emailPlaceholder'),
        required: true,
      },
    ],
  },
  {
    label: msg('usuarios.sections.access.label'),
    description: msg('usuarios.sections.access.description'),
    grid: '2',
    fields: [
      {
        name: 'password',
        label: msg('usuarios.fields.password'),
        type: 'password',
        placeholder: msg('usuarios.fields.passwordPlaceholder'),
        description: msg('usuarios.fields.passwordDescription'),
      },
      {
        name: 'roleIds',
        label: msg('usuarios.fields.roles'),
        type: 'multiselect',
        description: msg('usuarios.fields.rolesDescription'),
        // Options are domain data (role names), not chrome text.
        loadField: async () => {
          const { data } = await rolesApi.list({ page: 1, pageSize: 100 })
          return data.map((role) => ({ value: role.id, label: role.name }))
        },
      },
      {
        name: 'active',
        label: msg('usuarios.fields.active'),
        type: 'boolean',
        description: msg('usuarios.fields.activeDescription'),
        // span = section grid -> full width (className 'w-full' is a no-op: CSS Grid)
        span: '2',
      },
    ],
  },
]

// ============================================================================
// 5. CRUD CONFIG
// ============================================================================
export const usuariosConfig: CrudConfig<Usuario, UsuarioFormData> = {
  module: {
    name: 'usuarios',
    title: msg('usuarios.title'),
    description: msg('usuarios.description'),
    route: '/admin/usuarios',
  },

  // Checked with the PermissionsProvider's `can` (LayoutProviders): a denied
  // operation loses its button, row action and dialog deep link. The Route
  // Handlers enforce the same codes.
  permissions: {
    view: 'users.read',
    create: 'users.write',
    edit: 'users.write',
  },

  list: {
    // Empty: the shell breadcrumb already names the page; the list is content, not a header.
    title: '',
    description: '',
    searchPlaceholder: msg('usuarios.searchPlaceholder'),
    columns,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    serverSidePagination: true,
    infiniteScroll: true,
    defaultPageSize: 100,
    // ICU plural: the message takes `{count}` (messages/*.json)
    toolbar: { counterLabel: msg('usuarios.counter') },
  },

  form: { sections: formSections, validation: validationSchema },

  query: { queryKey: ['usuarios'], queryFn: usuariosApi.list, staleTime: 30_000 },

  mutations: {
    // mutationFn must resolve to { success, data? } -- usuariosApi.* returns
    // the raw entity, so we shape the result here rather than in the client.
    create: {
      mutationFn: async (data) => ({ success: true, data: await usuariosApi.create(data) }),
      invalidates: [['usuarios']],
    },
    update: {
      mutationFn: async ({ id, data }) => {
        // Blank password means "keep the current one" -- don't send it.
        const { password, ...rest } = data
        return { success: true, data: await usuariosApi.update(id, password ? data : rest) }
      },
      invalidates: [['usuarios']],
    },
    // No delete: users are deactivated (row action below), never removed.
    getForEdit: async (id) => {
      const u = await usuariosApi.getById(id)
      return {
        name: u.name ?? '',
        email: u.email,
        password: '',
        roleIds: u.roles.map((role) => role.id),
        active: u.active,
      }
    },
    getForView: usuariosApi.getById,
  },

  actionsConfig: {
    standard: {
      view: { icon: getIcon('Eye'), tooltip: msg('usuarios.actions.view') },
      edit: { icon: getIcon('Pencil'), tooltip: msg('usuarios.actions.edit') },
    },
    // The list refetches after a custom handler succeeds.
    custom: [
      {
        id: 'deactivate',
        icon: getIcon('UserX'),
        tooltip: msg('usuarios.actions.deactivate'),
        permission: 'users.write',
        visible: (row) => row.active,
        handler: (row) => usuariosApi.update(row.id, { active: false }),
        successMessage: msg('usuarios.actions.deactivated'),
        confirmDialog: {
          title: (row) => msg('usuarios.confirmDeactivate.title', { name: row.name ?? row.email }),
          description: msg('usuarios.confirmDeactivate.description'),
          confirmText: msg('usuarios.confirmDeactivate.confirmText'),
          cancelText: msg('usuarios.confirmDeactivate.cancelText'),
          variant: 'destructive',
        },
      },
      {
        id: 'activate',
        icon: getIcon('UserCheck'),
        tooltip: msg('usuarios.actions.activate'),
        permission: 'users.write',
        visible: (row) => !row.active,
        handler: (row) => usuariosApi.update(row.id, { active: true }),
        successMessage: msg('usuarios.actions.activated'),
      },
    ],
  },

  dialogs: {
    view: {
      urlParam: 'view',
      title: msg('usuarios.dialogs.view.title'),
      headerConfig,
      renderContent: (item) => <UsuarioDetail usuario={item} />,
    },
    edit: {
      urlParam: 'edit',
      title: msg('usuarios.dialogs.edit.title'),
      description: msg('usuarios.dialogs.edit.description'),
      headerConfig,
    },
    create: {
      urlParam: 'create',
      title: msg('usuarios.dialogs.create.title'),
      description: msg('usuarios.dialogs.create.description'),
      headerConfig: {
        ...headerConfig,
        title: msg('usuarios.dialogs.create.title'),
        subtitle: undefined,
        badge: undefined,
      },
      defaultValues: { active: true, roleIds: [] },
    },
  },
}
