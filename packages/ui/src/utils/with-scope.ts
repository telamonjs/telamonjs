import type { QueryKey } from '@tanstack/react-query'
import type { CrudConfig, MutationConfig } from '../types/crud'
import type { PaginationParams } from '../types/pagination'

/**
 * Parent context for a child CRUD (e.g. a client's contacts tab).
 */
export interface CrudScope {
  /** Merged into the queryFn's params.filters and appended to the queryKey. null/undefined/'' values are dropped. */
  filters: Record<string, unknown>
  /**
   * Fixed context values (e.g. the parent's clienteId): removed from the form (create AND edit), from columns (by accessorKey OR id) and from toolbar filters; added to dialogs.create.defaultValues and injected into the create payload.
   * A key whose value is `undefined` = not provided: ignored entirely (field/column/filter stay, nothing is injected). `null` is a real locked value.
   */
  locked?: Record<string, unknown>
  /** Editable defaults: MERGED into dialogs.create.defaultValues (never replace the base config's defaults). A key whose value is `undefined` = not provided (the base default stays). */
  defaults?: Record<string, unknown>
  /** Extra queryKeys invalidated after create/update/delete. */
  invalidates?: QueryKey[]
}

type Loose = Record<string, unknown>

/** `undefined` values = key not provided. */
const defined = (o: Loose | undefined): Loose =>
  Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined))

// a node is a field only with BOTH `name` and `type`: a locked field declared without `type` is not stripped
const isField = (node: unknown): node is { name: string } =>
  !!node && typeof node === 'object' && 'name' in node && 'type' in node

/** A row (`[]`) or a section (`{ fields: [] }`) with nothing left in it. */
const isEmpty = (node: unknown): boolean =>
  Array.isArray(node)
    ? node.length === 0
    : !!node &&
      typeof node === 'object' &&
      !isField(node) &&
      Array.isArray((node as Loose).fields) &&
      ((node as Loose).fields as unknown[]).length === 0

/**
 * Drops locked fields from any sections shape: section | section[], fields flat or in rows.
 * Sections and rows emptied by the strip are dropped too (already-empty ones are kept).
 */
function stripFields(node: unknown, locked: Set<string>): unknown {
  if (Array.isArray(node))
    return node
      .filter(n => !(isField(n) && locked.has(n.name)))
      .flatMap(n => {
        const out = stripFields(n, locked)
        return isEmpty(out) && !isEmpty(n) ? [] : [out]
      })
  // a field's own `fields` (CRUD sub-form) belongs to another entity: leave it alone
  if (node && typeof node === 'object' && !isField(node) && 'fields' in node)
    return { ...node, fields: stripFields((node as Loose).fields, locked) }
  return node
}

/**
 * Scopes a CrudConfig to a parent record: filters the listing, hides and
 * injects locked fields, merges create defaults and extra invalidations.
 * Pure — returns a new config, never mutates `config`.
 *
 * Note: `mutations.create.onSuccess/onError` receive the original `variables`, without the locked values.
 *
 * @example
 * ```ts
 * const contatosDoCliente = withScope(contatosConfig, {
 *   filters: { clienteId },
 *   locked: { clienteId },
 *   invalidates: [['clientes', clienteId]],
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- must accept every CrudConfig<T, TFormData> (see CrudConfigWithAnyForm)
export function withScope<C extends CrudConfig<any, any>>(
  config: C,
  scope: CrudScope
): C {
  const filters = Object.fromEntries(
    Object.entries(scope.filters).filter(
      ([, v]) => v !== null && v !== undefined && v !== ''
    )
  )
  const locked = defined(scope.locked)
  const lockedKeys = new Set(Object.keys(locked))
  const extraInvalidates = scope.invalidates ?? []

  const withInvalidates = (m: MutationConfig | undefined) =>
    m && { ...m, invalidates: [...(m.invalidates ?? []), ...extraInvalidates] }

  const create = withInvalidates(config.mutations.create)
  if (create) {
    const baseCreate = create.mutationFn
    create.mutationFn = (d: unknown) =>
      baseCreate({ ...(d as Loose), ...locked })
  }

  const dialogs = config.dialogs?.create
    ? {
        ...config.dialogs,
        create: {
          ...config.dialogs.create,
          defaultValues: {
            ...config.dialogs.create.defaultValues,
            ...defined(scope.defaults),
            ...locked,
          },
        },
      }
    : config.dialogs

  const toolbar = config.list.toolbar && {
    ...config.list.toolbar,
    filters: config.list.toolbar.filters?.filter(f => !lockedKeys.has(f.key)),
  }

  return {
    ...config,
    list: {
      ...config.list,
      columns: config.list.columns.filter(c => {
        const { accessorKey, id } = c as { accessorKey?: unknown; id?: unknown }
        return (
          !lockedKeys.has(String(accessorKey)) && !lockedKeys.has(String(id))
        )
      }),
      ...(toolbar && { toolbar }),
    },
    form: {
      ...config.form,
      sections: stripFields(config.form.sections, lockedKeys),
    },
    query: {
      ...config.query,
      queryKey: [...config.query.queryKey, filters],
      queryFn: (p: PaginationParams) =>
        config.query.queryFn({
          ...p,
          filters: { ...(p?.filters ?? {}), ...filters },
        }),
    },
    mutations: {
      ...config.mutations,
      ...(create && { create }),
      ...(config.mutations.update && {
        update: withInvalidates(config.mutations.update),
      }),
      ...(config.mutations.delete && {
        delete: withInvalidates(config.mutations.delete),
      }),
    },
    ...(dialogs && { dialogs }),
  } as C
}
