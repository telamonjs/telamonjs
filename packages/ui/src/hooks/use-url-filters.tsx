'use client'

import { useId, useMemo, type ReactNode } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useFormatter } from 'next-intl'
import { useUrlSync } from './useUrlSync'
import { useTelamonjsT, useText } from '../i18n/use-t'
import type { RichSelectorItem } from '../components/selectors/RichSelector'
import { DateRangeFilter, OptionsFilter, TextFilter } from './url-filters-panel'
import { LIB_QUERY_META } from '../utils/query-meta'
import type { ActiveFilterChip } from '../pages/list-page/types'
import {
  chipText,
  filterApiKey,
  filterParams,
  paramsOnChange,
  paramsOnClear,
  paramsOnRemove,
  parentValue,
  readUrlFilters,
  type ActiveUrlFilter,
  type UrlFilterDef,
  type UrlFilterRemoteOptionsDef,
} from './url-filters'

export type {
  UrlFilterDef,
  UrlFilterOptionsDef,
  UrlFilterLocalOptionsDef,
  UrlFilterRemoteOptionsDef,
  UrlFilterDateRangeDef,
  UrlFilterTextDef,
  UrlFilterOption,
  UrlFilterLoadContext,
} from './url-filters'

export interface UseUrlFiltersOptions {
  /** `apiKey`s a scope already fixes (a list inside a portal): those filters leave the panel. */
  omit?: readonly string[]
  /** Values the scope fixes, keyed by `param`: the parent of a dependent filter whose parent left the panel. */
  fixed?: Readonly<Record<string, unknown>>
}

export interface UseUrlFiltersResult {
  /** `{ apiKey: value }` of the active filters (defaults included). Same object until a value changes. */
  values: Record<string, string>
  /** `ListPage` `filtersPanel`. */
  filtersPanel: ReactNode
  /** `ListPage` `activeFilters`. */
  activeFilters: ActiveFilterChip[]
  /** `ListPage` `onClearFilters`: one URL write with every param removed. */
  onClearFilters: () => void
  /** Every URL key of the panel, to clear them together with a param of your own. */
  params: string[]
}

type RemoteActive = ActiveUrlFilter & { def: UrlFilterRemoteOptionsDef }
const isRemote = (a: ActiveUrlFilter): a is RemoteActive => a.def.kind === 'options' && !!a.def.load

/**
 * "Filters" panel for `ListPage` with the URL as the single source of truth:
 * reload, Back and a pasted link keep the filters. Returns the `ListPage` props
 * (`filtersPanel`, `activeFilters`, `onClearFilters`) plus `values`, which reach
 * the data through `config.query` (memoize the config on `values`). Do not list
 * these params in `urlFilters`: ListPage would rewrite them with its mount values.
 * Declare `defs` at module level (or memoize them). Needs a QueryClient.
 * Guide: apps/docs/content/docs/hooks/use-url-filters.mdx
 */
export function useUrlFilters(
  all: readonly UrlFilterDef[],
  { omit = [], fixed }: UseUrlFiltersOptions = {}
): UseUrlFiltersResult {
  const { getParam, setParams } = useUrlSync()
  const t = useTelamonjsT()
  const text = useText()
  const formatter = useFormatter()
  const baseId = useId()
  const omitKey = omit.join('\u0000')
  const defs = useMemo(
    () => all.filter(d => !omit.includes(filterApiKey(d))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `omitKey` serializes `omit`
    [all, omitKey]
  )
  const params = useMemo(() => defs.flatMap(filterParams), [defs])

  const { values, active } = readUrlFilters(defs, getParam)
  const valuesKey = JSON.stringify(values)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `valuesKey` serializes `values` (feeds the config useMemo)
  const stableValues = useMemo(() => values, [valuesKey])
  const parentOf = (def: UrlFilterDef) => parentValue(def, active, fixed)

  const remote = active.filter(isRemote)
  const labelQueries = useQueries({
    queries: remote.map(({ def, value }) => {
      const parent = parentOf(def)
      return {
        queryKey: ['url-filter-label', def.param, value, parent],
        queryFn: async ({ signal }: { signal: AbortSignal }) =>
          (await def.load('', { parent, selected: [value], signal })).find(i => i.value === value) ?? null,
        staleTime: 5 * 60_000,
        meta: LIB_QUERY_META,
      }
    }),
  })
  const remoteItems = new Map<string, RichSelectorItem<string> | null | undefined>(
    remote.map((a, i) => [a.def.param, labelQueries[i]?.data])
  )
  const remoteLabel = (a: ActiveUrlFilter): string | undefined => {
    const item = remoteItems.get(a.def.param)
    if (item === undefined) return undefined
    if (item === null) return a.value
    return a.def.kind === 'options' && a.def.chipLabel ? a.def.chipLabel(item) : item.label
  }

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return formatter.dateTime(new Date(Date.UTC(y, m - 1, d)), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  const write = (updates: Record<string, string | null>) => setParams(updates, { replace: true })
  const change = (def: UrlFilterDef, value: string | null, to?: string | null) =>
    // Clearing a filter with a default is removing its chip: back to `noDefaultValue`
    write(
      value === null && def.kind === 'options' && def.defaultValue
        ? paramsOnRemove(defs, { def, value: def.defaultValue })
        : paramsOnChange(defs, def, value, to)
    )

  const activeFilters: ActiveFilterChip[] = active.map(a => ({
    key: a.def.param,
    label: chipText(a, {
      label: text(a.def.label) ?? '',
      text: v => text(v) ?? '',
      remoteLabel: remoteLabel(a),
      formatDate,
      since: date => t('list.filterSince', { date }),
      until: date => t('list.filterUntil', { date }),
    }),
    onRemove: () => write(paramsOnRemove(defs, a)),
  }))

  // `minmax(0,1fr)` at both levels: a long value truncates inside its control
  // (full text in `title`) instead of widening the column past the popover.
  const filtersPanel = (
    <div className='grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-3'>
      {defs.map(def => {
        const id = `${baseId}-${def.param}`
        const label = text(def.label) ?? ''
        const current = active.find(a => a.def === def)
        return (
          <div
            key={def.param}
            role={def.kind === 'text' ? undefined : 'group'}
            aria-labelledby={def.kind === 'text' ? undefined : `${id}-label`}
            className='grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5'
            data-testid={`url-filter-${def.param}`}
          >
            {def.kind === 'text' ? (
              <label htmlFor={id} className='text-xs font-medium text-muted-foreground'>
                {label}
              </label>
            ) : (
              <span id={`${id}-label`} className='text-xs font-medium text-muted-foreground'>
                {label}
              </span>
            )}
            {def.kind === 'options' ? (
              <OptionsFilter
                def={def}
                label={label}
                value={current?.value ?? null}
                parent={parentOf(def)}
                selectedItem={remoteItems.get(def.param) ?? undefined}
                onChange={v => change(def, v)}
              />
            ) : def.kind === 'dateRange' ? (
              <DateRangeFilter
                from={current?.value ?? ''}
                to={current?.to ?? ''}
                onChange={(from, to) => change(def, from, to)}
              />
            ) : (
              <TextFilter
                id={id}
                placeholder={text(def.placeholder)}
                value={current?.value ?? ''}
                onCommit={v => change(def, v)}
              />
            )}
          </div>
        )
      })}
    </div>
  )

  return {
    values: stableValues,
    filtersPanel,
    activeFilters,
    onClearFilters: () => write(paramsOnClear(defs)),
    params,
  }
}
