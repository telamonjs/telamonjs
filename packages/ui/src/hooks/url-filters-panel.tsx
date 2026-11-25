'use client'

/** Controls of the `useUrlFilters` panel. Internal — not exported from the barrel. */
import { useCallback, useMemo, useState } from 'react'
import { useTelamonjsT, useText } from '../i18n/use-t'
import {
  RichSelector,
  type RichSelectorItem,
  type RichSelectorLoadContext,
} from '../components/selectors/RichSelector'
import { DateRangePicker } from '../components/forms/DateRangePicker'
import { Input } from '../ui/input'
import { dateFromIso, isoFromDate, type UrlFilterOptionsDef } from './url-filters'

export function OptionsFilter({
  def,
  label,
  value,
  parent,
  selectedItem,
  onChange,
}: {
  def: UrlFilterOptionsDef
  label: string
  value: string | null
  parent: string | null
  selectedItem?: RichSelectorItem<string>
  onChange: (value: string | null) => void
}) {
  const t = useTelamonjsT()
  const text = useText()
  const missingParent = Boolean(def.requireParent && !parent)
  const all = text(def.allLabel) ?? t('list.all')
  const common = {
    icon: def.icon,
    labels: {
      placeholder: missingParent ? (text(def.parentPlaceholder) ?? all) : all,
      none: all,
      clear: all,
      search: text(def.searchPlaceholder) ?? t('list.search'),
      empty: text(def.emptyLabel) ?? t('list.noResults'),
    },
    // With a default and nothing to write instead, clearing would just bring it back
    clearable: !def.defaultValue || def.noDefaultValue !== undefined,
    disabled: missingParent,
    renderItem: def.renderItem,
    renderValue: valueWithTitle,
    'aria-label': label,
    className: 'h-9 text-sm',
    value,
    onChange: (v: string | null) => onChange(v),
  }
  const { options, load } = def
  const items = useMemo(
    () => options?.map(o => ({ value: o.value, label: text(o.label) ?? '' })),
    [options, text]
  )
  const loadItems = useCallback(
    (search: string, { selected, signal }: RichSelectorLoadContext<string>) =>
      load ? load(search, { parent, selected, signal }) : Promise.resolve([]),
    [load, parent]
  )
  if (items) return <RichSelector<string> {...common} items={items} />
  return (
    <RichSelector<string>
      {...common}
      load={loadItems}
      queryKey={[...(def.queryKey ?? []), parent]}
      lazy
      selectedItems={selectedItem ? [selectedItem] : undefined}
    />
  )
}

/** The trigger already truncates; `title` gives the full name back on hover. */
function valueWithTitle(items: RichSelectorItem<string>[]) {
  return items.map(i => (
    <span
      key={i.value}
      title={typeof i.description === 'string' ? `${i.label} · ${i.description}` : i.label}
    >
      {i.label}
      {i.description && <span className='ml-2 text-xs text-muted-foreground'>{i.description}</span>}
    </span>
  ))
}

export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string | null, to: string | null) => void
}) {
  const t = useTelamonjsT()
  // Same object while the URL does not change: the picker resets its draft on a new `value`
  const range = useMemo(
    () => (from || to ? { from: dateFromIso(from), to: dateFromIso(to) } : undefined),
    [from, to]
  )
  return (
    <DateRangePicker
      className='w-full min-w-0'
      placeholder={t('list.filterAnyDate')}
      value={range}
      onChange={r => onChange(isoFromDate(r.from), isoFromDate(r.to))}
    />
  )
}

/** Commits on Enter or blur: writing the URL on every key would refetch on every key. */
export function TextFilter({
  id,
  placeholder,
  value,
  onCommit,
}: {
  id: string
  placeholder?: string
  value: string
  onCommit: (value: string | null) => void
}) {
  const [draft, setDraft] = useState(value)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setDraft(value)
  }
  const commit = () => {
    if (draft.trim() !== value) onCommit(draft)
  }
  return (
    <Input
      id={id}
      className='h-9 text-sm'
      placeholder={placeholder}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit()
      }}
    />
  )
}
