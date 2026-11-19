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
import { formatDate } from '@/lib/utils'
import UsuarioDetail from './_components/UsuarioDetail'

// ============================================================================
// 1. VALIDATION SCHEMA
// ============================================================================
export const validationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  // Required on create, optional on edit (blank keeps the current password) --
  // enforced server-side in the API route, not here.
  password: z
    .string()
    .min(5, 'Senha deve ter no mínimo 5 caracteres')
    .optional()
    .or(z.literal('')),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  // AdminForm's FormData submit path serializes booleans as the literal
  // strings 'true'/'false' -- z.coerce.boolean() would treat ANY non-empty
  // string (including 'false') as true, so coerce explicitly instead.
  ativo: z.preprocess((v) => (typeof v === 'string' ? v === 'true' : v), z.boolean()).default(true),
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
    field: 'ativo',
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
    header: msg('usuarios.columns.role'),
    accessorKey: 'role',
    cell: ({ row }) => (
      <Badge variant={row.original.role === 'ADMIN' ? 'default' : 'secondary'}>
        <Msg k={row.original.role === 'ADMIN' ? 'usuarios.roleAdmin' : 'usuarios.roleUser'} />
      </Badge>
    ),
  },
  {
    header: msg('usuarios.columns.status'),
    accessorKey: 'ativo',
    cell: ({ row }) =>
      row.original.ativo ? (
        <Badge variant='default' className='bg-green-600'>
          <Msg k='usuarios.statusActive' />
        </Badge>
      ) : (
        <Badge variant='secondary'>
          <Msg k='usuarios.statusInactive' />
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
        name: 'role',
        label: msg('usuarios.fields.role'),
        type: 'relationship',
        required: true,
        // loadField options are domain values, not chrome text -- I18nText resolution
        // doesn't reach `loadField` (it runs outside the config-resolution boundary).
        loadField: async () => [
          { value: 'USER', label: 'Usuário' },
          { value: 'ADMIN', label: 'Administrador' },
        ],
      },
      {
        name: 'ativo',
        label: msg('usuarios.fields.ativo'),
        type: 'boolean',
        description: msg('usuarios.fields.ativoDescription'),
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
    toolbar: {
      counterLabel: (count: number) => (count === 1 ? 'usuário' : 'usuários'),
    },
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
    delete: {
      mutationFn: async ({ id }) => {
        await usuariosApi.delete(id)
        return { success: true }
      },
      invalidates: [['usuarios']],
    },
    getForEdit: async (id) => {
      const u = await usuariosApi.getById(id)
      return { name: u.name ?? '', email: u.email, password: '', role: u.role, ativo: u.ativo }
    },
    getForView: usuariosApi.getById,
  },

  actionsConfig: {
    standard: {
      view: { icon: getIcon('Eye'), tooltip: msg('usuarios.actions.view') },
      edit: { icon: getIcon('Pencil'), tooltip: msg('usuarios.actions.edit') },
      delete: {
        icon: getIcon('Trash2'),
        tooltip: msg('usuarios.actions.delete'),
        confirmDialog: {
          // Per-row title: the function form returns I18nText, so msg() takes the row values
          title: (row) => msg('usuarios.confirmDelete.title', { name: row.name ?? row.email }),
          description: msg('usuarios.confirmDelete.description'),
          confirmText: msg('usuarios.confirmDelete.confirmText'),
          cancelText: msg('usuarios.confirmDelete.cancelText'),
          variant: 'destructive',
        },
      },
    },
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
      defaultValues: { ativo: true, role: 'USER' },
    },
  },
}
