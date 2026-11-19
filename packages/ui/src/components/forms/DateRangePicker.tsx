/**
 * DateRangePicker Component
 *
 * Date range picker with presets for common ranges.
 * Supports start/end date selection with calendar popup.
 *
 * @example
 * <DateRangePicker
 *   value={{ from: startDate, to: endDate }}
 *   onChange={(range) => setRange(range)}
 *   presets={[
 *     { label: 'Last 7 days', value: { from: ..., to: ... } },
 *     { label: 'Last 30 days', value: { from: ..., to: ... } }
 *   ]}
 * />
 */

'use client'

import React, { useState } from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Calendar } from '../../ui/calendar'
import { Button } from '../../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { cn } from '../../utils'
import { useTelamonjsT } from '../../i18n/use-t'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'

export interface DateRange {
  from: Date | undefined
  to?: Date | undefined
}

export interface DateRangePreset {
  label: string
  value: DateRange
}

export interface DateRangePickerProps {
  /** Current date range */
  value?: DateRange
  /** Callback when range changes */
  onChange?: (range: DateRange) => void
  /** Placeholder text */
  placeholder?: string
  /** Disable picker */
  disabled?: boolean
  /** Preset ranges */
  presets?: DateRangePreset[]
  /** Class name for container */
  className?: string
  /** Error message */
  error?: string
}

function buildDefaultPresets(t: ReturnType<typeof useTelamonjsT>): DateRangePreset[] {
  return [
    {
      label: t('pickers.last7Days'),
      value: {
        from: subDays(new Date(), 6),
        to: new Date(),
      },
    },
    {
      label: t('pickers.last30Days'),
      value: {
        from: subDays(new Date(), 29),
        to: new Date(),
      },
    },
    {
      label: t('pickers.thisMonth'),
      value: {
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      },
    },
    {
      label: t('pickers.lastMonth'),
      value: {
        from: startOfMonth(subMonths(new Date(), 1)),
        to: endOfMonth(subMonths(new Date(), 1)),
      },
    },
  ]
}

function formatDateRange(range: DateRange): string {
  if (!range.from) return ''

  if (!range.to) {
    return format(range.from, 'dd/MM/yyyy')
  }

  return `${format(range.from, 'dd/MM/yyyy')} - ${format(range.to, 'dd/MM/yyyy')}`
}

export function DateRangePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  presets,
  className,
  error,
}: DateRangePickerProps) {
  const t = useTelamonjsT()
  const dateFnsLocale = useDateFnsLocale()
  const resolvedPlaceholder = placeholder || t('form.selectRange')
  const resolvedPresets = presets ?? buildDefaultPresets(t)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<DateRange | undefined>(value)
  // Reset internal state when the value prop changes (React "adjusting
  // state when a prop changes" pattern — avoids an extra effect + render).
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setDate(value)
  }

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range)
    onChange?.(range || { from: undefined, to: undefined })

    // Close popover if both dates are selected
    if (range?.from && range?.to) {
      setOpen(false)
    }
  }

  const handlePresetClick = (preset: DateRangePreset) => {
    handleSelect(preset.value)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleSelect({ from: undefined, to: undefined })
  }

  const hasValue = date?.from || date?.to

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            disabled={disabled}
            data-testid='date-range-picker-trigger'
            className={cn(
              'w-full justify-start text-left font-normal',
              !hasValue && 'text-muted-foreground',
              error && 'border-red-500'
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {hasValue ? formatDateRange(date!) : resolvedPlaceholder}
            {hasValue && !disabled && (
              <X
                className='ml-auto h-4 w-4 opacity-50 hover:opacity-100'
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <div className='flex'>
            {/* Presets Sidebar */}
            {resolvedPresets.length > 0 && (
              <>
                <div className='flex flex-col gap-1 p-3 border-r'>
                  <p className='text-xs font-semibold text-muted-foreground mb-1'>
                    {t('pickers.periods')}
                  </p>
                  {resolvedPresets.map(preset => (
                    <Button
                      key={preset.label}
                      variant='ghost'
                      size='sm'
                      className='justify-start'
                      data-testid={`date-range-preset-${preset.label}`}
                      onClick={() => handlePresetClick(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </>
            )}

            {/* Calendar */}
            <div className='p-3'>
              <Calendar
                mode='range'
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
                locale={dateFnsLocale}
                disabled={disabled}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className='text-sm text-red-600'>{error}</p>}
    </div>
  )
}
