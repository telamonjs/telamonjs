'use client'

import { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { useLocale } from 'next-intl'
import { cn } from '../../utils/cn'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Slider } from '../../ui/slider'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../../ui/dialog'
import { useTelamonjsT } from '../../i18n/use-t'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'

// ============================================================================
// Types
// ============================================================================

export interface DateTimeLabels {
  months: string[]
  weekdays: string[]
  timeLabel: string
  confirmButton: string
  selectTitle: string
  placeholder: string
}

/** Full month names for the given locale, native `Intl` — no manual translation table. */
function monthNames(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' })
  return Array.from({ length: 12 }, (_, month) =>
    formatter.format(new Date(2000, month, 1))
  )
}

/** Single-letter weekday headers (Sun..Sat) for the given locale. */
function weekdayLetters(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, day) =>
    formatter.format(new Date(2023, 0, 1 + day))
  )
}

export interface DateTimePickerDialogProps {
  value: Date | null
  onChange: (date: Date) => void
  label: string
  minDate?: Date
  maxDate?: Date
  labels?: Partial<DateTimeLabels>
}

// ============================================================================
// Helpers
// ============================================================================

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
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

export function DateTimePickerDialog({
  value,
  onChange,
  label,
  minDate,
  maxDate,
  labels: labelsProp
}: DateTimePickerDialogProps) {
  const t = useTelamonjsT()
  const locale = useLocale()
  const dateFnsLocale = useDateFnsLocale()
  const defaultLabels: DateTimeLabels = useMemo(
    () => ({
      months: monthNames(locale),
      weekdays: weekdayLetters(locale),
      timeLabel: t('pickers.timeLabel'),
      confirmButton: t('common.confirm'),
      selectTitle: t('pickers.selectTitle'),
      placeholder: t('pickers.selectTitle'),
    }),
    [locale, t]
  )
  const labels = { ...defaultLabels, ...labelsProp }

  const fallback = value ?? minDate ?? new Date()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(fallback)
  const [viewDate, setViewDate] = useState(fallback)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const days = useMemo(() => {
    const result: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) result.push(null)
    for (let i = 1; i <= daysInMonth; i++) result.push(i)
    // Always 6 rows (42 cells) so height doesn't change between months
    while (result.length < 42) result.push(null)
    return result
  }, [firstDay, daysInMonth])

  const sliderValue = timeToSliderValue(draft)

  const handleDayClick = useCallback(
    (day: number) => {
      setDraft(
        (prev) => new Date(year, month, day, prev.getHours(), prev.getMinutes())
      )
    },
    [year, month]
  )

  const handleSliderChange = useCallback((vals: number[]) => {
    const { hours, minutes } = sliderValueToTime(vals[0])
    setDraft(
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

  const handlePrevMonth = useCallback(() => {
    setViewDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }, [])

  const handleNextMonth = useCallback(() => {
    setViewDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }, [])

  const isDayDisabled = useCallback(
    (day: number) => {
      const date = new Date(year, month, day)
      // Compare date-only (strip time)
      if (minDate) {
        const min = new Date(
          minDate.getFullYear(),
          minDate.getMonth(),
          minDate.getDate()
        )
        if (date < min) return true
      }
      if (maxDate) {
        const max = new Date(
          maxDate.getFullYear(),
          maxDate.getMonth(),
          maxDate.getDate()
        )
        if (date > max) return true
      }
      return false
    },
    [year, month, minDate, maxDate]
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        const initial = value ?? minDate ?? new Date()
        setDraft(initial)
        setViewDate(initial)
      }
      setOpen(nextOpen)
    },
    [value, minDate]
  )

  const handleConfirm = useCallback(() => {
    onChange(draft)
    setOpen(false)
  }, [draft, onChange])

  const isSelected = (day: number) =>
    draft.getDate() === day &&
    draft.getMonth() === month &&
    draft.getFullYear() === year

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-left cursor-pointer',
            !value && 'text-muted-foreground'
          )}
          data-testid='datetime-picker-trigger'
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span suppressHydrationWarning>
            {value
              ? format(value, 'dd/MM/yyyy, HH:mm', { locale: dateFnsLocale })
              : labels.placeholder}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[340px] p-0 select-none">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm font-semibold">
            {labels.selectTitle} {label}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevMonth}
              aria-label={t('pickers.prevMonth')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {labels.months[month]} {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextMonth}
              aria-label={t('pickers.nextMonth')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0">
            {labels.weekdays.map((day, i) => (
              <div
                key={i}
                className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((day, i) => (
              <div key={i} className="flex items-center justify-center h-8">
                {day !== null && (
                  <button
                    type="button"
                    onClick={() => !isDayDisabled(day) && handleDayClick(day)}
                    disabled={isDayDisabled(day)}
                    className={cn(
                      'h-7 w-7 rounded-md text-xs transition-colors',
                      isDayDisabled(day)
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'hover:bg-accent hover:text-accent-foreground',
                      isSelected(day) &&
                        !isDayDisabled(day) &&
                        'bg-blue-600 text-white hover:bg-blue-700',
                      isToday(day) &&
                        !isSelected(day) &&
                        !isDayDisabled(day) &&
                        'ring-1 ring-blue-300',
                      !isSelected(day) &&
                        !isToday(day) &&
                        !isDayDisabled(day) &&
                        'text-foreground'
                    )}
                    data-testid={`datetime-picker-day-${year}-${month}-${day}`}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Time slider */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{labels.timeLabel}</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatSliderTime(sliderValue)}
            </span>
          </div>
          <Slider
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            min={0}
            max={47}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-1 mb-2">
            {['00:00', '06:00', '12:00', '18:00', '23:30'].map((t) => (
              <span key={t} className="text-[10px] text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Confirm button */}
        <div className="px-4 pb-4 flex justify-end">
          <Button
            size="sm"
            className="px-6"
            onClick={handleConfirm}
            data-testid='datetime-picker-confirm'
          >
            {labels.confirmButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
