/**
 * Template for config.tsx -- full CrudConfig<T, TFormData> (React Query +
 * dialogs pattern: view/create/edit/delete all happen on the list).
 *
 * Structure mirrors the canonical reference:
 * packages/cli/templates/app/src/app/admin/usuarios/config.tsx
 * (do not diverge without updating that file first -- see
 * src/commands/generate/__tests__/crud-compile.test.ts, the drift guard).
 */
import { PrismaField } from '../utils/prisma-detector.js'
import { camelCase, capitalize } from '../utils/formatters.js'
import {
  crudFieldType,
  displayField,
  fieldPropName,
  formFields,
  isSensitive,
  zodFor,
} from '../utils/field-mapping.js'
import { modulePermissions } from './route-handlers.js'

export interface PageConfigOptions {
  name: string
  modelName: string
  fields: PrismaField[]
  /** App has i18n wired up (see messages-writer.ts `hasI18n`) -- emit `msg()` instead of literals. */
  i18n?: boolean
}

const ACTIVE_FLAGS = new Set(['ativo', 'active', 'enabled', 'isactive'])

export function generatePageConfig(options: PageConfigOptions): string {
  const { name, modelName, fields, i18n = false } = options
  const msgKey = (key: string) => `msg('${name}.${key}')`
  const Entity = capitalize(modelName)
  const apiVar = `${camelCase(name)}Api`
  const configVar = `${camelCase(name)}Config`
  const route = `/admin/${name}`
  const Title = capitalize(name)
  const { read, write } = modulePermissions(name)

  const editable = formFields(fields)
  // Credentials are stripped from every response (serialize() in route.ts) -- no column for them.
  const tableFields = fields.filter(f => f.showInTable && !f.isId && !isSensitive(f))
  const needsFormatDate = tableFields.some(f => f.type === 'DateTime')
  const label = displayField(fields)
  const labelExpr = (v: string) => (label ? `String(${v}.${label} ?? ${v}.id)` : `String(${v}.id)`)
  const activeFlag = fields.find(f => f.type === 'Boolean' && ACTIVE_FLAGS.has(f.name.toLowerCase()))
  const sortBy = tableFields.find(f => f.searchable)

  const badge = activeFlag
    ? `
  badge: {
    field: '${activeFlag.name}',
    variants: { true: 'default', false: 'secondary' },
    labels: { true: 'Ativo', false: 'Inativo' },
  },`
    : ''

  return `'use client'

import { z } from 'zod'
${i18n ? '' : `import type { ColumnDef } from '@tanstack/react-table'\n`}import type { CrudConfig, ${i18n ? 'CrudColumnDef, ' : ''}DialogHeaderConfig, FormSection } from '@telamonjs/ui'
import { getIcon } from '@/lib/icons'
${i18n ? `import { msg } from '@telamonjs/ui/i18n'\n` : ''}import { ${apiVar}, type ${Entity} } from '@/lib/api/${name}-client'
${needsFormatDate ? `import { formatDate } from '@/lib/utils'\n` : ''}import ${Entity}Detail from './_components/${Entity}Detail'

// ============================================================================
// 1. VALIDATION SCHEMA
// ============================================================================
export const validationSchema = z.object({
${editable.map(f => `  ${fieldPropName(f)}: ${zodFor(f)},`).join('\n')}
})

export type ${Entity}FormData = z.infer<typeof validationSchema>

// ============================================================================
// 2. HEADER CONFIG (view/edit/create dialogs)
// ============================================================================
const headerConfig: DialogHeaderConfig<${Entity}> = {
  icon: 'FileText',
  iconColor: 'blue',
  title: (item) => ${labelExpr('item')},
  gradient: 'from-blue-50 to-indigo-50',${badge}
}

// ============================================================================
// 3. COLUMNS
// ============================================================================
export const columns: ${i18n ? `CrudColumnDef<${Entity}>` : `ColumnDef<${Entity}>`}[] = [
${tableFields.map(f => generateColumn(f, name, i18n)).join('\n')}
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
${editable.map((f, i) => generateFormField(f, i === 0, name, i18n)).join('\n')}
    ],
  },
]

// ============================================================================
// 5. CRUD CONFIG
// ============================================================================
export const ${configVar}: CrudConfig<${Entity}, ${Entity}FormData> = {
  module: {
    name: '${name}',
    title: ${i18n ? msgKey('title') : `'${Title}'`},
    description: ${i18n ? msgKey('description') : `'Gerenciamento de ${name}'`},
    route: '${route}',
  },

  // Checked with the PermissionsProvider's can (LayoutProviders): a denied
  // operation loses its button, row action and dialog deep link. The Route
  // Handlers enforce the same codes.
  permissions: {
    view: '${read}',
    create: '${write}',
    edit: '${write}',
    delete: '${write}',
  },

  list: {
    // Empty: the shell breadcrumb already names the page; the list is content, not a header.
    title: '',
    description: '',
    searchPlaceholder: ${i18n ? msgKey('searchPlaceholder') : `'Buscar...'`},
    columns,${sortBy ? `\n    defaultSortBy: '${sortBy.name}',\n    defaultSortOrder: 'asc',` : ''}
    serverSidePagination: true,
    infiniteScroll: true,
    defaultPageSize: 100,
    toolbar: {
      counterLabel: (count: number) => (count === 1 ? 'registro' : 'registros'),
    },
  },

  form: { sections: formSections, validation: validationSchema },

  query: { queryKey: ['${name}'], queryFn: ${apiVar}.list, staleTime: 30_000 },

  mutations: {
    // mutationFn must resolve to { success, data? } -- ${apiVar}.* returns the
    // raw entity, so we shape the result here rather than in the client.
    create: {
      mutationFn: async (data) => ({ success: true, data: await ${apiVar}.create(data) }),
      invalidates: [['${name}']],
    },
    update: {
      mutationFn: async ({ id, data }) => ({
        success: true,
        data: await ${apiVar}.update(id, data),
      }),
      invalidates: [['${name}']],
    },
    delete: {
      mutationFn: async ({ id }) => {
        await ${apiVar}.delete(id)
        return { success: true }
      },
      invalidates: [['${name}']],
    },
    getForEdit: async (id) => {
      const item = await ${apiVar}.getById(id)
      return {
${editable.map(f => `        ${fieldPropName(f)}: ${editValue(f)},`).join('\n')}
      }
    },
    getForView: ${apiVar}.getById,
  },

  actionsConfig: {
    standard: {
      view: { icon: getIcon('Eye'), tooltip: 'Ver detalhes' },
      edit: { icon: getIcon('Pencil'), tooltip: 'Editar' },
      delete: {
        icon: getIcon('Trash2'),
        tooltip: 'Excluir',
        confirmDialog: {
          title: (row) => \`Excluir \${${labelExpr('row')}}?\`,
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
      title: ${i18n ? msgKey('dialogs.view.title') : `'Detalhes'`},
      headerConfig,
      renderContent: (item) => <${Entity}Detail item={item} />,
    },
    edit: {
      urlParam: 'edit',
      title: ${i18n ? msgKey('dialogs.edit.title') : `'Editar'`},
      description: ${i18n ? msgKey('dialogs.edit.description') : `'Atualize as informações do registro'`},
      headerConfig,
    },
    create: {
      urlParam: 'create',
      title: ${i18n ? msgKey('dialogs.create.title') : `'Novo Registro'`},
      description: ${i18n ? msgKey('dialogs.create.description') : `'Cadastre um novo registro'`},
      headerConfig: { ...headerConfig, title: ${i18n ? msgKey('dialogs.create.title') : `'Novo Registro'`}, subtitle: undefined, badge: undefined },
    },
  },
}
`
}

/** Entity -> form value for `getForEdit` (DateTime travels as ISO string, the form wants `Date`). */
function editValue(field: PrismaField): string {
  const prop = fieldPropName(field)
  // Credentials never come back from the API (see serialize() in route.ts) -- re-enter on edit.
  if (isSensitive(field)) return "''"
  if (field.type === 'DateTime') {
    return field.isRequired
      ? `new Date(item.${prop})`
      : `item.${prop} == null ? item.${prop} : new Date(item.${prop})`
  }
  return `item.${prop}`
}

function generateColumn(field: PrismaField, moduleName: string, i18n: boolean): string {
  const prop = fieldPropName(field)
  const header = i18n ? `msg('${moduleName}.fields.${prop}')` : `'${capitalize(field.name)}'`

  if (field.type === 'DateTime') {
    const v = `row.original.${prop}`
    const cell = field.isRequired ? `formatDate(${v})` : `(${v} ? formatDate(${v}) : null)`
    return `  { header: ${header}, accessorKey: '${prop}', cell: ({ row }) => ${cell} },`
  }
  if (field.type === 'Boolean') {
    return `  { header: ${header}, accessorKey: '${prop}', cell: ({ row }) => (row.original.${prop} ? 'Sim' : 'Não') },`
  }
  return `  { header: ${header}, accessorKey: '${prop}' },`
}

function generateFormField(field: PrismaField, focus: boolean, moduleName: string, i18n: boolean): string {
  const prop = fieldPropName(field)
  const label = i18n ? `msg('${moduleName}.fields.${prop}')` : `'${capitalize(field.name)}'`
  const type = crudFieldType(field)
  const required = field.isRequired ? ', required: true' : ''
  const focusAttr = focus ? ', focus: true' : ''

  if (field.enumValues) {
    const options = field.enumValues.map(v => `{ value: '${v}', label: '${v}' }`).join(', ')
    return `      { name: '${prop}', label: ${label}, type: 'relationship'${required}${focusAttr}, loadField: async () => [${options}] },`
  }
  if (field.isRelation) {
    return `      { name: '${prop}', label: ${label}, type: 'relationship'${required}${focusAttr}, loadField: async () => [] /* TODO: load ${field.relationType} options via API */ },`
  }
  return `      { name: '${prop}', label: ${label}, type: '${type}'${required}${focusAttr} },`
}
