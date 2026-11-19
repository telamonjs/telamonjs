'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useHoverPopover } from '../../hooks/use-hover-popover'
import {
  format,
  subHours,
  subDays,
  differenceInHours,
  differenceInDays
} from 'date-fns'
import { cn } from '../../utils/cn'
import { Calendar as CalendarIcon, ChevronsUpDown, Clock as ClockIcon } from 'lucide-react'
import { WheelSlider } from '../../ui/wheel-slider'
import { Button } from '../../ui/button'
import { Calendar } from '../../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { useTelamonjsT } from '../../i18n/use-t'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
  start: Date
  end: Date | null
}

export interface DateRangeLabels {
  startTime: string
  endTime: string
  now: string
}

export interface DateRangePickerDialogProps {
  value: DateRange
  onChange: (range: DateRange) => void
  minDate?: Date
  maxDate?: Date
  maxDays?: number
  labels?: Partial<DateRangeLabels>
}

// ============================================================================
// Presets
// ============================================================================

type PresetKey = '6h' | '12h' | '24h' | '3d' | '7d'

const PRESETS: Array<{
  key: PresetKey
  label: string
  getRange: () => DateRange
}> = [
  {
    key: '6h',
    label: '6h',
    getRange: () => ({ start: subHours(new Date(), 6), end: new Date() })
  },
  {
    key: '12h',
    label: '12h',
    getRange: () => ({ start: subHours(new Date(), 12), end: new Date() })
  },
  {
    key: '24h',
    label: '24h',
    getRange: () => ({ start: subHours(new Date(), 24), end: new Date() })
  },
  {
    key: '3d',
    label: '3d',
    getRange: () => ({ start: subDays(new Date(), 3), end: new Date() })
  },
  {
    key: '7d',
    label: '7d',
    getRange: () => ({ start: subDays(new Date(), 7), end: new Date() })
  }
]

function getActivePreset(range: DateRange): PresetKey | null {
  if (!range.end) return null
  const now = new Date()
  const diffH = (now.getTime() - range.start.getTime()) / (1000 * 60 * 60)
  const endDiffMin = Math.abs(now.getTime() - range.end.getTime()) / (1000 * 60)
  if (endDiffMin > 5) return null
  if (Math.abs(diffH - 6) < 0.5) return '6h'
  if (Math.abs(diffH - 12) < 0.5) return '12h'
  if (Math.abs(diffH - 24) < 1) return '24h'
  if (Math.abs(diffH - 72) < 2) return '3d'
  if (Math.abs(diffH - 168) < 6) return '7d'
  return null
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(start: Date, end: Date | null): string {
  if (!end) return '--'
  const hours = differenceInHours(end, start)
  if (hours < 24) return `${hours}h`
  const days = differenceInDays(end, start)
  const remainingHours = hours - days * 24
  if (remainingHours === 0) return `${days}d`
  return `${days}d ${remainingHours}h`
}

function timeToSliderValue(date: Date): number {
  return date.getHours() * 2 + (date.getMinutes() >= 30 ? 1 : 0)
}

function sliderValueToTime(val: number): { hours: number; minutes: number } {
  return { hours: Math.floor(val / 2), minutes: (val % 2) * 30 }
}

function formatSliderTime(val: number): string {
  const { hours, minutes } = sliderValueToTime(val)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// ============================================================================
// Component
// ============================================================================

export function DateRangePickerDialog({
  value,
  onChange,
  minDate,
  maxDate,
  maxDays = 7,
  labels: labelsProp
}: DateRangePickerDialogProps) {
  const t = useTelamonjsT()
  const dateFnsLocale = useDateFnsLocale()
  const defaultLabels: DateRangeLabels = {
    startTime: t('pickers.start'),
    endTime: t('pickers.end'),
    now: t('pickers.now'),
  }
  const labels = { ...defaultLabels, ...labelsProp }

  const [draftStart, setDraftStart] = useState(value.start)
  const [draftEnd, setDraftEnd] = useState(value.end ?? new Date())

  // Calendar range state (separate to handle incomplete two-click selection)
  const [calRange, setCalRange] = useState<
    { from: Date; to?: Date } | undefined
  >({ from: value.start, to: value.end ?? new Date() })

  // Manual click tracking: true = next click sets start, false = next click sets end
  const [awaitingEnd, setAwaitingEnd] = useState(false)
  const clickedStartRef = useRef<Date | null>(null)

  // Refs for stable access in close callback. Synced in an effect (not
  // during render) so the refs stay read-only during render, per the rules
  // of React.
  const draftStartRef = useRef(draftStart)
  const draftEndRef = useRef(draftEnd)
  const commitRef = useRef(false)
  useEffect(() => {
    draftStartRef.current = draftStart
    draftEndRef.current = draftEnd
  })

  const sliderStartValue = timeToSliderValue(draftStart)
  const sliderEndValue = timeToSliderValue(draftEnd)

  const duration = useMemo(
    () => formatDuration(value.start, value.end),
    [value.start, value.end]
  )
  const activePreset = getActivePreset(value)

  // Open/close business logic (state managed by useHoverPopover)
  const handleOpenStateChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        const s = value.start
        const e = value.end ?? new Date()
        setDraftStart(s)
        setDraftEnd(e)
        setCalRange({ from: s, to: e })
        setAwaitingEnd(false)
        clickedStartRef.current = null
        commitRef.current = false
      } else if (!commitRef.current) {
        // Commit draft on close
        const ds = draftStartRef.current
        const de = draftEndRef.current
        const maxEndDate = new Date(
          ds.getTime() + maxDays * 24 * 60 * 60 * 1000
        )
        const finalEnd = de > maxEndDate ? maxEndDate : de
        onChange({ start: ds, end: finalEnd })
      }
    },
    [value, maxDays, onChange]
  )

  const { open, setOpen, triggerProps, contentProps } = useHoverPopover({
    onOpenChange: handleOpenStateChange
  })

  // Calendar range selection — manual two-click tracking
  // 1st click: set start | 2nd click: set end | 3rd click: reset + new start
  const handleCalendarSelect = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_range: any, triggerDay: Date) => {
      if (!awaitingEnd) {
        // 1st click (or 3rd = reset): set start
        clickedStartRef.current = triggerDay
        setCalRange({ from: triggerDay })
        setDraftStart((prev) => {
          const d = new Date(triggerDay)
          d.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
          return d
        })
        setDraftEnd((prev) => {
          const d = new Date(triggerDay)
          d.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
          return d
        })
        setAwaitingEnd(true)
      } else {
        // 2nd click: set end, sort for display
        const startDay = clickedStartRef.current ?? triggerDay
        const endDay = triggerDay
        const from = startDay <= endDay ? startDay : endDay
        const to = startDay <= endDay ? endDay : startDay

        setCalRange({ from, to })
        setDraftStart((prev) => {
          const d = new Date(from)
          d.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
          return d
        })
        setDraftEnd((prev) => {
          const d = new Date(to)
          d.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
          return d
        })
        setAwaitingEnd(false)
        clickedStartRef.current = null
      }
    },
    [awaitingEnd]
  )

  // Disabled days
  const disabledDays = useMemo(() => {
    const matchers: Array<{ before: Date } | { after: Date }> = []
    if (minDate) matchers.push({ before: minDate })
    if (maxDate) matchers.push({ after: maxDate })
    return matchers.length > 0 ? matchers : undefined
  }, [minDate, maxDate])

  // Time sliders — row refs for wheel area
  const startRowRef = useRef<HTMLDivElement>(null)
  const endRowRef = useRef<HTMLDivElement>(null)

  const handleStartTimeChange = useCallback((vals: number[]) => {
    const { hours, minutes } = sliderValueToTime(vals[0])
    setDraftStart(
      (prev) =>
        new Date(
          prev.getFullYear(),
          prev.getMonth(),
          prev.getDate(),
          hours,
          minutes
        )
    )
  }, [])

  const handleEndTimeChange = useCallback((vals: number[]) => {
    const { hours, minutes } = sliderValueToTime(vals[0])
    setDraftEnd(
      (prev) =>
        new Date(
          prev.getFullYear(),
          prev.getMonth(),
          prev.getDate(),
          hours,
          minutes
        )
    )
  }, [])

  // Presets
  const handlePresetClick = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      commitRef.current = true
      onChange(preset.getRange())
      setOpen(false)
    },
    [onChange, setOpen]
  )

  // Draft summary
  const draftDuration = useMemo(
    () => formatDuration(draftStart, draftEnd),
    [draftStart, draftEnd]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          {...triggerProps}
          className={cn(
            'h-8 justify-between gap-2 text-xs font-medium min-w-[280px] max-w-[400px]'
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-blue-600" />
          <span
            className="truncate flex-1 text-left tabular-nums"
            suppressHydrationWarning
          >
            {format(value.start, 'dd MMM HH:mm', { locale: dateFnsLocale })}
            {' → '}
            {value.end
              ? format(value.end, 'dd MMM HH:mm', { locale: dateFnsLocale })
              : labels.now}
          </span>
          {duration !== '--' && (
            <span className="shrink-0 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-semibold">
              {duration}
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start" {...contentProps}>
        <div className="p-3 space-y-3 select-none" style={{ width: 340 }}>
          {/* Presets */}
          <div className="flex gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'flex-1 h-7 rounded-md text-xs font-medium transition-colors',
                  activePreset === preset.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground'
                )}
                data-testid={`date-range-preset-${preset.key}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="h-px bg-border" />

          {/* Calendar — min-h ensures 5 week rows even for short months */}
          <div className="min-h-[296px]">
            <Calendar
              mode="range"
              selected={calRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={1}
              locale={dateFnsLocale}
              disabled={disabledDays}
              className="p-0"
            />
          </div>

          <div className="h-px bg-border" />

          {/* Time sliders */}
          <div className="space-y-2.5">
            <div ref={startRowRef} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10 shrink-0">
                {labels.startTime}
              </span>
              <WheelSlider
                value={[sliderStartValue]}
                onValueChange={handleStartTimeChange}
                wheelContainerRef={startRowRef}
                min={0}
                max={47}
                step={1}
                className="flex-1"
              />
              <span className="text-xs font-semibold tabular-nums w-12 text-right">
                {formatSliderTime(sliderStartValue)}
              </span>
            </div>
            <div ref={endRowRef} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10 shrink-0">
                {labels.endTime}
              </span>
              <WheelSlider
                value={[sliderEndValue]}
                onValueChange={handleEndTimeChange}
                wheelContainerRef={endRowRef}
                min={0}
                max={47}
                step={1}
                className="flex-1"
              />
              <span className="text-xs font-semibold tabular-nums w-12 text-right">
                {formatSliderTime(sliderEndValue)}
              </span>
            </div>
          </div>

          {/* Summary footer */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
            <ClockIcon className="h-3 w-3 shrink-0" />
            <span className="tabular-nums" suppressHydrationWarning>
              {format(draftStart, 'dd/MM HH:mm')} →{' '}
              {format(draftEnd, 'dd/MM HH:mm')}
            </span>
            <span className="ml-auto font-medium text-foreground">
              ({draftDuration})
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
