/**
 * CRUD Configuration Types
 *
 * @see apps/docs/content/docs/patterns/react-query.mdx for migration guide
 *
 * This module provides a unified configuration interface for CRUD operations,
 * consolidating all ListPage, Form, Query/Actions, and Dialogs configuration
 * into a single source of truth.
 *
 * React Query is the only supported data pattern.
 *
 * @example React Query (the only supported pattern):
 * ```typescript
 * 'use client'  // Required!
 *
 * import { parametrosApi } from '@/lib/api/parametros-client'
 *
 * export const parametrosConfig: CrudConfig<Parametro, ParametroFormData> = {
 *   module: {
 *     name: 'parametros',
 *     title: 'Parameters',
 *     description: 'Manage system parameters',
 *     route: '/admin/administracao/parametros'
 *   },
 *   list: {
 *     title: 'Parameters',
 *     description: 'List of system parameters',
 *     searchPlaceholder: 'Search parameters...',
 *     columns: [...],
 *     defaultSortBy: 'nome',
 *     defaultPageSize: 10,
 *     serverSidePagination: true
 *   },
 *   form: {
 *     sections: [...],
 *     validation: parametrosValidation
 *   },
 *   query: {
 *     queryKey: ['parametros'],
 *     queryFn: parametrosApi.list
 *   },
 *   mutations: {
 *     create: {
 *       mutationFn: parametrosApi.create,
 *       invalidates: [['parametros']]
 *     },
 *     update: {
 *       mutationFn: ({ id, data }) => parametrosApi.update(id, data),
 *       invalidates: [['parametros'], (id) => ['parametros', id]]
 *     },
 *     delete: {
 *       mutationFn: ({ id }) => parametrosApi.delete(id),
 *       invalidates: [['parametros']]
 *     }
 *   }
 * }
 * ```
 */

import type { ColumnDef, HeaderContext } from '@tanstack/react-table'
import type { z } from 'zod'
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
} from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ActionConfig, DataTableActionsConfig } from './actions'
import type { PaginationParams, PaginatedResponse } from './pagination'
import type { FormSection } from './forms/admin-form'
import type { DialogHeaderConfig } from './dialog-header'
import type { DialogSize, DialogHeight } from '../utils/spacing'
import type { FormActionResult } from '../components/forms/AdminForm'
import type { ViewPortalSection } from '../components/dialog/view-portal-dialog'
import type { I18nText } from '../i18n/msg'

/**
 * Distributes `Omit` over a union so each member keeps its own discriminant
 * instead of collapsing into the union of all members' keys.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

/**
 * `ColumnDef` with a translatable `header`: a literal, a `MessageRef` (`msg('users.name')`,
 * resolved via `useText()` at the ListPage boundary — see `resolveColumns()`), or the
 * original render function (receives the raw `HeaderContext`, untouched).
 */
export type CrudColumnDef<T> = DistributiveOmit<ColumnDef<T>, 'header'> & {
  header?: I18nText | ((ctx: HeaderContext<T, unknown>) => ReactNode)
  /**
   * `meta.label`: plain-text name of the column where a header FUNCTION cannot be
   * rendered — CSV/Excel/PDF export, column selector, filters panel, mobile card. Without it
   * those places fall back to `column.id`. Ignored when `header` is a string/`msg()`.
   */
  meta?: ColumnDef<T>['meta'] & {
    label?: I18nText
    /**
     * Only in the export (CSV/Excel/PDF), never in the table: keeps
     * the export complete when the table merges fields into one cell (e.g.
     * cliente + CNPJ).
     */
    exportOnly?: boolean
  }
}

/**
 * Module metadata for identification and routing
 */
export interface ModuleMetadata {
  /** Unique module identifier (e.g., 'parametros', 'produtos') */
  name: string
  /** Human-readable module title */
  title: I18nText
  /** Module description for UI */
  description: I18nText
  /** Base route for the module */
  route: string
}

/**
 * Filter option for the toolbar
 */
export interface ToolbarFilterOption {
  value: string
  label: I18nText
  /** Dot color class (e.g. 'bg-green-500') — renders colored dot before label */
  dot?: string
  /** CSS class applied when this option is active */
  activeClass?: string
  /**
   * Less used option: not a button in the toolbar; listed in the "Filters"
   * panel (and shown as a removable chip when active)
   */
  more?: boolean
}

/**
 * Declarative filter for the toolbar
 * Rendered as button group (FilterButtons pattern)
 */
export interface ToolbarFilterConfig {
  /** Key that becomes the query param (e.g. 'ativo', 'status') */
  key: string
  /** Label for accessibility */
  label: I18nText
  /** Filter options */
  options: ToolbarFilterOption[]
  /**
   * Initial value (default: first option). With `allValue` set it applies even
   * when it is the first option.
   */
  defaultValue?: string
  /**
   * The option value that means "no filter" (dropped from the query, shown when
   * nothing is selected). Set it and the first option is an ordinary option and
   * `'todos'`/`'all'` are ordinary values. Without it, the first option is the
   * "all" choice and `''`/`'todos'`/`'all'` mean "no filter".
   */
  allValue?: string
  /** Custom className */
  className?: string
  /** Display mode: 'buttons' (ButtonGroup) or 'select' (compact dropdown). Default: 'buttons' */
  displayMode?: 'buttons' | 'select'
}

/**
 * Toolbar config for embedded ListPage
 */
export interface ToolbarConfig {
  /** Declarative Select filters */
  filters?: ToolbarFilterConfig[]
  /**
   * Show the search field (default: true). Turn it off when selectors in
   * `toolbarPrepend` or `filters` replace it.
   */
  showSearch?: boolean
  /** Show counter (default: true) */
  showCounter?: boolean
  /**
   * Counter label (default: localized "{count} results").
   * - string / function → rendered as `"{n} {label}"` (legacy).
   * - MessageRef → if its message uses `{count}` (ICU plural, e.g.
   *   `{count, plural, one {# produto} other {# produtos}}`), `count` is injected into `values` and the
   *   message renders on its own; otherwise it keeps the `"{n} {label}"` prefix.
   */
  counterLabel?: I18nText | ((count: number) => string)
  /** Show refresh (default: true) */
  showRefresh?: boolean
  /**
   * Export + Refresh in one "⋯" menu instead of two buttons (less crowded
   * toolbar)
   */
  actionsMenu?: boolean
}

/**
 * List page configuration
 */
export interface ListConfig<T> {
  /** Page title */
  title: I18nText
  /** Page description/subtitle */
  description: I18nText
  /** Search input placeholder */
  searchPlaceholder?: I18nText
  /**
   * Empty-state title for a list with no rows. Applies only when no search/filter is active
   * (an active search keeps the localized "no results" text). Works for DataTable and InfiniteList.
   * Default: localized "No items found". Set it for lists without creation, where the default
   * invites adding an item.
   */
  emptyTitle?: I18nText
  /** Empty-state description; same rules as `emptyTitle`. Default: "Start by adding a new item". */
  emptyDescription?: I18nText
  /** Table columns definition */
  columns: CrudColumnDef<T>[]
  /** Default sort field */
  defaultSortBy?: string
  /** Default sort order (default: 'asc') */
  defaultSortOrder?: 'asc' | 'desc'
  /** Default page size */
  defaultPageSize?: number
  /** Enable server-side pagination */
  serverSidePagination?: boolean
  /** Enable export functionality */
  enableExport?: boolean
  /** Export filename */
  exportFilename?: string
  /** Toolbar config for embedded mode */
  toolbar?: ToolbarConfig
  /**
   * Paginated mode (`infiniteScroll: false`) without `dialogs.view`: a row click navigates to
   * `${pathname}/${id}` by default. `false` disables it (DataTable `rowClickNavigation`).
   */
  rowClickNavigation?: boolean
  /**
   * Use infinite scroll + virtualisation instead of paginated DataTable.
   *
   * **Default: `true`** (infinite scroll is the default for all ListPage instances,
   * both embedded and standalone).
   *
   * Set `false` to opt-out and use the classic DataTable with server-side
   * pagination. Opt-out is appropriate when:
   * - The backend does not return `PaginatedResponse` with `page`/`totalPages`
   * - The UI needs "jump to page N" navigation
   * - The list is short and classic pagination is preferred
   *
   * **Requirement when using infinite (default):** `query.queryFn` MUST return
   * `PaginatedResponse<T>` with `page`, `totalPages`, and `total` fields so
   * `useInfiniteListQuery` can determine when to stop fetching pages.
   *
   * @default true
   */
  infiniteScroll?: boolean
}

/**
 * Form configuration (shared by create/edit/dialogs)
 */
export interface FormConfig {
  /** Form sections with fields */
  sections: FormSection | FormSection[]
  /** Zod validation schema (optional: without it the form submits unvalidated) */
  validation?: z.ZodSchema
  /** Use tabs for sections (default: false for create, true for edit) */
  useTabs?: boolean
  /**
   * Callback fired when any form field value changes.
   * Use to auto-fill fields based on other field selections.
   *
   * @param params.field - Name of the field that changed
   * @param params.value - New value of the field
   * @param params.values - All current form values
   * @param params.setValue - Function to set another field's value
   *
   * @example
   * ```typescript
   * onFieldChange: async ({ field, value, setValue }) => {
   *   if (field === 'tipoId' && value) {
   *     const tipo = await tipoApi.getById(value as string)
   *     setValue('consumo', tipo.consumo)
   *   }
   * }
   * ```
   */
  onFieldChange?: (params: {
    field: string
    value: unknown
    values: Record<string, unknown>
    setValue: (name: string, value: unknown) => void
  }) => void | Promise<void>
}

/**
 * React Query configuration for data fetching
 */
export interface QueryConfig<T> {
  /** Query key for React Query */
  queryKey: QueryKey
  /** Query function that returns paginated data */
  queryFn: (params: PaginationParams) => Promise<PaginatedResponse<T>>
  /** Stale time in milliseconds (default: 5000) */
  staleTime?: number
  /** Refetch interval in milliseconds (false to disable, default: false) */
  refetchInterval?: number | false
  /** Additional React Query options */
  options?: Omit<
    UseQueryOptions<PaginatedResponse<T>>,
    'queryKey' | 'queryFn' | 'staleTime' | 'refetchInterval'
  >
}

/**
 * Mutation configuration for a single operation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic defaults; `unknown` would break consumers that omit the type args or rely on bivariant mutationFn/callback inputs. Narrowing is a public-API change (requires a breaking-change review).
export interface MutationConfig<TInput = any, TOutput = any> {
  /** Mutation function */
  mutationFn: (input: TInput) => Promise<TOutput>
  /** Query keys to invalidate on success (supports dynamic keys with ID) */
  invalidates: (QueryKey | ((id?: string) => QueryKey))[]
  /** Optional success callback */
  onSuccess?: (data: TOutput, variables: TInput) => void
  /** Optional error callback */
  onError?: (error: Error, variables: TInput) => void
  /** Additional React Query options */
  options?: Omit<
    UseMutationOptions<TOutput, Error, TInput>,
    'mutationFn' | 'onSuccess' | 'onError'
  >
}

/**
 * React Query mutations configuration
 */
export interface MutationsConfig<T, TFormData = T> {
  /**
   * Create mutation. Optional — omit for a read-only module
   * (no stub required; the create dialog/button simply won't be wired).
   */
  create?: MutationConfig<
    TFormData,
    { success: boolean; message?: string; data?: T }
  >
  /**
   * Update mutation. Optional — omit for a read-only (or
   * create-only) module.
   */
  update?: MutationConfig<
    { id: string; data: Partial<TFormData> },
    { success: boolean; message?: string; data?: T }
  >
  /**
   * Delete mutation. Optional — omit for a module with no
   * delete action.
   */
  delete?: MutationConfig<
    { id: string },
    { success: boolean; message?: string }
  >
  /** Get record for editing (optional - can use query with ID) */
  getForEdit?: (id: string) => Promise<TFormData>
  /** Get record for viewing (optional - can use query with ID) */
  getForView?: (id: string) => Promise<T>
}

/**
 * Dialog configuration for in-page modals
 */
export interface DialogConfig<T> {
  /** Dialog title (I18nText or function that receives item) */
  title: I18nText | ((item: T) => string)
  /** Description/subtitle */
  description?: I18nText
  /**
   * Edit only: fields shown read-only (the record's parent, e.g. `faturaId` of
   * a payment — fix by deleting and creating under the right one). Create keeps
   * them editable
   */
  lockedFields?: readonly string[]
  /** Default values for form */
  defaultValues?: Partial<T>
  /**
   * Custom render function for dialog header.
   * When provided, replaces the default DialogHeader with custom content.
   * Use for rich headers with icons, badges, stats cards, etc.
   */
  renderHeader?: (item: T) => React.ReactNode
  /**
   * Declarative header configuration.
   * Alternative to renderHeader - provides a structured way to configure
   * dialog headers with icons, badges, and stats.
   *
   * When both headerConfig and renderHeader are provided, renderHeader takes precedence.
   *
   * @example
   * ```typescript
   * headerConfig: {
   *   icon: 'Settings',
   *   iconColor: 'purple',
   *   title: (p) => p.nome,
   *   subtitle: (p) => p.codigo,
   *   gradient: 'from-purple-50 to-indigo-50',
   *   badge: {
   *     field: 'api',
   *     variants: { true: 'default', false: 'secondary' },
   *     labels: { true: 'API', false: 'Sistema' }
   *   },
   *   stats: {
   *     columns: 4,
   *     items: [
   *       { label: 'Tipo', value: (p) => getTipo(p.valor), icon: 'FileType', color: 'blue' }
   *     ]
   *   }
   * }
   * ```
   */
  headerConfig?: DialogHeaderConfig<T>
  /** Custom render function for dialog content */
  renderContent?: (item: T) => React.ReactNode
  /** Use tabs for sections (default: true for edit and create dialogs) */
  useTabs?: boolean
  /**
   * Extra dialog className. it is merged OVER the `size` preset
   * (the app class wins conflicts such as `max-w-*`) and also reaches the
   * mobile Sheet, minus width/height utilities.
   */
  dialogClassName?: string
  /**
   * Dialog height. `'auto'` (default): content-sized, capped at 90vh.
   * `'full'`: fixed `h-[min(800px,85vh)]` on desktop with the body scrolling
   * inside; the mobile Sheet keeps its own height.
   * @default 'auto'
   */
  dialogHeight?: DialogHeight
  /**
   * Dialog size preset. When 'auto' (default), computes ideal size from form fields/sections.
   * @default 'auto'
   */
  size?: DialogSize
  /**
   * Query param name for deep-linking this dialog (view / edit / create).
   *
   * When set, ListPage keeps the dialog and the URL in **bidirectional** sync:
   * the dialog opens on load/deep-link, on client-side navigation and on browser
   * back/forward whenever the param is present. **Opening a dialog pushes a
   * history entry (`router.push`), so the browser Back button closes it** and
   * returns to the list; closing (X/ESC) uses `router.replace` (no history spam).
   * Other params (`?tab`, `?page`, `?sort`, filters) are preserved — never
   * clobbered.
   *
   * - `view` / `edit` carry the entity id: `?view=42`, `?edit=42`.
   * - `create` has no id, so it uses a presence sentinel: `?create=1`.
   * - If several dialog params somehow coexist, precedence is `edit > view >
   *   create` (only one dialog is ever open). In normal operation a single
   *   transition rewrites the params atomically, so only one is ever present.
   *
   * @example
   * ```typescript
   * dialogs: {
   *   view:   { title: 'Detalhes', urlParam: 'view',   renderContent },
   *   edit:   { title: 'Editar',   urlParam: 'edit' },
   *   create: { title: 'Novo',     urlParam: 'create' },
   * }
   * // /admin/cadastro?tab=produtos&view=42 → opens the view dialog for record 42
   * // /admin/cadastro?tab=produtos&edit=42 → opens the edit dialog for record 42
   * // /admin/cadastro?tab=produtos&create=1 → opens the create dialog
   * ```
   */
  urlParam?: string
  /**
   * Renders the view dialog as a `ViewPortalDialog` (grid launcher → rail,
   * optional inline per-section editing) instead of the plain `ViewDialog`,
   * while keeping every ListPage integration (urlParam sync, row-click,
   * `actionsConfig.standard.view` override, edit>view precedence).
   *
   * Mutually exclusive with `renderContent` — when both are set, `portal`
   * wins and a dev warning is logged.
   *
   * `validation` for section edits comes from `form.validation` (no separate
   * field here — one schema per module, same as create/edit).
   *
   * @example
   * ```typescript
   * dialogs: {
   *   view: {
   *     title: p => p.numero,
   *     portal: {
   *       sections: data => [
   *         { value: 'geral', label: 'Overview', icon: 'Info', content: <Geral data={data} /> },
   *       ],
   *     },
   *   },
   * }
   * ```
   */
  portal?: {
    /** Derives the portal sections from the fetched record. */
    sections: (data: T) => ViewPortalSection[]
    /** Section opened by default (skips the grid launcher). */
    defaultSection?: string
    /** Max grid columns at wide breakpoints — see `ContentPortalProps.columns`. */
    columns?: 3 | 4 | 5 | 6
    /**
     * Persists one section's edited values. Called with ONLY that section's field names;
     * `ctx` carries the record `id` and the fetched `item`.
     */
    onSaveSection?: (
      values: Record<string, unknown>,
      section: ViewPortalSection,
      ctx: { id: string; item: T }
    ) => Promise<FormActionResult>
  }
}

/**
 * Dialogs configuration (optional - for in-page modals)
 */
export interface DialogsConfig<T> {
  /** View dialog configuration */
  view?: DialogConfig<T>
  /** Edit dialog configuration */
  edit?: DialogConfig<T>
  /** Create dialog configuration */
  create?: DialogConfig<T>
}

/**
 * Page configuration (optional - for dedicated pages)
 */
export interface PagesConfig<T> {
  /** Create page configuration */
  create?: {
    title: I18nText
    description: I18nText
    submitText?: I18nText
    useTabs?: boolean
    defaultValues?: Partial<T>
  }
  /** Edit page configuration */
  edit?: {
    title: I18nText | ((item: T) => string)
    description?: I18nText
  }
  /** Detail page configuration */
  detail?: {
    title?: I18nText | ((item: T) => string)
    renderContent: (item: T) => React.ReactNode
  }
}

/**
 * Permission model of a CrudConfig. Each operation names the permission(s) it
 * needs (any of them, like an action's `permission`); an operation without
 * one stays allowed.
 *
 * Checked with `can` when set (bypass roles, wildcards: pass
 * `perm => checker.can(user, perm)` from `@telamonjs/permissions`), else against
 * `actionsConfig.userPermissions`; with neither, everything is allowed.
 */
export interface CrudPermissions {
  /** Permission checker; wins over `actionsConfig.userPermissions` */
  can?: (permission: string) => boolean
  /** The "New" button and the create dialog */
  create?: ActionConfig['permission']
  /** The row edit, the view dialog's Edit, the edit dialog and portal section saving */
  edit?: ActionConfig['permission']
  /** The row delete and the view dialog's Delete */
  delete?: ActionConfig['permission']
  /** The row view and the view dialog (row click included) */
  view?: ActionConfig['permission']
}

/**
 * Complete CRUD configuration
 *
 * This is the main interface that consolidates all CRUD-related configuration
 * into a single object. It replaces the need to pass multiple props to ListPage.
 *
 * Use `query` + `mutations` for all CRUD operations.
 *
 * @template T - The entity type (e.g., Parametro, Produto)
 * @template TFormData - The form data type (default: T)
 *
 * @example
 * React Query (required):
 * ```tsx
 * const config: CrudConfig<Fabricante, FabricanteFormData> = {
 *   query: {
 *     queryKey: ['fabricantes'],
 *     queryFn: fabricantesApi.list,
 *     staleTime: 5_000,
 *   },
 *   mutations: {
 *     create: {
 *       mutationFn: fabricantesApi.create,
 *       invalidates: ['fabricantes']
 *     },
 *     update: {
 *       mutationFn: fabricantesApi.update,
 *       invalidates: ['fabricantes', (id) => ['fabricantes', id]]
 *     },
 *     delete: {
 *       mutationFn: fabricantesApi.delete,
 *       invalidates: ['fabricantes']
 *     }
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public entrypoint generic default; consumers write `CrudConfig<User>` and may omit args. Changing the default to `unknown` is a public-API change (requires a breaking-change review).
export interface CrudConfig<T = any, TFormData = T> {
  /** Module metadata */
  module: ModuleMetadata

  /** List page configuration */
  list: ListConfig<T>

  /**
   * Form configuration (shared by create/edit/dialogs). Optional: a read-only
   * list omits it, and then no create or edit dialog is offered even when
   * `dialogs.create` / `dialogs.edit` are set.
   */
  form?: FormConfig

  /**
   * React Query configuration for data fetching
   * REQUIRED - Replaces Server Actions pattern
   */
  query: QueryConfig<T>

  /**
   * React Query mutations configuration
   * REQUIRED - Replaces Server Actions pattern
   */
  mutations: MutationsConfig<T, TFormData>

  /** Actions column configuration (view/edit/delete buttons). Set to false to hide the column entirely. */
  actionsConfig?: DataTableActionsConfig<T> | false

  /** In-page dialogs configuration (optional) */
  dialogs?: DialogsConfig<T>

  /** Dedicated pages configuration (optional) */
  pages?: PagesConfig<T>

  /**
   * Who may create, edit, delete and view. Gates the "New" button, the row
   * actions, the view dialog footer, the create/edit dialogs and portal
   * section saving. Omit it and nothing changes.
   */
  permissions?: CrudPermissions
}

/**
 * CrudConfig with the form-data side erased (existential).
 *
 * `TFormData` appears in both covariant (`getForEdit` return) and
 * contravariant (`mutationFn` input) positions, so no concrete type other
 * than `any` accepts every `CrudConfig<T, TFormData>`. This alias exists so
 * components that only consume the entity type (e.g. ListPage) can accept
 * any config without consumers having to thread the form-data generic
 * (`<ListPage<Entity> config={config} />` stays valid).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CrudConfigWithAnyForm<T> = CrudConfig<T, any>
