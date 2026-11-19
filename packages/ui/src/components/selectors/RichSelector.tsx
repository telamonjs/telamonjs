'use client'

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { useDebounce } from '../../hooks/use-debounce'
import { useHoverPopover } from '../../hooks/use-hover-popover'
import { useTelamonjsT } from '../../i18n/use-t'
import { LIB_QUERY_META } from '../../utils/query-meta'

export type RichSelectorValue = string | number

/** One option: a title line and an optional detail line. */
export interface RichSelectorItem<V extends RichSelectorValue = string> {
  value: V
  label: string
  /** Second line (document, status, parent record...). */
  description?: ReactNode
  /** Replaces the selector's `icon` on this option. */
  icon?: ComponentType<{ className?: string }>
  disabled?: boolean
  /** Options sharing a group are listed together under this header. */
  group?: string
  /** Extra text matched by the local search (`items` mode). */
  searchText?: string
}

export interface RichSelectorLabels {
  placeholder: string
  search: string
  /** Row that clears a single selection. */
  none: string
  /** Row that clears a multiple selection. */
  clear: string
  empty: string
  error: string
  retry: string
  /** Trigger text with two or more items selected. */
  selected: (count: number) => string
}

export interface RichSelectorLoadContext<V extends RichSelectorValue> {
  /** Current selection: return these items too, so their labels can be shown. */
  selected: V[]
  /** Aborted when the search changes. */
  signal: AbortSignal
}

/** Search on the server through react-query (needs a QueryClient, as `AppProviders` provides). */
export interface RichSelectorRemoteSource<V extends RichSelectorValue> {
  load: (
    search: string,
    context: RichSelectorLoadContext<V>
  ) => Promise<RichSelectorItem<V>[]>
  /** Identifies the list: include whatever `load` closes over. */
  queryKey: readonly unknown[]
  items?: never
  filter?: never
  /** Search debounce. Default 250ms. */
  debounceMs?: number
  /** Shorter terms are sent as an empty search. Default 0. */
  minSearchLength?: number
  /** Default 30s. */
  staleTime?: number
  /** Load on first open, or earlier when a selected item has no known label. */
  lazy?: boolean
  /** Items already at hand: their labels show without a request. */
  selectedItems?: RichSelectorItem<V>[]
}

/** Fixed list filtered in the browser (accent and case insensitive). No QueryClient needed. */
export interface RichSelectorLocalSource<V extends RichSelectorValue> {
  items: RichSelectorItem<V>[]
  /** Replaces the default match on label, description and `searchText`. */
  filter?: (item: RichSelectorItem<V>, search: string) => boolean
  load?: never
  queryKey?: never
  debounceMs?: never
  minSearchLength?: never
  staleTime?: never
  lazy?: never
  selectedItems?: never
}

export interface RichSelectorCommonProps<V extends RichSelectorValue> {
  /** Trigger and option icon. */
  icon?: ComponentType<{ className?: string }>
  /** Monospace title (serial number, license plate). */
  mono?: boolean
  labels?: Partial<RichSelectorLabels>
  /** Hides the clearing row. */
  required?: boolean
  /** Shows the clearing row. Default: `!required`. */
  clearable?: boolean
  disabled?: boolean
  readOnly?: boolean
  /** Default true. Off, it opens by click only. `RichSelectorField` defaults to false. */
  openOnHover?: boolean
  /** Default true. */
  searchable?: boolean
  /** Default: true when single, false when multiple. */
  closeOnSelect?: boolean
  onOpenChange?: (open: boolean) => void
  /** Focus left the control: on the closed trigger, or by closing the panel. */
  onBlur?: () => void
  /** Focus the trigger on mount. */
  autoFocus?: boolean
  /** Trigger button. */
  triggerRef?: Ref<HTMLButtonElement>
  /** Replaces the title and detail of an option. */
  renderItem?: (
    item: RichSelectorItem<V>,
    state: { selected: boolean }
  ) => ReactNode
  /** Replaces the trigger text when something is selected. */
  renderValue?: (items: RichSelectorItem<V>[]) => ReactNode
  /** Pinned under the list ("Create new...", a link). */
  footer?: ReactNode
  id?: string
  'aria-label'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-describedby'?: string
  /** Trigger button. */
  className?: string
  /** Popover panel. */
  contentClassName?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export interface RichSelectorSingleProps<V extends RichSelectorValue> {
  multiple?: false
  value: V | null | undefined
  onChange: (value: V | null, item: RichSelectorItem<V> | null) => void
  maxSelected?: never
}

export interface RichSelectorMultipleProps<V extends RichSelectorValue> {
  multiple: true
  value: V[] | null | undefined
  onChange: (value: V[], items: RichSelectorItem<V>[]) => void
  /** Other options turn disabled once reached. */
  maxSelected?: number
}

export type RichSelectorProps<V extends RichSelectorValue = string> =
  RichSelectorCommonProps<V> &
    (RichSelectorSingleProps<V> | RichSelectorMultipleProps<V>) &
    (RichSelectorRemoteSource<V> | RichSelectorLocalSource<V>)

// Forms often keep ids as strings while the API returns numbers: compare by text.
const keyOf = (value: RichSelectorValue) => String(value)

const NO_ITEMS: never[] = []

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const defaultFilter = <V extends RichSelectorValue>(
  item: RichSelectorItem<V>,
  search: string
) =>
  normalize(
    [
      item.label,
      typeof item.description === 'string' ? item.description : '',
      item.searchText ?? '',
    ].join(' ')
  ).includes(normalize(search))

const isEditable = (element: Element | null) =>
  element instanceof HTMLElement &&
  (element.isContentEditable || element.matches('input, textarea, select'))

const toArray = <V extends RichSelectorValue>(
  value: V | V[] | null | undefined
): V[] =>
  Array.isArray(value)
    ? value
    : value === null || value === undefined || value === ''
      ? []
      : [value]

type ViewProps<V extends RichSelectorValue> = RichSelectorCommonProps<V> &
  (RichSelectorSingleProps<V> | RichSelectorMultipleProps<V>) & {
    items: RichSelectorItem<V>[]
    known: ReadonlyMap<string, RichSelectorItem<V>>
    search: string
    onSearchChange: (search: string) => void
    loading?: boolean
    /** The list on screen may not match the search yet: Enter waits. */
    settling?: boolean
    failed?: boolean
    onRetry?: () => void
  }

function RichSelectorView<V extends RichSelectorValue>(props: ViewProps<V>) {
  const {
    items,
    known,
    search,
    onSearchChange,
    loading,
    settling,
    failed,
    onRetry,
    icon: Icon,
    mono,
    labels: labelsProp,
    required,
    clearable = !required,
    disabled,
    readOnly,
    openOnHover = true,
    searchable = true,
    closeOnSelect = !props.multiple,
    onOpenChange,
    onBlur,
    autoFocus,
    triggerRef,
    renderItem,
    renderValue,
    footer,
    id,
    'aria-label': ariaLabel,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    className,
    contentClassName,
    align = 'start',
    side,
  } = props

  const t = useTelamonjsT()
  const labels: RichSelectorLabels = {
    placeholder: t('common.select'),
    search: t('common.search'),
    none: t('common.none'),
    clear: t('common.clear'),
    empty: t('business.selector.noResultsFound'),
    error: t('business.selector.loadError'),
    retry: t('common.retry'),
    selected: count => t('business.selector.selected', { count }),
    ...labelsProp,
  }

  const inactive = disabled || readOnly
  const wasOpen = useRef(false)
  // By key, not position: the active option follows a list that changed under it.
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next === wasOpen.current) return
      wasOpen.current = next
      // The next opening starts clean instead of filtered by the old term.
      if (!next) {
        onSearchChange('')
        setActiveKey(null)
        onBlur?.()
      }
      onOpenChange?.(next)
    },
    [onBlur, onOpenChange, onSearchChange]
  )
  const { open, setOpen, triggerProps, contentProps } = useHoverPopover({
    disabled: inactive,
    onOpenChange: handleOpenChange,
    // Closing clears the search: never throw away what the person is typing.
    keepOpen: () => search !== '',
  })

  const selected = toArray<V>(props.value)
  const selectedKeys = new Set(selected.map(keyOf))
  const selectedItems = selected.flatMap(value => {
    const item = known.get(keyOf(value))
    return item ? [item] : []
  })
  const limitReached =
    props.multiple &&
    props.maxSelected !== undefined &&
    selected.length >= props.maxSelected

  const isOptionDisabled = (item: RichSelectorItem<V>) =>
    item.disabled || (limitReached && !selectedKeys.has(keyOf(item.value)))

  // No group first, or it would read as part of the header above it. Then by
  // group, in order of first appearance.
  const ordered = useMemo(() => {
    const groups = new Map<string | undefined, RichSelectorItem<V>[]>()
    for (const item of items) {
      const list = groups.get(item.group)
      if (list) list.push(item)
      else groups.set(item.group, [item])
    }
    const ungrouped = groups.get(undefined) ?? []
    groups.delete(undefined)
    return [...ungrouped, ...Array.from(groups.values()).flat()]
  }, [items])

  const baseId = useId()
  const panelId = `${baseId}-panel`
  const listId = `${baseId}-list`
  const optionId = (index: number) => `${baseId}-option-${index}`
  const isPickable = (item: RichSelectorItem<V>) => !isOptionDisabled(item)
  // Without an explicit highlight: the current value, so Enter doesn't replace
  // it by accident, then the first option that can be picked.
  const pointedIndex = ordered.findIndex(
    item => keyOf(item.value) === activeKey && isPickable(item)
  )
  const selectedIndex = props.multiple
    ? -1
    : ordered.findIndex(
        item => selectedKeys.has(keyOf(item.value)) && isPickable(item)
      )
  const activeIndex =
    pointedIndex >= 0
      ? pointedIndex
      : selectedIndex >= 0
        ? selectedIndex
        : ordered.findIndex(isPickable)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const moveActive = (step: 1 | -1) => {
    if (ordered.length === 0) return
    let next = activeIndex
    for (let tries = 0; tries < ordered.length; tries++) {
      next =
        next === -1 && step === -1
          ? ordered.length - 1
          : (next + step + ordered.length) % ordered.length
      const candidate = ordered[next]
      if (candidate && !isOptionDisabled(candidate)) {
        setActiveKey(keyOf(candidate.value))
        listRef.current
          ?.querySelector(`[id="${optionId(next)}"]`)
          ?.scrollIntoView?.({ block: 'nearest' })
        return
      }
    }
  }

  const clear = () => {
    if (props.multiple) props.onChange([], [])
    else props.onChange(null, null)
    if (closeOnSelect) setOpen(false)
  }

  const choose = (item: RichSelectorItem<V>) => {
    if (isOptionDisabled(item)) return
    if (props.multiple) {
      const key = keyOf(item.value)
      const removing = selectedKeys.has(key)
      const nextValues = removing
        ? selected.filter(value => keyOf(value) !== key)
        : [...selected, item.value]
      const nextItems = nextValues.flatMap(value => {
        const found = keyOf(value) === key ? item : known.get(keyOf(value))
        return found ? [found] : []
      })
      props.onChange(nextValues, nextItems)
    } else {
      props.onChange(item.value, item)
    }
    if (closeOnSelect) setOpen(false)
  }

  const handleListKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter' || (event.key === ' ' && !searchable)) {
      // React events bubble through the portal: without this, Enter submits the form.
      event.preventDefault()
      const item = ordered[activeIndex]
      if (item && !settling && !failed) choose(item)
    }
  }

  const triggerText = () => {
    const first = selectedItems[0]
    if (selected.length === 0) return labels.placeholder
    if (!first) {
      if (selected.length > 1) return labels.selected(selected.length)
      // Still unknown after loading: `load` left it out. The form has a value, so
      // the raw id beats a placeholder that reads as empty.
      return loadingLabel ? (
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
      ) : (
        String(selected[0])
      )
    }
    if (renderValue) return renderValue(selectedItems)
    if (selected.length > 1) return labels.selected(selected.length)
    return (
      <>
        <span className={cn(mono && 'font-mono')}>{first.label}</span>
        {first.description && (
          <span className='ml-2 text-xs text-muted-foreground'>
            {first.description}
          </span>
        )}
      </>
    )
  }

  const loadingLabel = loading && selectedItems.length === 0 && selected.length > 0
  const hasList = !failed && ordered.length > 0
  const activeId =
    hasList && activeIndex >= 0 ? optionId(activeIndex) : undefined

  let previousGroup: string | undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          autoFocus={autoFocus}
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-haspopup='listbox'
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-required={required || undefined}
          aria-busy={loadingLabel || undefined}
          disabled={inactive}
          {...(openOnHover ? triggerProps : {})}
          onBlur={() => {
            // While open, focus moved into the panel: closing reports the blur.
            if (!open) onBlur?.()
          }}
          onClick={() => {
            // The click after a hover keeps it open but takes the focus to the trigger.
            if (open) (searchRef.current ?? listRef.current)?.focus()
          }}
          onKeyDown={event => {
            if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
              event.preventDefault()
              setOpen(true)
            }
          }}
          className={cn(
            'w-full justify-between gap-2 bg-card font-normal drop-shadow-md',
            selected.length === 0 && 'text-muted-foreground',
            className
          )}
        >
          {Icon && <Icon className='h-4 w-4 shrink-0 text-primary' />}
          <span className='min-w-0 flex-1 truncate text-left'>
            {triggerText()}
          </span>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        id={panelId}
        aria-label={ariaLabel ?? labels.placeholder}
        align={align}
        side={side}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0',
          contentClassName
        )}
        {...(openOnHover ? contentProps : {})}
        onOpenAutoFocus={event => {
          event.preventDefault()
          // A hover must not pull the caret out of a field being typed in.
          if (isEditable(document.activeElement)) return
          const target =
            searchRef.current ?? listRef.current ?? event.currentTarget
          if (target instanceof HTMLElement) target.focus()
        }}
        onCloseAutoFocus={event => {
          if (isEditable(document.activeElement)) event.preventDefault()
        }}
      >
        {searchable && (
          <div className='relative border-b'>
            <Search className='pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
            <Input
              ref={searchRef}
              type='text'
              role='searchbox'
              aria-label={labels.search}
              aria-busy={settling || undefined}
              aria-controls={hasList ? listId : undefined}
              aria-activedescendant={activeId}
              placeholder={labels.search}
              value={search}
              onChange={event => {
                setActiveKey(null)
                onSearchChange(event.target.value)
              }}
              onKeyDown={handleListKeyDown}
              className='h-8 rounded-none border-0 pl-8 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0'
            />
            {loading && (
              <Loader2 className='absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground' />
            )}
          </div>
        )}
        {clearable && selected.length > 0 && (
          <button
            type='button'
            aria-label={props.multiple ? labels.clear : labels.none}
            onClick={clear}
            className='flex h-8 w-full items-center gap-2 border-b px-2.5 text-left text-sm text-muted-foreground hover:bg-accent'
          >
            <X className='h-3.5 w-3.5' />
            {props.multiple ? labels.clear : labels.none}
          </button>
        )}
        {failed ? (
          <div className='flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground'>
            <span role='alert'>{labels.error}</span>
            <Button
              type='button'
              variant='outline'
              size='sm'
              aria-label={labels.retry}
              onClick={onRetry}
            >
              {labels.retry}
            </Button>
          </div>
        ) : !hasList ? (
          !loading && (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              {labels.empty}
            </div>
          )
        ) : (
          <div
            ref={listRef}
            id={listId}
            role='listbox'
            aria-label={ariaLabel}
            aria-multiselectable={props.multiple || undefined}
            tabIndex={searchable ? undefined : -1}
            aria-activedescendant={searchable ? undefined : activeId}
            onKeyDown={searchable ? undefined : handleListKeyDown}
            className='max-h-[300px] overflow-auto py-1 outline-none'
          >
            {ordered.map((item, index) => {
              const isSelected = selectedKeys.has(keyOf(item.value))
              const isDisabled = isOptionDisabled(item)
              const showGroup = item.group && item.group !== previousGroup
              previousGroup = item.group
              const ItemIcon = item.icon
              return (
                <div key={keyOf(item.value)} role='presentation'>
                  {showGroup && (
                    <div
                      role='presentation'
                      className='px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
                    >
                      {item.group}
                    </div>
                  )}
                  <div
                    id={optionId(index)}
                    role='option'
                    aria-selected={isSelected}
                    aria-disabled={isDisabled || undefined}
                    onClick={() => choose(item)}
                    onMouseEnter={() => !isDisabled && setActiveKey(keyOf(item.value))}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 text-sm',
                      isDisabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:bg-accent',
                      isSelected && 'bg-accent/50',
                      index === activeIndex && !isDisabled && 'bg-accent'
                    )}
                  >
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {ItemIcon && <ItemIcon className='h-3.5 w-3.5 shrink-0' />}
                    {renderItem ? (
                      renderItem(item, { selected: isSelected })
                    ) : (
                      <div className='min-w-0 leading-tight'>
                        <div className={cn('font-medium', mono && 'font-mono')}>
                          {item.label}
                        </div>
                        {item.description && (
                          <div className='truncate text-xs text-muted-foreground'>
                            {item.description}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {footer && <div className='border-t p-1'>{footer}</div>}
      </PopoverContent>
    </Popover>
  )
}

type LocalProps<V extends RichSelectorValue> = RichSelectorProps<V> &
  RichSelectorLocalSource<V>

function LocalRichSelector<V extends RichSelectorValue>({
  items,
  filter = defaultFilter,
  ...rest
}: LocalProps<V>) {
  const [search, setSearch] = useState('')
  const term = search.trim()
  const visible = useMemo(
    () => (term ? items.filter(item => filter(item, term)) : items),
    [items, filter, term]
  )
  const known = useMemo(
    () => new Map(items.map(item => [keyOf(item.value), item])),
    [items]
  )
  return (
    <RichSelectorView<V>
      {...(rest as unknown as ViewProps<V>)}
      items={visible}
      known={known}
      search={search}
      onSearchChange={setSearch}
    />
  )
}

type RemoteProps<V extends RichSelectorValue> = RichSelectorProps<V> &
  RichSelectorRemoteSource<V>

function RemoteRichSelector<V extends RichSelectorValue>({
  load,
  queryKey,
  debounceMs = 250,
  minSearchLength = 0,
  staleTime = 30_000,
  lazy,
  selectedItems,
  ...rest
}: RemoteProps<V>) {
  const { onOpenChange } = rest
  const [search, setSearch] = useState('')
  const [opened, setOpened] = useState(false)
  const debounced = useDebounce(search.trim(), debounceMs)
  const term = debounced.length >= minSearchLength ? debounced : ''

  const selected = toArray<V>(rest.value)

  // Every item seen, so a label survives a search that filters it out.
  const [seen, setSeen] = useState(
    () => new Map<string, RichSelectorItem<V>>()
  )
  const known = useMemo(
    () =>
      new Map([
        ...(selectedItems ?? []).map(
          item => [keyOf(item.value), item] as const
        ),
        ...seen,
      ]),
    [selectedItems, seen]
  )
  const missing = selected.map(keyOf).filter(key => !known.has(key))

  // Values that needed a request join the key once, so picking from the list
  // (label already known) does not refetch, and neither does the load settling.
  const [requested, setRequested] = useState(missing)
  const newlyMissing = missing.filter(key => !requested.includes(key))
  if (newlyMissing.length > 0) setRequested([...requested, ...newlyMissing])

  const query = useQuery({
    queryKey: [...queryKey, term, requested],
    queryFn: ({ signal }) => load(term, { selected, signal }),
    enabled: !lazy || opened || missing.length > 0,
    staleTime,
    placeholderData: keepPreviousData,
    meta: LIB_QUERY_META,
  })

  // Starts empty: a list already in the cache has labels to take in too.
  const [absorbed, setAbsorbed] = useState<typeof query.data>(undefined)
  if (query.data && query.data !== absorbed) {
    setAbsorbed(query.data)
    setSeen(
      new Map([
        ...seen,
        ...query.data.map(item => [keyOf(item.value), item] as const),
      ])
    )
  }

  const items = query.data ?? NO_ITEMS

  const handleOpenChange = (next: boolean) => {
    if (next) setOpened(true)
    onOpenChange?.(next)
  }

  return (
    <RichSelectorView<V>
      {...(rest as unknown as ViewProps<V>)}
      items={items}
      known={known}
      search={search}
      onSearchChange={setSearch}
      onOpenChange={handleOpenChange}
      loading={query.isFetching}
      settling={query.isFetching || search.trim() !== debounced}
      failed={query.isError}
      onRetry={() => void query.refetch()}
    />
  )
}

/**
 * Pick one or many records from a searchable list with a title and a detail
 * line per option, opening on hover. Give it `items` for a fixed list or
 * `load` + `queryKey` to search on the server. For forms, see
 * `RichSelectorField`. Guide: apps/docs/content/docs/components/rich-selector.mdx
 */
export function RichSelector<V extends RichSelectorValue = string>(
  props: RichSelectorProps<V>
) {
  return props.load ? (
    <RemoteRichSelector<V> {...(props as RemoteProps<V>)} />
  ) : (
    <LocalRichSelector<V> {...(props as LocalProps<V>)} />
  )
}
