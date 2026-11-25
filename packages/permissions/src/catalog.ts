/**
 * Permission catalog reconciliation: the permissions defined in code against
 * the rows of the `Permission` table. Pure — the caller applies the diff
 * (e.g. with Prisma, in a transaction).
 */

/** A permission as defined in code. `module`/`action` default to the two halves of `code`. */
export interface PermissionDefinition {
  /** `module.action`, e.g. `users.read` (split at the last dot) */
  code: string
  module?: string
  action?: string
  category?: string | null
  description?: string | null
}

/** A row of the `Permission` table (extra columns are fine). */
export interface PermissionRow {
  id: string
  code: string
  module?: string | null
  action?: string | null
  category?: string | null
  description?: string | null
}

/** A catalog entry with every column resolved — ready for `createMany`. */
export interface ResolvedPermission {
  code: string
  module: string
  action: string
  category: string | null
  description: string | null
}

export interface PermissionCatalogDiff {
  /** In code, not in the database */
  toCreate: ResolvedPermission[]
  /** In both, with a different `description` or `category` (values from code) */
  toUpdate: Array<ResolvedPermission & { id: string }>
  /** In the database, not in code (the rows given, untouched) */
  toDelete: PermissionRow[]
  /** In both, nothing to change (the rows given, untouched) */
  unchanged: PermissionRow[]
}

function resolve(def: PermissionDefinition): ResolvedPermission {
  const dot = def.code.lastIndexOf('.')
  const module = def.module ?? (dot > 0 ? def.code.slice(0, dot) : '')
  const action = def.action ?? (dot > 0 ? def.code.slice(dot + 1) : '')
  if (!module || !action) {
    throw new Error(
      `Permission "${def.code}": the code must read "module.action", or pass module and action`
    )
  }
  return {
    code: def.code,
    module,
    action,
    category: def.category ?? null,
    description: def.description ?? null
  }
}

/**
 * Compares the permission catalog defined in code with the rows in the
 * database, matching by `code`. Only `description` and `category` count as a
 * change: `module`/`action` follow from the code, so a row stored as `READ`
 * for `users.read` is not rewritten. Never mutates its inputs.
 *
 * Throws on a duplicate code in the catalog, or on a code it cannot split
 * into `module.action` without an explicit `module` and `action`.
 */
export function diffPermissionCatalog(
  catalog: readonly PermissionDefinition[],
  rows: readonly PermissionRow[]
): PermissionCatalogDiff {
  const inCode = new Map<string, ResolvedPermission>()
  for (const def of catalog) {
    if (inCode.has(def.code)) {
      throw new Error(`Duplicate permission code in the catalog: "${def.code}"`)
    }
    inCode.set(def.code, resolve(def))
  }

  const diff: PermissionCatalogDiff = { toCreate: [], toUpdate: [], toDelete: [], unchanged: [] }
  const inDb = new Set<string>()
  for (const row of rows) {
    inDb.add(row.code)
    const wanted = inCode.get(row.code)
    if (!wanted) diff.toDelete.push(row)
    else if (
      wanted.description !== (row.description ?? null) ||
      wanted.category !== (row.category ?? null)
    ) {
      diff.toUpdate.push({ id: row.id, ...wanted })
    } else diff.unchanged.push(row)
  }
  for (const [code, wanted] of inCode) {
    if (!inDb.has(code)) diff.toCreate.push(wanted)
  }
  return diff
}
