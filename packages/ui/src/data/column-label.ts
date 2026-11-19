/**
 * Plain-text label of a column for places that cannot render a header function
 * (CSV/Excel/PDF export, column selector, filters panel, mobile card):
 * a string `header`, else `meta.label`. `undefined` → caller's own fallback (usually `column.id`).
 *
 * `meta.label` accepts I18nText in `CrudColumnDef`; ListPage's `resolveColumns()` turns a
 * `msg()` into a string before the columns get here.
 */
export function getColumnLabel(def: { header?: unknown; meta?: unknown }): string | undefined {
  if (typeof def.header === 'string') return def.header
  const label = (def.meta as { label?: unknown } | undefined)?.label
  return typeof label === 'string' ? label : undefined
}
