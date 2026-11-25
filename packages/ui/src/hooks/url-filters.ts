/**
 * Pure half of `useUrlFilters`: read the URL, build the chip text and work out
 * what to write. The hook (`use-url-filters.tsx`) wires this to `useUrlSync`
 * and draws the "Filters" panel. Internal — the barrel exports only the types.
 */
import type { ComponentType, ReactNode } from 'react'
import type { I18nText } from '../i18n/msg'
import type { RichSelectorItem } from '../components/selectors/RichSelector'

interface UrlFilterBase {
  /** URL query key, unique on the page (two lists on one page need different params). */
  param: string
  /** Key in `values`, i.e. what the API receives. Default: `param`. */
  apiKey?: string
  label: I18nText
}

/** One choice of a local `'options'` filter. */
export interface UrlFilterOption {
  value: string
  label: I18nText
}

/** Context handed to a remote `'options'` loader. */
export interface UrlFilterLoadContext {
  /** Value of the `dependsOn` filter (URL, else `fixed`); `null` without one. */
  parent: string | null
  /** Current selection: return these items too, so their labels can be shown. */
  selected: string[]
  signal: AbortSignal
}

interface UrlFilterOptionsCommon extends UrlFilterBase {
  kind: 'options'
  /** `param` of the parent filter. Changing or removing the parent clears this one (and its own dependents). */
  dependsOn?: string
  /** Without a parent value the selector is disabled and shows `parentPlaceholder`. */
  requireParent?: boolean
  parentPlaceholder?: I18nText
  /**
   * Value when the param is absent. It is shown as a chip: an invisible default
   * would make the list look complete.
   */
  defaultValue?: string
  /** Written when the default's chip is removed (e.g. `ALL`, a value the API ignores). */
  noDefaultValue?: string
  /** "No filter" text of the selector. Default: "All". */
  allLabel?: I18nText
  icon?: ComponentType<{ className?: string }>
  searchPlaceholder?: I18nText
  emptyLabel?: I18nText
  renderItem?: (item: RichSelectorItem<string>, state: { selected: boolean }) => ReactNode
  /** Chip text of a remote value. Default: the item's `label`. */
  chipLabel?: (item: RichSelectorItem<string>) => string
}

/** Fixed list, searched in the browser. A URL value outside it is ignored. */
export interface UrlFilterLocalOptionsDef extends UrlFilterOptionsCommon {
  options: readonly UrlFilterOption[]
  load?: never
  queryKey?: never
}

/** Searched on the server. Any URL value is kept; its label comes from `load('', { selected: [value] })`. */
export interface UrlFilterRemoteOptionsDef extends UrlFilterOptionsCommon {
  load: (search: string, context: UrlFilterLoadContext) => Promise<RichSelectorItem<string>[]>
  /** Identifies the list (the parent value is appended). */
  queryKey: readonly unknown[]
  options?: never
}

export type UrlFilterOptionsDef = UrlFilterLocalOptionsDef | UrlFilterRemoteOptionsDef

/** Date range, `YYYY-MM-DD` only (anything else in the URL is ignored). */
export interface UrlFilterDateRangeDef extends UrlFilterBase {
  kind: 'dateRange'
  /** Default `${param}From`. */
  fromParam?: string
  /** Default `${param}To`. */
  toParam?: string
  /** Default `${apiKey}From`. */
  apiFrom?: string
  /** Default `${apiKey}To`. */
  apiTo?: string
}

/** Free text, written on Enter or blur. */
export interface UrlFilterTextDef extends UrlFilterBase {
  kind: 'text'
  placeholder?: I18nText
}

export type UrlFilterDef = UrlFilterOptionsDef | UrlFilterDateRangeDef | UrlFilterTextDef

/** A filter with a value. For `dateRange`, `value` is the start and `to` the end (either may be `''`). */
export interface ActiveUrlFilter {
  def: UrlFilterDef
  value: string
  to?: string
}

export const filterApiKey = (def: UrlFilterDef): string => def.apiKey ?? def.param
const fromParam = (def: UrlFilterDateRangeDef) => def.fromParam ?? `${def.param}From`
const toParam = (def: UrlFilterDateRangeDef) => def.toParam ?? `${def.param}To`

/** URL keys of a filter (a date range uses two). */
export const filterParams = (def: UrlFilterDef): string[] =>
  def.kind === 'dateRange' ? [fromParam(def), toParam(def)] : [def.param]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const isoOrEmpty = (v: string | null) => (v && ISO_DATE.test(v) ? v : '')

/**
 * Effective value of each filter. An option outside a local list and a malformed
 * date are dropped, so a hand-edited URL never reaches the API as a 400.
 * `values` is `{ apiKey: value }`.
 */
export function readUrlFilters(
  defs: readonly UrlFilterDef[],
  getParam: (param: string) => string | null
): { values: Record<string, string>; active: ActiveUrlFilter[] } {
  const values: Record<string, string> = {}
  const active: ActiveUrlFilter[] = []
  for (const def of defs) {
    if (def.kind === 'dateRange') {
      const from = isoOrEmpty(getParam(fromParam(def)))
      const to = isoOrEmpty(getParam(toParam(def)))
      if (from) values[def.apiFrom ?? `${filterApiKey(def)}From`] = from
      if (to) values[def.apiTo ?? `${filterApiKey(def)}To`] = to
      if (from || to) active.push({ def, value: from, to })
      continue
    }
    const raw = getParam(def.param)?.trim() ?? ''
    const value =
      def.kind === 'options'
        ? (def.options ? def.options.some(o => o.value === raw) : raw)
          ? raw
          : (def.defaultValue ?? '')
        : raw
    if (!value) continue
    values[filterApiKey(def)] = value
    active.push({ def, value })
  }
  return { values, active }
}

/** `param` of every filter that depends on this one, directly or not (project → goal → step). */
export function dependentsOf(defs: readonly UrlFilterDef[], param: string): string[] {
  const direct = defs
    .filter(d => d.kind === 'options' && d.dependsOn === param)
    .map(d => d.param)
  return direct.flatMap(p => [p, ...dependentsOf(defs, p)])
}

/**
 * What to write when a filter changes. Empty (or the default itself) removes the
 * param; changing a parent clears its dependents. For a date range, `value` is
 * the start and `to` the end.
 */
export function paramsOnChange(
  defs: readonly UrlFilterDef[],
  def: UrlFilterDef,
  value: string | null,
  to?: string | null
): Record<string, string | null> {
  if (def.kind === 'dateRange')
    return { [fromParam(def)]: value || null, [toParam(def)]: to || null }
  const clean = value?.trim() || null
  const own = def.kind === 'options' && clean === def.defaultValue ? null : clean
  const dependents = dependentsOf(defs, def.param).map(p => [p, null] as const)
  return { ...Object.fromEntries(dependents), [def.param]: own }
}

/** Removing a chip: the default becomes `noDefaultValue` (or it would come back); anything else leaves the URL. */
export function paramsOnRemove(
  defs: readonly UrlFilterDef[],
  active: ActiveUrlFilter
): Record<string, string | null> {
  const { def } = active
  if (def.kind === 'options' && def.defaultValue && active.value === def.defaultValue)
    return {
      ...Object.fromEntries(dependentsOf(defs, def.param).map(p => [p, null])),
      [def.param]: def.noDefaultValue ?? null,
    }
  return paramsOnChange(defs, def, null, null)
}

/** "Clear filters": one write with every key (two writes in a row overwrite each other). */
export function paramsOnClear(defs: readonly UrlFilterDef[]): Record<string, null> {
  return Object.fromEntries(defs.flatMap(filterParams).map(p => [p, null]))
}

/**
 * Parent value of a dependent filter: the panel's (URL) or, when a scope took the
 * parent out of the panel, the one it fixes (`fixed`, keyed by the parent `param`).
 */
export function parentValue(
  def: UrlFilterDef,
  active: readonly ActiveUrlFilter[],
  fixed: Readonly<Record<string, unknown>> = {}
): string | null {
  if (def.kind !== 'options' || !def.dependsOn) return null
  const pinned = fixed[def.dependsOn]
  return (
    active.find(a => a.def.param === def.dependsOn)?.value ??
    (typeof pinned === 'string' && pinned ? pinned : null)
  )
}

/** Calendar `Date` → `YYYY-MM-DD` in local time (`toISOString` would go back a day at night). */
export function isoFromDate(d: Date | undefined): string | null {
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** `YYYY-MM-DD` → local midnight `Date`, for the calendar. */
export function dateFromIso(iso: string | undefined): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export interface ChipTextDeps {
  /** Resolved filter label. */
  label: string
  /** Resolves an option label (local options). */
  text: (value: I18nText) => string
  /** Label of a remote value; `undefined` while it loads. */
  remoteLabel?: string
  formatDate: (iso: string) => string
  since: (date: string) => string
  until: (date: string) => string
}

/** Chip text: "Status: Open", "Customer: ACME", "Period: 02/01/2026 – 02/10/2026". */
export function chipText(active: ActiveUrlFilter, deps: ChipTextDeps): string {
  const { def, value, to } = active
  const { label, formatDate } = deps
  switch (def.kind) {
    case 'options': {
      if (!def.options) return `${label}: ${deps.remoteLabel ?? '…'}`
      const option = def.options.find(o => o.value === value)
      return `${label}: ${option ? deps.text(option.label) : value}`
    }
    case 'dateRange':
      if (value && to) return `${label}: ${formatDate(value)} – ${formatDate(to)}`
      return value
        ? `${label}: ${deps.since(formatDate(value))}`
        : `${label}: ${deps.until(formatDate(to ?? ''))}`
    case 'text':
      return `${label}: ${value}`
  }
}
