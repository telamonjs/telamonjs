/**
 * TimePicker Component
 *
 * Time picker with hours/minutes selection.
 * Supports 12h/24h format and step minutes.
 *
 * @example
 * <TimePicker
 *   value="14:30"
 *   onChange={(time) => setTime(time)}
 *   format="24h"
 *   step={15}
 * />
 */

'use client'

import React, { useState, useMemo } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { ScrollArea } from '../../ui/scroll-area'
import { cn } from '../../utils'
import { useTelamonjsT } from '../../i18n/use-t'

export interface TimePickerProps {
  /** Current time value (HH:mm format) */
  value?: string
  /** Callback when time changes */
  onChange?: (time: string) => void
  /** Time format */
  format?: '12h' | '24h'
  /** Step for minutes (1, 5, 15, 30) */
  step?: number
  /** Disable picker */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Class name for container */
  className?: string
  /** Error message */
  error?: string
}

interface ParsedTime {
  hours: number
  minutes: number
  period?: 'AM' | 'PM'
}

function parseTime(
  timeString: string,
  format: '12h' | '24h'
): ParsedTime | null {
  if (!timeString) return null

  const match = timeString.match(/^(\d{1,2}):(\d{2})(\s*(AM|PM))?$/i)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const period = match[4]?.toUpperCase() as 'AM' | 'PM' | undefined

  if (format === '12h' && period) {
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return { hours, minutes, period }
}

function formatTime(
  hours: number,
  minutes: number,
  format: '12h' | '24h'
): string {
  if (format === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function generateTimeOptions(step: number, format: '12h' | '24h'): string[] {
  const options: string[] = []
  const maxHours = format === '12h' ? 12 : 24

  for (let hour = 0; hour < maxHours; hour++) {
    for (let minute = 0; minute < 60; minute += step) {
      if (format === '12h') {
        const displayHour = hour === 0 ? 12 : hour
        const amPm = hour < 12 ? 'AM' : 'PM'
        options.push(
          `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${amPm}`
        )
      } else {
        options.push(
          `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        )
      }
    }
  }

  return options
}

export function TimePicker({
  value = '',
  onChange,
  format = '24h',
  step = 15,
  disabled = false,
  placeholder,
  className,
  error,
}: TimePickerProps) {
  const t = useTelamonjsT()
  const resolvedPlaceholder = placeholder || t('form.selectTime')
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  // Reset input when the value prop changes (React "adjusting state when a
  // prop changes" pattern — avoids an extra effect + render).
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setInputValue(value)
  }

  const timeOptions = useMemo(
    () => generateTimeOptions(step, format),
    [step, format]
  )

  const handleSelect = (time: string) => {
    setInputValue(time)
    onChange?.(time)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Validate and call onChange if valid
    const parsed = parseTime(newValue, format)
    if (parsed) {
      const formatted = formatTime(parsed.hours, parsed.minutes, format)
      onChange?.(formatted)
    }
  }

  const handleInputBlur = () => {
    // Reformat on blur if valid
    const parsed = parseTime(inputValue, format)
    if (parsed) {
      const formatted = formatTime(parsed.hours, parsed.minutes, format)
      setInputValue(formatted)
      onChange?.(formatted)
    } else if (inputValue) {
      // Invalid input, reset to previous value
      setInputValue(value)
    }
  }

  const displayValue = inputValue || resolvedPlaceholder

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            disabled={disabled}
            data-testid='time-picker-trigger'
            className={cn(
              'w-full justify-start text-left font-normal',
              !inputValue && 'text-muted-foreground',
              error && 'border-red-500'
            )}
          >
            <Clock className='mr-2 h-4 w-4' />
            {displayValue}
            <ChevronDown className='ml-auto h-4 w-4 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[200px] p-0' align='start'>
          <div className='p-2 border-b'>
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder={format === '12h' ? 'HH:MM AM/PM' : 'HH:MM'}
              disabled={disabled}
              className='h-8'
            />
          </div>
          <ScrollArea className='h-[200px]'>
            <div className='p-1'>
              {timeOptions.map(time => (
                <Button
                  key={time}
                  variant={inputValue === time ? 'default' : 'ghost'}
                  size='sm'
                  className='w-full justify-start'
                  data-testid={`time-picker-option-${time}`}
                  onClick={() => handleSelect(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {error && <p className='text-sm text-red-600'>{error}</p>}
    </div>
  )
}
