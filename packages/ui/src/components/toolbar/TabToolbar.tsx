'use client'

import * as React from 'react'
import {
  Search,
  RefreshCw,
  Calendar,
  Maximize2,
  Minimize2,
  Plus,
  ChevronDown,
  Filter,
  Check,
} from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { Skeleton } from '../../ui/skeleton'
import { cn } from '../../utils'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'
import { useFormat } from '../../i18n/use-format'
import type {
  DateRange,
  DateRangeLabels,
} from '../pickers/DateRangePickerDialog'
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover'
import { useHoverPopover } from '../../hooks/use-hover-popover'

// ============================================================================
// TYPES
// ============================================================================

export interface SelectOption {
  value: string
  label: string
}

export interface PeriodOption {
  value: string
  label: string
}

export interface StatPill {
  key: string
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

// ============================================================================
// ROOT
// ============================================================================

function TabToolbarRoot({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 px-4 py-2 border-b bg-background',
        'lg:flex lg:items-center lg:flex-nowrap lg:overflow-x-auto',
        '[&>*]:min-w-0',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================================================
// SELECT (generic dropdown filter)
// ============================================================================

function TabToolbarSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('w-32 h-8 text-xs', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ============================================================================
// PERIOD SELECTOR
// ============================================================================

function TabToolbarPeriodSelector({
  options,
  value,
  onChange,
  loading = false,
  icon: Icon = Calendar,
  className,
}: {
  options: PeriodOption[]
  value: string
  onChange: (value: string) => void
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1 ml-auto', className)}>
      <Icon className='h-4 w-4 text-muted-foreground mr-1' />
      {loading ? (
        <>
          {options.map(opt => (
            <Skeleton
              key={opt.value}
              className='h-8'
              style={{
                width: `${Math.max(opt.label.length * 8 + 16, 40)}px`,
              }}
            />
          ))}
        </>
      ) : (
        <>
          {options.map(opt => (
            <Button
              key={opt.value}
              variant={value === opt.value ? 'default' : 'outline'}
              size='sm'
              onClick={() => onChange(opt.value)}
              className='h-8'
              data-testid={`period-option-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
        </>
      )}
    </div>
  )
}

// ============================================================================
// STATS PILLS (inline stat badges)
// ============================================================================

function TabToolbarStatsPills({ items }: { items: StatPill[] }) {
  const format = useFormat()
  const validItems = items.filter(item => item.value != null)

  if (validItems.length === 0) return null

  return (
    <>
      <div className='w-px h-5 bg-border' />
      {validItems.map(item => {
        const Icon = item.icon
        return (
          <div
            key={item.key}
            className='flex items-center gap-1.5 px-2 py-1 text-xs'
          >
            <Icon className={cn('h-3.5 w-3.5', item.color)} />
            <span className='text-muted-foreground'>{item.label}</span>
            <span className={cn('font-bold tabular-nums', item.color)}>
              {format.number(item.value)}
            </span>
          </div>
        )
      })}
    </>
  )
}

// ============================================================================
// SEARCH
// ============================================================================

function TabToolbarSearch({
  placeholder,
  value,
  onChange,
  className,
}: {
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('relative min-w-32 w-64 shrink', className)}>
      <Search className='absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground' />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className='pl-8 h-8 text-xs'
      />
    </div>
  )
}

// ============================================================================
// REFRESH
// ============================================================================

function TabToolbarRefresh({
  onClick,
  loading,
}: {
  onClick: () => void
  loading?: boolean
}) {
  const t = useTelamonjsT()
  return (
    <Button
      variant='outline'
      size='sm'
      onClick={onClick}
      disabled={loading}
      className='h-8'
      aria-label={t('list.refresh')}
    >
      <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
    </Button>
  )
}

// ============================================================================
// COUNTER
// ============================================================================

function TabToolbarCounter({
  count,
  label,
  loading = false,
  className,
  /** When true, `label` already embeds the formatted count (e.g. via ICU `#`) — skip the automatic `{count} ` prefix. */
  countIncluded = false,
}: {
  count: number
  label: string | ((count: number) => string)
  loading?: boolean
  className?: string
  countIncluded?: boolean
}) {
  const format = useFormat()
  if (loading) {
    return <Skeleton className='h-8 w-20 ml-auto' />
  }

  const labelText = typeof label === 'function' ? label(count) : label
  const formattedCount = format.number(count)

  return (
    <span
      className={cn(
        'text-xs text-muted-foreground tabular-nums shrink-0 ml-auto',
        className
      )}
    >
      {countIncluded ? labelText : `${formattedCount} ${labelText}`}
    </span>
  )
}

// ============================================================================
// AUTO REFRESH TOGGLE
// ============================================================================

function TabToolbarAutoRefresh({
  enabled,
  onToggle,
  updatedAt,
  loading = false,
  className,
}: {
  enabled: boolean
  onToggle: () => void
  /** Last successful fetch — shown as "· 15:21" next to the status */
  updatedAt?: number | Date
  /** Initial load: the dot pulses gray */
  loading?: boolean
  className?: string
}) {
  const t = useTelamonjsT()
  const format = useFormat()
  const hasTime = updatedAt !== undefined && Number(updatedAt) > 0
  // Status pill, not a spinner: spinning is reserved for TabToolbar.Refresh
  // while a fetch is in flight.
  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={onToggle}
      aria-pressed={enabled}
      title={enabled ? t('list.autoRefreshPause') : t('list.autoRefreshResume')}
      className={cn(
        'h-8 ml-auto gap-1.5 px-2 text-xs font-medium tabular-nums whitespace-nowrap',
        enabled
          ? 'text-green-700 dark:text-green-400'
          : 'text-muted-foreground',
        className
      )}
      data-testid='toolbar-auto-refresh-toggle'
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full shrink-0',
          loading
            ? 'bg-muted-foreground animate-pulse'
            : enabled
              ? 'bg-green-500 animate-pulse'
              : 'border border-muted-foreground'
        )}
      />
      {enabled ? t('list.autoRefreshLive') : t('list.autoRefreshPaused')}
      {hasTime && (
        <span className='font-normal text-muted-foreground'>
          · {format.time(updatedAt)}
        </span>
      )}
    </Button>
  )
}

// ============================================================================
// FULLSCREEN TOGGLE
// ============================================================================

function TabToolbarFullscreen({
  isFullscreen,
  onToggle,
  className,
}: {
  isFullscreen: boolean
  onToggle: () => void
  className?: string
}) {
  const t = useTelamonjsT()
  return (
    <Button
      variant='outline'
      size='sm'
      onClick={onToggle}
      className={cn('h-8', className)}
      aria-label={
        isFullscreen ? t('list.exitFullscreen') : t('list.enterFullscreenLong')
      }
    >
      {isFullscreen ? (
        <Minimize2 className='h-3.5 w-3.5' />
      ) : (
        <Maximize2 className='h-3.5 w-3.5' />
      )}
    </Button>
  )
}

// ============================================================================
// SPACER (pushes subsequent items to the right)
// ============================================================================

function TabToolbarSpacer() {
  return <div className='flex-1' />
}

// ============================================================================
// LIVE INDICATOR (SSE / WebSocket connection status pill)
// ============================================================================

function TabToolbarLiveIndicator({
  connected,
  onlineLabel = 'Ao vivo',
  offlineLabel = 'Offline',
  className,
}: {
  connected: boolean
  onlineLabel?: string
  offlineLabel?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        connected
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-red-500/10 text-red-500 dark:text-red-400',
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        )}
      />
      {connected ? onlineLabel : offlineLabel}
    </div>
  )
}

// ============================================================================
// FILTER BUTTONS (button group filter, like StatusFilter)
// ============================================================================

export interface FilterButtonOption {
  value: string
  label: string
  /** Dot color class (e.g. 'bg-green-500') */
  dot?: string
  /** CSS class applied when active */
  activeClass?: string
}

function TabToolbarFilterButtons({
  options,
  value,
  onChange,
  className,
  allValue,
}: {
  options: FilterButtonOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  /**
   * Value meaning "no filter": its option is not rendered and an active button
   * toggles back to it. Default: the first option's value.
   */
  allValue?: string
}) {
  // The "all" reset value (the first option unless `allValue`) is not a button
  const resetValue = allValue ?? options[0]?.value ?? ''
  const toggleOptions =
    allValue === undefined
      ? options.slice(1)
      : options.filter(o => o.value !== allValue)
  if (toggleOptions.length === 0) return null

  return (
    <div
      className={cn('inline-flex rounded-md shadow-sm h-8 shrink-0', className)}
      role='group'
    >
      {toggleOptions.map((opt, idx) => {
        const isActive = value === opt.value
        const isFirst = idx === 0
        const isLast = idx === toggleOptions.length - 1

        return (
          <Button
            key={opt.value}
            variant='outline'
            size='sm'
            onClick={() => onChange(isActive ? resetValue : opt.value)}
            className={cn(
              'h-8 rounded-none gap-1.5',
              isFirst && 'rounded-l-md',
              isLast && 'rounded-r-md',
              !isFirst && '-ml-px',
              isActive &&
                (opt.activeClass || 'text-foreground bg-muted/50 font-semibold')
            )}
            data-testid={`filter-button-${opt.value}`}
          >
            {opt.dot && (
              <span className={cn('h-2 w-2 rounded-full shrink-0', opt.dot)} />
            )}
            {opt.label}
          </Button>
        )
      })}
    </div>
  )
}

// ============================================================================
// FILTER SELECT
// ============================================================================

export interface FilterSelectOption {
  value: string
  /** Literal or `msg()` (I18nText) */
  label: I18nText
  /** Dot color class (e.g. 'bg-green-500') */
  dot?: string
  /** Shown right-aligned in the menu (e.g. how many rows match) */
  count?: number
}

function TabToolbarFilterSelect({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: FilterSelectOption[]
  value: string
  onChange: (value: string) => void
  label?: I18nText
  className?: string
}) {
  const t = useTelamonjsT()
  const text = useText()
  const format = useFormat()
  const { open, setOpen, triggerProps, contentProps } = useHoverPopover()

  // First option is "all" — used as reset value
  const allOption = options[0]
  const selectableOptions = options.slice(1)

  const selectedOption = selectableOptions.find(opt => opt.value === value)
  const displayLabel = text(
    selectedOption?.label ?? allOption?.label ?? label ?? t('list.all')
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild {...triggerProps}>
        <Button
          variant='outline'
          size='sm'
          className={cn(
            'h-8 text-xs gap-1.5 shrink-0',
            selectedOption && 'font-semibold',
            className
          )}
          data-testid='toolbar-filter-select-trigger'
        >
          <Filter className='h-3 w-3 text-muted-foreground' />
          {label && (
            <span className='text-muted-foreground'>{text(label)}:</span>
          )}
          {selectedOption?.dot && (
            <span
              className={cn(
                'h-2 w-2 rounded-full shrink-0',
                selectedOption.dot
              )}
            />
          )}
          <span>{displayLabel}</span>
          <ChevronDown className='h-3 w-3 text-muted-foreground' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-auto min-w-[160px] p-1'
        {...contentProps}
      >
        {options.map(opt => {
          const isActive =
            value === opt.value || (!selectedOption && opt === allOption)
          const isAllOption = opt === allOption

          return (
            <button
              key={opt.value}
              onClick={() => {
                onChange(
                  isAllOption
                    ? allOption.value
                    : value === opt.value
                      ? allOption.value
                      : opt.value
                )
                setOpen(false)
              }}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors',
                isActive && 'bg-accent/50 font-medium'
              )}
              data-testid={`filter-select-option-${opt.value}`}
            >
              {opt.dot && (
                <span
                  className={cn('h-2 w-2 rounded-full shrink-0', opt.dot)}
                />
              )}
              {!opt.dot && <span className='w-2' />}
              <span className='flex-1 text-left'>{text(opt.label)}</span>
              {opt.count !== undefined && (
                <span className='text-[10px] font-semibold text-muted-foreground tabular-nums'>
                  {format.number(opt.count)}
                </span>
              )}
              {isActive ? (
                <Check className='h-3 w-3 shrink-0' />
              ) : (
                <span className='w-3 shrink-0' />
              )}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// ADD BUTTON
// ============================================================================

function TabToolbarAddButton({
  onClick,
  label: labelProp,
  className,
  onPrefetch,
}: {
  onClick: () => void
  label?: string
  className?: string
  /** Called on hover/focus, to warm lazy chunks the click will need. */
  onPrefetch?: () => void
}) {
  const t = useTelamonjsT()
  const label = labelProp ?? t('common.create')
  return (
    <Button
      size='sm'
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={cn('h-8', className)}
      data-testid='toolbar-add-button'
    >
      <Plus className='h-3.5 w-3.5 mr-1' />
      {label}
    </Button>
  )
}

// ============================================================================
// DATE RANGE (wraps DateRangePickerDialog)
// ============================================================================

// react-day-picker only loads when a toolbar actually renders a DateRange
const DateRangePickerDialog = React.lazy(() =>
  import('../pickers/DateRangePickerDialog').then(m => ({
    default: m.DateRangePickerDialog,
  }))
)

function TabToolbarDateRange({
  value,
  onChange,
  maxDays = 7,
  labels,
  className,
}: {
  value: DateRange
  onChange: (range: DateRange) => void
  maxDays?: number
  labels?: Partial<DateRangeLabels>
  className?: string
}) {
  return (
    <div className={cn('shrink-0', className)}>
      <React.Suspense fallback={<Skeleton className='h-8 w-40' />}>
        <DateRangePickerDialog
          value={value}
          onChange={onChange}
          maxDays={maxDays}
          labels={labels}
        />
      </React.Suspense>
    </div>
  )
}

// ============================================================================
// COMPOUND EXPORT
// ============================================================================

export const TabToolbar = Object.assign(TabToolbarRoot, {
  Select: TabToolbarSelect,
  PeriodSelector: TabToolbarPeriodSelector,
  StatsPills: TabToolbarStatsPills,
  Search: TabToolbarSearch,
  Refresh: TabToolbarRefresh,
  Counter: TabToolbarCounter,
  AutoRefresh: TabToolbarAutoRefresh,
  Fullscreen: TabToolbarFullscreen,
  Spacer: TabToolbarSpacer,
  LiveIndicator: TabToolbarLiveIndicator,
  FilterButtons: TabToolbarFilterButtons,
  FilterSelect: TabToolbarFilterSelect,
  AddButton: TabToolbarAddButton,
  DateRange: TabToolbarDateRange,
})
