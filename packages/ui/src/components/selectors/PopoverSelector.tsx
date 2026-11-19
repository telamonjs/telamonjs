'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { Check, ChevronsUpDown, Search as SearchIcon } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from '../../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { Input } from '../../ui/input'
import { Checkbox } from '../../ui/checkbox'
import { Badge } from '../../ui/badge'
import { ScrollArea } from '../../ui/scroll-area'
import { useHoverPopover } from '../../hooks/use-hover-popover'
import { useDebounce } from '../../hooks/use-debounce'
import { useTelamonjsT } from '../../i18n/use-t'
import type {
  PopoverSelectorProps,
  PopoverSelectorSingleProps,
  PopoverSelectorMultiProps,
  SelectorItem,
  SelectorGroup,
  PopoverSelectorLabels,
} from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeLabels(
  t: ReturnType<typeof useTelamonjsT>,
  partial?: Partial<PopoverSelectorLabels>
): PopoverSelectorLabels {
  const translated: PopoverSelectorLabels = {
    search: t('common.search'),
    noResults: t('business.selector.noResults'),
    all: t('common.all'),
    selectAll: t('business.selector.selectAll'),
    clearAll: t('common.clear'),
    selected: t('business.selector.selectedWord'),
  }
  if (!partial) return translated
  return { ...translated, ...partial }
}

// ---------------------------------------------------------------------------
// Single-select inner component
// ---------------------------------------------------------------------------

const SingleSelector = memo(function SingleSelector({
  items,
  groups,
  value,
  onChange,
  allLabel,
  placeholder,
  disabled = false,
  labels: labelsProp,
  className,
  triggerClassName,
}: PopoverSelectorSingleProps) {
  const t = useTelamonjsT()
  const labels = mergeLabels(t, labelsProp)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)
  const { open, setOpen, triggerProps, contentProps } = useHoverPopover({
    disabled,
  })

  // Build search-ready items
  const searchableItems = useMemo(
    () =>
      items.map(item => ({
        ...item,
        _search: item.label.toLowerCase(),
      })),
    [items]
  )

  // Filter by debounced search
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return searchableItems
    const lower = debouncedSearch.toLowerCase()
    return searchableItems.filter(item => item._search.includes(lower))
  }, [searchableItems, debouncedSearch])

  // Group items if groups are provided
  const groupMap = useMemo(() => {
    if (!groups || groups.length === 0) return null
    const map = new Map<string, SelectorGroup>()
    groups.forEach(g => map.set(g.id, g))
    return map
  }, [groups])

  // Selected item for display
  const selectedItem = useMemo(
    () => items.find(item => item.id === value) ?? null,
    [items, value]
  )

  // Display label on trigger
  const displayLabel = selectedItem
    ? selectedItem.label
    : (placeholder ?? labels.all)

  const handleSelect = useCallback(
    (id: string | null) => {
      onChange(id)
      setOpen(false)
      setSearch('')
    },
    [onChange, setOpen]
  )

  // Group filtered items for rendering
  const renderGroups = useMemo(() => {
    if (!groupMap) return null

    const grouped = new Map<string, typeof filteredItems>()
    const ungrouped: typeof filteredItems = []

    filteredItems.forEach(item => {
      if (item.groupId && groupMap.has(item.groupId)) {
        const list = grouped.get(item.groupId) ?? []
        list.push(item)
        grouped.set(item.groupId, list)
      } else {
        ungrouped.push(item)
      }
    })

    return { grouped, ungrouped }
  }, [filteredItems, groupMap])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          {...triggerProps}
          className={cn(
            'h-8 justify-between gap-2 text-xs font-medium min-w-[200px] max-w-[320px]',
            !value && 'text-muted-foreground',
            className,
            triggerClassName
          )}
        >
          <span className='truncate flex-1 text-left'>{displayLabel}</span>
          <ChevronsUpDown className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
        </Button>
      </PopoverTrigger>

      <PopoverContent className='w-[280px] p-0' align='start' {...contentProps}>
        {/* Search input */}
        <div className='relative border-b'>
          <SearchIcon className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none' />
          <Input
            placeholder={labels.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='h-8 pl-8 text-xs border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none'
          />
        </div>

        {/* Item list */}
        <ScrollArea className='max-h-[300px]'>
          {filteredItems.length === 0 ? (
            <div className='py-8 text-center text-xs text-muted-foreground'>
              {labels.noResults}
            </div>
          ) : (
            <div className='py-1'>
              {/* "All" option */}
              {allLabel !== undefined && (
                <button
                  type='button'
                  data-testid='popover-selector-all-option'
                  onClick={() => handleSelect(null)}
                  className={cn(
                    'w-full flex items-center gap-2 h-8 px-2.5 text-xs transition-colors',
                    'hover:bg-accent',
                    !value && 'bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                >
                  <span className='flex-1 truncate text-left'>
                    {allLabel ?? labels.all}
                  </span>
                  {!value && (
                    <Check className='h-3.5 w-3.5 shrink-0 text-blue-600' />
                  )}
                </button>
              )}

              {/* Grouped rendering */}
              {renderGroups
                ? renderGroupedSingleItems(
                    renderGroups,
                    groupMap!,
                    groups!,
                    value,
                    handleSelect
                  )
                : filteredItems.map(item => (
                    <SingleItem
                      key={item.id}
                      item={item}
                      isSelected={value === item.id}
                      onSelect={handleSelect}
                    />
                  ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
})

/** Render grouped items for single mode */
function renderGroupedSingleItems(
  renderGroups: {
    grouped: Map<string, (SelectorItem & { _search: string })[]>
    ungrouped: (SelectorItem & { _search: string })[]
  },
  _groupMap: Map<string, SelectorGroup>,
  groups: SelectorGroup[],
  value: string | null,
  onSelect: (id: string | null) => void
) {
  const elements: React.ReactNode[] = []

  // Render groups in original order
  groups.forEach(group => {
    const groupItems = renderGroups.grouped.get(group.id)
    if (!groupItems || groupItems.length === 0) return

    const GroupIcon = group.icon
    elements.push(
      <div
        key={`group-${group.id}`}
        className='flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'
      >
        {GroupIcon && <GroupIcon className='h-3 w-3' />}
        <span>{group.label}</span>
      </div>
    )

    groupItems.forEach(item => {
      elements.push(
        <SingleItem
          key={item.id}
          item={item}
          isSelected={value === item.id}
          onSelect={onSelect}
          indented
        />
      )
    })
  })

  // Ungrouped items at the end
  renderGroups.ungrouped.forEach(item => {
    elements.push(
      <SingleItem
        key={item.id}
        item={item}
        isSelected={value === item.id}
        onSelect={onSelect}
      />
    )
  })

  return elements
}

/** Single-select row */
const SingleItem = memo(function SingleItem({
  item,
  isSelected,
  onSelect,
  indented = false,
}: {
  item: SelectorItem
  isSelected: boolean
  onSelect: (id: string | null) => void
  indented?: boolean
}) {
  const Icon = item.icon
  return (
    <button
      type='button'
      disabled={item.disabled}
      data-testid={`popover-selector-item-${item.id}`}
      onClick={() => onSelect(isSelected ? null : item.id)}
      className={cn(
        'w-full flex items-center gap-2 h-8 text-xs transition-colors',
        'hover:bg-accent',
        isSelected && 'bg-blue-50/50 dark:bg-blue-950/20',
        indented ? 'pl-5 pr-2.5' : 'px-2.5',
        item.disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            isSelected ? 'text-blue-600' : 'text-muted-foreground'
          )}
        />
      )}
      <span className='flex-1 truncate text-left'>{item.label}</span>
      {isSelected && <Check className='h-3.5 w-3.5 shrink-0 text-blue-600' />}
    </button>
  )
})

// ---------------------------------------------------------------------------
// Multi-select inner component
// ---------------------------------------------------------------------------

const MultiSelector = memo(function MultiSelector({
  items,
  groups,
  value,
  onChange,
  placeholder,
  disabled = false,
  labels: labelsProp,
  className,
  triggerClassName,
}: PopoverSelectorMultiProps) {
  const t = useTelamonjsT()
  const labels = mergeLabels(t, labelsProp)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)
  const { open, setOpen, triggerProps, contentProps } = useHoverPopover({
    disabled,
  })

  // Searchable items
  const searchableItems = useMemo(
    () =>
      items.map(item => ({
        ...item,
        _search: item.label.toLowerCase(),
      })),
    [items]
  )

  // Filter
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return searchableItems
    const lower = debouncedSearch.toLowerCase()
    return searchableItems.filter(item => item._search.includes(lower))
  }, [searchableItems, debouncedSearch])

  // Group map
  const groupMap = useMemo(() => {
    if (!groups || groups.length === 0) return null
    const map = new Map<string, SelectorGroup>()
    groups.forEach(g => map.set(g.id, g))
    return map
  }, [groups])

  const selectedSet = useMemo(() => new Set(value), [value])

  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every(item => selectedSet.has(item.id))

  // Display label
  const displayLabel = useMemo(() => {
    if (value.length === 0) return placeholder ?? labels.all
    if (value.length === 1) {
      const item = items.find(i => i.id === value[0])
      return item?.label ?? `1 ${labels.selected}`
    }
    if (items.length > 0 && value.length === items.length) {
      return labels.all
    }
    return `${value.length} ${labels.selected}`
  }, [value, items, placeholder, labels])

  const toggleItem = useCallback(
    (id: string) => {
      if (selectedSet.has(id)) {
        onChange(value.filter(v => v !== id))
      } else {
        onChange([...value, id])
      }
    },
    [value, selectedSet, onChange]
  )

  const toggleAll = useCallback(() => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredItems.map(i => i.id))
      onChange(value.filter(id => !filteredIds.has(id)))
    } else {
      const merged = new Set([...value, ...filteredItems.map(i => i.id)])
      onChange([...merged])
    }
  }, [allFilteredSelected, filteredItems, value, onChange])

  const clearAll = useCallback(() => onChange([]), [onChange])

  // Group filtered items for rendering
  const renderGroups = useMemo(() => {
    if (!groupMap) return null

    const grouped = new Map<string, typeof filteredItems>()
    const ungrouped: typeof filteredItems = []

    filteredItems.forEach(item => {
      if (item.groupId && groupMap.has(item.groupId)) {
        const list = grouped.get(item.groupId) ?? []
        list.push(item)
        grouped.set(item.groupId, list)
      } else {
        ungrouped.push(item)
      }
    })

    return { grouped, ungrouped }
  }, [filteredItems, groupMap])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          {...triggerProps}
          className={cn(
            'h-8 justify-between gap-2 text-xs font-medium min-w-[200px] max-w-[320px]',
            value.length === 0 && 'text-muted-foreground',
            className,
            triggerClassName
          )}
        >
          <span className='truncate flex-1 text-left'>{displayLabel}</span>
          {value.length > 0 && (
            <Badge
              variant='default'
              className='h-4 min-w-[1rem] px-1 text-[10px] font-bold rounded-full'
            >
              {value.length}
            </Badge>
          )}
          <ChevronsUpDown className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
        </Button>
      </PopoverTrigger>

      <PopoverContent className='w-[300px] p-0' align='start' {...contentProps}>
        {/* Search */}
        <div className='relative border-b'>
          <SearchIcon className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none' />
          <Input
            placeholder={labels.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='h-8 pl-8 text-xs border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none'
          />
        </div>

        {/* Select all / Clear bar */}
        {filteredItems.length > 0 && (
          <div className='flex items-center justify-between px-2.5 py-1.5 border-b bg-muted/30'>
            <div
              role='option'
              aria-selected={allFilteredSelected}
              onClick={toggleAll}
              className='flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
            >
              <Checkbox
                checked={allFilteredSelected}
                className='h-3.5 w-3.5'
                tabIndex={-1}
              />
              <span>
                {labels.selectAll} ({filteredItems.length})
              </span>
            </div>
            {value.length > 0 && (
              <button
                type='button'
                data-testid='popover-selector-clear-all'
                onClick={clearAll}
                className='text-xs text-muted-foreground hover:text-foreground transition-colors'
              >
                {labels.clearAll}
              </button>
            )}
          </div>
        )}

        {/* Item list */}
        <ScrollArea className='max-h-[300px]'>
          {filteredItems.length === 0 ? (
            <div className='py-8 text-center text-xs text-muted-foreground'>
              {labels.noResults}
            </div>
          ) : (
            <div className='py-1'>
              {renderGroups
                ? renderGroupedMultiItems(
                    renderGroups,
                    groupMap!,
                    groups!,
                    selectedSet,
                    toggleItem
                  )
                : filteredItems.map(item => (
                    <MultiItem
                      key={item.id}
                      item={item}
                      isSelected={selectedSet.has(item.id)}
                      onToggle={toggleItem}
                    />
                  ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
})

/** Render grouped items for multi mode */
function renderGroupedMultiItems(
  renderGroups: {
    grouped: Map<string, (SelectorItem & { _search: string })[]>
    ungrouped: (SelectorItem & { _search: string })[]
  },
  _groupMap: Map<string, SelectorGroup>,
  groups: SelectorGroup[],
  selectedSet: Set<string>,
  onToggle: (id: string) => void
) {
  const elements: React.ReactNode[] = []

  groups.forEach(group => {
    const groupItems = renderGroups.grouped.get(group.id)
    if (!groupItems || groupItems.length === 0) return

    const GroupIcon = group.icon
    elements.push(
      <div
        key={`group-${group.id}`}
        className='flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'
      >
        {GroupIcon && <GroupIcon className='h-3 w-3' />}
        <span>{group.label}</span>
      </div>
    )

    groupItems.forEach(item => {
      elements.push(
        <MultiItem
          key={item.id}
          item={item}
          isSelected={selectedSet.has(item.id)}
          onToggle={onToggle}
          indented
        />
      )
    })
  })

  renderGroups.ungrouped.forEach(item => {
    elements.push(
      <MultiItem
        key={item.id}
        item={item}
        isSelected={selectedSet.has(item.id)}
        onToggle={onToggle}
      />
    )
  })

  return elements
}

/** Multi-select row */
const MultiItem = memo(function MultiItem({
  item,
  isSelected,
  onToggle,
  indented = false,
}: {
  item: SelectorItem
  isSelected: boolean
  onToggle: (id: string) => void
  indented?: boolean
}) {
  const Icon = item.icon
  return (
    <div
      role='option'
      aria-selected={isSelected}
      onClick={() => !item.disabled && onToggle(item.id)}
      className={cn(
        'w-full flex items-center gap-2 h-8 text-xs transition-colors cursor-pointer',
        'hover:bg-accent',
        isSelected && 'bg-blue-50/50 dark:bg-blue-950/20',
        indented ? 'pl-5 pr-2.5' : 'px-2.5',
        item.disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Checkbox checked={isSelected} className='h-3.5 w-3.5' tabIndex={-1} />
      {Icon && (
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            isSelected ? 'text-blue-600' : 'text-muted-foreground'
          )}
        />
      )}
      <span className='flex-1 truncate text-left'>{item.label}</span>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Public component (discriminated union dispatcher)
// ---------------------------------------------------------------------------

export const PopoverSelector = memo(function PopoverSelector(
  props: PopoverSelectorProps
) {
  if (props.mode === 'single') {
    return <SingleSelector {...props} />
  }
  return <MultiSelector {...props} />
})
