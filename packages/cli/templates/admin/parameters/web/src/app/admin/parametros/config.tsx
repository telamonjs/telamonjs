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
import {
  parametersApi,
  type Parameter,
  type ParameterInput,
  type ParameterType,
} from '@/lib/api/parameters-client'

const TYPES: ParameterType[] = ['STRING', 'NUMBER', 'BOOLEAN', 'JSON']

// AdminForm's FormData submit path sends booleans as 'true'/'false' strings.
const bool = z.preprocess((v) => (typeof v === 'string' ? v === 'true' : v), z.boolean())

// ============================================================================
// 1. VALIDATION SCHEMA — one value field per type (only the one matching
// `type` is shown and submitted); the API checks the value parses.
// ============================================================================
export const validationSchema = z.object({
  key: z.string().regex(/^[A-Za-z0-9_.-]+$/),
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']),
  valueText: z.string().optional(),
  valueNumber: z.coerce.number().optional(),
  valueBoolean: bool.optional(),
  valueJson: z.string().optional(),
  group: z.string().optional(),
  description: z.string().optional(),
  public: bool.default(false),
})

export type ParameterFormData = z.infer<typeof validationSchema>

/** Form values → API body: the value field of the chosen type becomes `value`. */
function toInput(data: Partial<ParameterFormData>): Partial<ParameterInput> {
  const { valueText, valueNumber, valueBoolean, valueJson, ...rest } = data
  const value =
    data.type === 'NUMBER'
      ? String(valueNumber ?? '')
      : data.type === 'BOOLEAN'
        ? String(valueBoolean ?? false)
        : data.type === 'JSON'
          ? (valueJson ?? '')
          : (valueText ?? '')
  return { ...rest, value, group: rest.group || null, description: rest.description || null }
}

// ============================================================================
// 2. HEADER CONFIG (edit/create dialogs)
// ============================================================================
const headerConfig: DialogHeaderConfig<Parameter> = {
  icon: 'Settings',
  iconColor: 'slate',
  title: (p) => p.key,
  subtitle: (p) => p.group ?? '',
  gradient: 'from-slate-50 to-gray-50',
}

// ============================================================================
// 3. COLUMNS
// ============================================================================
export const columns: CrudColumnDef<Parameter>[] = [
  {
    header: msg('parametros.columns.key'),
    accessorKey: 'key',
    cell: ({ row }) => (
      <div>
        <div className='font-mono text-sm font-medium'>{row.original.key}</div>
        <div className='text-xs text-muted-foreground'>{row.original.description}</div>
      </div>
    ),
  },
  {
    header: msg('parametros.columns.value'),
    accessorKey: 'value',
    enableSorting: false,
    cell: ({ row }) => (
      <span className='line-clamp-2 max-w-xs break-all font-mono text-xs'>{row.original.value}</span>
    ),
  },
  {
    header: msg('parametros.columns.type'),
    accessorKey: 'type',
    cell: ({ row }) => (
      <Badge variant='outline'>
        <Msg k={`parametros.types.${row.original.type}`} />
      </Badge>
    ),
  },
  {
    header: msg('parametros.columns.group'),
    accessorKey: 'group',
  },
  {
    header: msg('parametros.columns.visibility'),
    accessorKey: 'public',
    cell: ({ row }) => (
      <Badge variant={row.original.public ? 'default' : 'secondary'}>
        <Msg k={row.original.public ? 'parametros.public' : 'parametros.private'} />
      </Badge>
    ),
  },
]

// ============================================================================
// 4. FORM SECTIONS
// ============================================================================
const isType = (type: ParameterType) => (values: Record<string, unknown>) => values.type === type

export const formSections: FormSection[] = [
  {
    label: msg('parametros.sections.parameter.label'),
    description: msg('parametros.sections.parameter.description'),
    grid: '2',
    fields: [
      {
        name: 'key',
        label: msg('parametros.fields.key'),
        type: 'text',
        placeholder: msg('parametros.fields.keyPlaceholder'),
        description: msg('parametros.fields.keyDescription'),
        required: true,
        focus: true,
      },
      {
        name: 'group',
        label: msg('parametros.fields.group'),
        type: 'text',
        placeholder: msg('parametros.fields.groupPlaceholder'),
      },
      {
        name: 'description',
        label: msg('parametros.fields.description'),
        type: 'textarea',
        rows: 2,
        span: '2',
      },
      {
        name: 'public',
        label: msg('parametros.fields.public'),
        type: 'boolean',
        description: msg('parametros.fields.publicDescription'),
        span: '2',
      },
    ],
  },
  {
    label: msg('parametros.sections.value.label'),
    description: msg('parametros.sections.value.description'),
    grid: '2',
    fields: [
      {
        name: 'type',
        label: msg('parametros.fields.type'),
        type: 'relationship',
        required: true,
        loadField: async () =>
          TYPES.map((type) => ({ value: type, label: msg(`parametros.types.${type}`) })),
        span: '2',
      },
      {
        name: 'valueText',
        label: msg('parametros.fields.value'),
        type: 'textarea',
        rows: 2,
        span: '2',
        visibleWhen: isType('STRING'),
      },
      {
        name: 'valueNumber',
        label: msg('parametros.fields.value'),
        type: 'number',
        span: '2',
        visibleWhen: isType('NUMBER'),
      },
      {
        name: 'valueBoolean',
        label: msg('parametros.fields.value'),
        type: 'boolean',
        span: '2',
        visibleWhen: isType('BOOLEAN'),
      },
      {
        name: 'valueJson',
        label: msg('parametros.fields.value'),
        type: 'textarea',
        rows: 6,
        description: msg('parametros.fields.valueJsonDescription'),
        span: '2',
        visibleWhen: isType('JSON'),
      },
    ],
  },
]

// ============================================================================
// 5. CRUD CONFIG
// ============================================================================
export const parametrosConfig: CrudConfig<Parameter, ParameterFormData> = {
  module: {
    name: 'parametros',
    title: msg('parametros.title'),
    description: msg('parametros.description'),
    route: '/admin/parametros',
  },

  permissions: {
    create: 'parameters.write',
    edit: 'parameters.write',
    delete: 'parameters.write',
  },

  list: {
    title: '',
    description: '',
    searchPlaceholder: msg('parametros.searchPlaceholder'),
    columns,
    defaultSortBy: 'key',
    defaultSortOrder: 'asc',
    serverSidePagination: true,
    infiniteScroll: true,
    defaultPageSize: 100,
    toolbar: { counterLabel: msg('parametros.counter') },
  },

  form: { sections: formSections, validation: validationSchema },

  query: { queryKey: ['parametros'], queryFn: parametersApi.list, staleTime: 30_000 },

  mutations: {
    create: {
      mutationFn: async (data) => ({
        success: true,
        data: await parametersApi.create(toInput(data) as ParameterInput),
      }),
      invalidates: [['parametros']],
    },
    update: {
      mutationFn: async ({ id, data }) => ({
        success: true,
        data: await parametersApi.update(id, toInput(data)),
      }),
      invalidates: [['parametros']],
    },
    delete: {
      mutationFn: async ({ id }) => {
        await parametersApi.delete(id)
        return { success: true }
      },
      invalidates: [['parametros']],
    },
    getForEdit: async (id) => {
      const p = await parametersApi.getById(id)
      return {
        key: p.key,
        type: p.type,
        valueText: p.type === 'STRING' ? p.value : '',
        valueNumber: p.type === 'NUMBER' ? Number(p.value) : undefined,
        valueBoolean: p.type === 'BOOLEAN' ? p.value === 'true' : false,
        valueJson: p.type === 'JSON' ? p.value : '',
        group: p.group ?? '',
        description: p.description ?? '',
        public: p.public,
      }
    },
  },

  actionsConfig: {
    standard: {
      edit: { icon: getIcon('Pencil'), tooltip: msg('parametros.actions.edit') },
      delete: {
        icon: getIcon('Trash2'),
        tooltip: msg('parametros.actions.delete'),
        confirmDialog: {
          title: (row) => msg('parametros.confirmDelete.title', { name: row.key }),
          description: msg('parametros.confirmDelete.description'),
          confirmText: msg('parametros.confirmDelete.confirmText'),
          cancelText: msg('parametros.confirmDelete.cancelText'),
          variant: 'destructive',
        },
      },
    },
  },

  dialogs: {
    edit: {
      urlParam: 'edit',
      title: msg('parametros.dialogs.edit.title'),
      headerConfig,
    },
    create: {
      urlParam: 'create',
      title: msg('parametros.dialogs.create.title'),
      description: msg('parametros.dialogs.create.description'),
      headerConfig: { ...headerConfig, title: msg('parametros.dialogs.create.title'), subtitle: undefined },
      defaultValues: { type: 'STRING', public: false },
    },
  },
}
