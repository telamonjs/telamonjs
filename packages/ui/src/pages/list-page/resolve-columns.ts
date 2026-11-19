import type { ColumnDef } from '@tanstack/react-table'
import { isMessageRef } from '../../i18n/msg'
import type { CrudColumnDef } from '../../types/crud'
import type { useText } from '../../i18n/use-t'

/**
 * Turns `CrudColumnDef.header` (`I18nText | fn`) and `meta.label` into plain strings, once, before
 * the columns reach DataTable/InfiniteList — the `typeof header === 'string'` checks
 * in exportUtils/MobileCard/TableToolbar/ToolbarActionsMenu depend on this boundary.
 */
export function resolveColumns<T>(
  columns: CrudColumnDef<T>[],
  text: ReturnType<typeof useText>
): ColumnDef<T>[] {
  return columns.map(c => {
    let out = isMessageRef(c.header) ? { ...c, header: text(c.header) } : c
    // meta.label (I18nText) → string, for export/column selector/mobile card (see getColumnLabel)
    if (isMessageRef(c.meta?.label)) out = { ...out, meta: { ...c.meta, label: text(c.meta.label) } }
    return out
  }) as ColumnDef<T>[]
}
