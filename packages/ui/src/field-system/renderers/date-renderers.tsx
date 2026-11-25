'use client'

import React, { useState, ChangeEvent } from 'react'
import { CalendarIcon } from 'lucide-react'
import type { Locale } from 'date-fns'
import { Input } from '../../ui/input'
import { Button } from '../../ui/button'
import { Calendar } from '../../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import {
  DateTimePicker,
  TimePicker,
} from '../../components/datetime/DateTimePicker'
import { getFieldAccessibilityAttrs } from '../../utils/test-ids'
import type { FieldRenderer, FieldRendererProps } from './types'
import { useFormContext } from 'react-hook-form'
import {
  dateLimitField,
  resolveDateLimit,
  toCalendarDay,
  toValidDate,
} from '../date-limits'
import { useDependentValue } from '../../hooks/use-dependent-value'

/**
 * Whether `locale`'s native date order puts the month before the day
 * (e.g. en-US `MM/DD`). Derived from `Intl.DateTimeFormat` — no hardcoded
 * locale table — so any locale date-fns ships is handled correctly.
 */
const isMonthBeforeDay = (locale: Locale): boolean => {
  try {
    const order = new Intl.DateTimeFormat(locale.code, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date(2000, 0, 2))
      .filter(part => part.type === 'day' || part.type === 'month')
      .map(part => part.type)
    return order[0] === 'month'
  } catch {
    return false
  }
}

export const DateRenderer: FieldRenderer = {
  render: ({ field }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    let dateValue
    try {
      dateValue =
        typeof field.value === 'object'
          ? field.value?.toISOString().substring(0, 10)
          : field.value?.substring(0, 10)
    } catch {
      dateValue = null
    }

    return (
      <Input
        type='date'
        {...accessibilityAttrs}
        name={field.name}
        value={dateValue || ''}
        onBlur={field.onBlur}
        ref={field.ref}
        readOnly={field.readOnly}
        required={field.required}
        onChange={(evt: React.ChangeEvent<HTMLInputElement>) => {
          const dt = new Date(evt.target.value)
          const dtDateOnly = new Date(
            dt.valueOf() + dt.getTimezoneOffset() * 60 * 1000
          )
          field.onChange(dtDateOnly)
        }}
      />
    )
  },
}

export const DateTimeRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    // Convert field.value to Date object for DateTimePicker
    let dateValue = null
    if (field.value) {
      try {
        // Handle both Date objects and ISO strings
        dateValue =
          typeof field.value === 'string' ? new Date(field.value) : field.value

        // Check if the date is valid
        if (isNaN(dateValue.getTime())) {
          dateValue = null
        }
      } catch {
        dateValue = null
      }
    }

    return (
      <DateTimePicker
        {...accessibilityAttrs}
        value={dateValue}
        onChange={newValue => {
          // Convert Date back to ISO string for form storage
          field.onChange(newValue ? newValue.toISOString() : '')
        }}
        disabled={field.readOnly}
        placeholder={field.placeholder || t('form.selectDateTime')}
        className='w-full'
      />
    )
  },
}

// Class for the calendar button embedded in the masked input (hybrid fields).
// IMPORTANT: the <Button> must stay INLINE inside <PopoverTrigger asChild> —
// a wrapper component without forwardRef breaks Radix's Slot (onClick never
// reaches the DOM and the popover does not open).
const CALENDAR_TRIGGER_CLASS =
  'absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground'

/** `day` moved inside [min, max] */
const clampToLimits = (day: Date, min?: Date, max?: Date): Date =>
  min && day < min ? min : max && day > max ? max : day

// Convert ISO string to locale-ordered DD/MM/YYYY HH:mm (or MM/DD/YYYY HH:mm) display
const formatDateTimeForDisplay = (
  isoString: string,
  monthFirst: boolean
): string => {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return ''

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    const datePart = monthFirst
      ? `${month}/${day}/${year}`
      : `${day}/${month}/${year}`
    return `${datePart} ${hours}:${minutes}`
  } catch {
    return ''
  }
}

// Apply mask to input value: XX/XX/XXXX HH:mm — the slash/space/colon
// positions don't depend on locale, only which 2-digit group means what
const applyDateTimeMask = (inputValue: string): string => {
  const cleanValue = inputValue.replace(/[^0-9]/g, '')
  let maskedValue = ''

  for (let i = 0; i < cleanValue.length && maskedValue.length < 16; i++) {
    if (maskedValue.length === 2 || maskedValue.length === 5) {
      maskedValue += '/'
    } else if (maskedValue.length === 10) {
      maskedValue += ' '
    } else if (maskedValue.length === 13) {
      maskedValue += ':'
    }
    maskedValue += cleanValue[i]
  }

  return maskedValue
}

// Convert display value to ISO string - only when complete
const parseDateTime = (inputValue: string, monthFirst: boolean): string => {
  if (!inputValue) return ''

  try {
    const cleanValue = inputValue.replace(/[^0-9]/g, '')
    // Only convert when we have complete datetime (at least 12 digits)
    if (cleanValue.length < 12) return ''

    const first = cleanValue.substring(0, 2)
    const second = cleanValue.substring(2, 4)
    const year = cleanValue.substring(4, 8)
    const hours = cleanValue.substring(8, 10)
    const minutes = cleanValue.substring(10, 12)
    const day = monthFirst ? second : first
    const month = monthFirst ? first : second

    // Basic validation
    const dayNum = parseInt(day)
    const monthNum = parseInt(month)
    const yearNum = parseInt(year)
    const hoursNum = parseInt(hours)
    const minutesNum = parseInt(minutes)

    if (
      dayNum < 1 ||
      dayNum > 31 ||
      monthNum < 1 ||
      monthNum > 12 ||
      yearNum < 1900 ||
      yearNum > 2100 ||
      hoursNum < 0 ||
      hoursNum > 23 ||
      minutesNum < 0 ||
      minutesNum > 59
    ) {
      return ''
    }

    const date = new Date(yearNum, monthNum - 1, dayNum, hoursNum, minutesNum)
    if (isNaN(date.getTime())) return ''

    return date.toISOString()
  } catch {
    return ''
  }
}

// Component for MaskedDateTime field — HYBRID: masked typing
// DD/MM/AAAA HH:mm (or MM/DD/YYYY HH:mm in en) + dropdown calendar with time picker
// eslint-disable-next-line react-refresh/only-export-components -- internal component co-located with this file's FieldRenderer registry; splitting it out would break the renderer-per-field-type pattern.
const MaskedDateTimeField = ({
  field,
  t,
  dateFnsLocale,
}: FieldRendererProps) => {
  // Destructured up front, and used (not `field.*`) throughout render: the
  // React Compiler's ref-safety analysis otherwise treats every `field.*`
  // property read as touching the ref once `field.ref` reaches a JSX
  // `ref=` prop — a false positive from react-hook-form's merged field
  // object bundling `.ref` alongside plain values.
  const {
    name: fieldName,
    value: fieldValue,
    onChange: fieldOnChange,
    onBlur: fieldOnBlur,
    ref: fieldRef,
    focus: fieldFocus,
    required: fieldRequired,
    readOnly: fieldReadOnly,
    placeholder: fieldPlaceholder,
    hasError: fieldHasError,
    label: fieldLabel,
    error: fieldError,
    description: fieldDescription,
  } = field

  const accessibilityAttrs = getFieldAccessibilityAttrs({
    name: fieldName,
    label: fieldLabel,
    required: fieldRequired,
    error: fieldError,
    description: fieldDescription,
  })

  const monthFirst = isMonthBeforeDay(dateFnsLocale)

  // Use local state for the display value
  const [displayValue, setDisplayValue] = useState(() =>
    formatDateTimeForDisplay(fieldValue || '', monthFirst)
  )
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Derived state: resync the display buffer when the field value changes
  // externally (form reset, initial load, programmatic set) — compare
  // against the previous value in render instead of an effect.
  const [prevFieldValue, setPrevFieldValue] = useState(fieldValue)
  if (fieldValue !== prevFieldValue) {
    setPrevFieldValue(fieldValue)
    setDisplayValue(formatDateTimeForDisplay(fieldValue || '', monthFirst))
  }

  const selectedDate = toValidDate(fieldValue)

  // Handle input changes
  const handleChange = (ev: ChangeEvent<HTMLInputElement>) => {
    const inputValue = ev.target.value
    const maskedValue = applyDateTimeMask(inputValue)

    setDisplayValue(maskedValue)

    // Only convert to ISO and update field when we have complete datetime
    const cleanValue = maskedValue.replace(/[^0-9]/g, '')
    if (cleanValue.length === 12) {
      const isoValue = parseDateTime(maskedValue, monthFirst)
      if (isoValue) {
        fieldOnChange(isoValue)
      }
    } else if (cleanValue.length === 0) {
      // Clear field if empty
      fieldOnChange('')
    }
    // For incomplete dates (length 1-11), don't update the field value
  }

  // Handle blur - auto-complete with 00:00 if only date is provided
  const handleBlur = (ev: React.FocusEvent<HTMLInputElement>) => {
    const cleanValue = displayValue.replace(/[^0-9]/g, '')

    // If we have exactly 8 digits (complete date but no time), add 00:00
    if (cleanValue.length === 8) {
      const completeDatetime = cleanValue + '0000' // Add 00:00
      const maskedValue = applyDateTimeMask(completeDatetime)

      setDisplayValue(maskedValue)

      // Convert to ISO and update field
      const isoValue = parseDateTime(maskedValue, monthFirst)
      if (isoValue) {
        fieldOnChange(isoValue)
      }
    }

    // Call the original onBlur handler
    fieldOnBlur(ev)
  }

  // Calendar selection: applies the date preserving the current time
  // (or 00:00) and keeps the popover open for time adjustment
  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return
    const merged = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      selectedDate?.getHours() ?? 0,
      selectedDate?.getMinutes() ?? 0,
      0
    )
    setDisplayValue(formatDateTimeForDisplay(merged.toISOString(), monthFirst))
    fieldOnChange(merged.toISOString())
  }

  const handleTimeChange = (date: Date | undefined) => {
    if (!date) return
    setDisplayValue(formatDateTimeForDisplay(date.toISOString(), monthFirst))
    fieldOnChange(date.toISOString())
  }

  return (
    <div className='relative'>
      <Input
        type='text'
        {...accessibilityAttrs}
        name={fieldName}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        ref={fieldRef}
        autoFocus={fieldFocus}
        required={fieldRequired}
        disabled={fieldReadOnly}
        placeholder={fieldPlaceholder || t('form.dateTimePlaceholder')}
        maxLength={16}
        className={`pr-9 ${fieldHasError ? 'border-red-500 focus:border-red-500' : ''}`}
      />
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            disabled={fieldReadOnly}
            aria-label={t('form.openCalendar')}
            data-testid='calendar-trigger'
            className={CALENDAR_TRIGGER_CLASS}
          >
            <CalendarIcon className='h-4 w-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='end'>
          <Calendar
            mode='single'
            locale={dateFnsLocale}
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={handleCalendarSelect}
            autoFocus
          />
          <div className='border-t border-border p-3'>
            {selectedDate ? (
              <TimePicker
                date={selectedDate}
                onChange={handleTimeChange}
                granularity='minute'
              />
            ) : (
              <p className='text-center text-xs text-muted-foreground'>
                {t('form.selectDateForTime')}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export const MaskedDateTimeRenderer: FieldRenderer = {
  render: props => <MaskedDateTimeField {...props} />,
}

// Convert ISO string to locale-ordered DD/MM/YYYY (or MM/DD/YYYY) display
const formatDateForDisplay = (
  isoString: string,
  monthFirst: boolean
): string => {
  const date = toCalendarDay(isoString)
  if (!date) return ''

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear().toString()

  return monthFirst ? `${month}/${day}/${year}` : `${day}/${month}/${year}`
}

// Apply mask XX/XX/XXXX — slash positions don't depend on locale, only
// which 2-digit group means what
const applyDateMask = (inputValue: string): string => {
  const cleanValue = inputValue.replace(/[^0-9]/g, '')
  let maskedValue = ''

  for (let i = 0; i < cleanValue.length && maskedValue.length < 10; i++) {
    if (maskedValue.length === 2 || maskedValue.length === 5) {
      maskedValue += '/'
    }
    maskedValue += cleanValue[i]
  }

  return maskedValue
}

// Convert display value to ISO string - only when complete
const parseDate = (inputValue: string, monthFirst: boolean): string => {
  if (!inputValue) return ''

  try {
    const cleanValue = inputValue.replace(/[^0-9]/g, '')
    if (cleanValue.length < 8) return ''

    const first = cleanValue.substring(0, 2)
    const second = cleanValue.substring(2, 4)
    const year = cleanValue.substring(4, 8)
    const day = monthFirst ? second : first
    const month = monthFirst ? first : second

    const dayNum = parseInt(day)
    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    if (
      dayNum < 1 ||
      dayNum > 31 ||
      monthNum < 1 ||
      monthNum > 12 ||
      yearNum < 1900 ||
      yearNum > 2100
    ) {
      return ''
    }

    const date = new Date(yearNum, monthNum - 1, dayNum, 12, 0, 0)
    if (isNaN(date.getTime())) return ''

    return date.toISOString()
  } catch {
    return ''
  }
}

// Component for MaskedDate field — HYBRID: masked typing DD/MM/AAAA
// (or MM/DD/YYYY in en) + dropdown calendar
// eslint-disable-next-line react-refresh/only-export-components -- internal component co-located with this file's FieldRenderer registry; splitting it out would break the renderer-per-field-type pattern.
const MaskedDateField = ({ field, t, dateFnsLocale }: FieldRendererProps) => {
  // Same react-hook-form / React Compiler ref taint as MaskedDateTimeField
  // above: destructure and use locals (not `field.*`) throughout render.
  const {
    name: fieldName,
    value: fieldValue,
    onChange: fieldOnChange,
    onBlur: fieldOnBlur,
    ref: fieldRef,
    focus: fieldFocus,
    required: fieldRequired,
    readOnly: fieldReadOnly,
    placeholder: fieldPlaceholder,
    hasError: fieldHasError,
    label: fieldLabel,
    error: fieldError,
    description: fieldDescription,
    minDate: fieldMinDate,
    maxDate: fieldMaxDate,
  } = field
  // Limits may depend on other fields (`minDate: v => v.emissao`): read the
  // form values at render — opening the calendar re-renders, so they're fresh.
  // A `{ field }` limit also subscribes to that field, so an open calendar
  // follows it too.
  useDependentValue(dateLimitField(fieldMinDate))
  useDependentValue(dateLimitField(fieldMaxDate))
  const formValues = (useFormContext()?.getValues() ?? {}) as Record<
    string,
    unknown
  >
  const minDay = resolveDateLimit(fieldMinDate, formValues)
  const maxDay = resolveDateLimit(fieldMaxDate, formValues)
  const disabledDays = [
    ...(minDay ? [{ before: minDay }] : []),
    ...(maxDay ? [{ after: maxDay }] : []),
  ]

  const accessibilityAttrs = getFieldAccessibilityAttrs({
    name: fieldName,
    label: fieldLabel,
    required: fieldRequired,
    error: fieldError,
    description: fieldDescription,
  })

  const monthFirst = isMonthBeforeDay(dateFnsLocale)

  const [displayValue, setDisplayValue] = useState(() =>
    formatDateForDisplay(fieldValue || '', monthFirst)
  )
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Derived state: resync the display buffer when the field value changes
  // externally — compare against the previous value in render.
  const [prevFieldValue, setPrevFieldValue] = useState(fieldValue)
  if (fieldValue !== prevFieldValue) {
    setPrevFieldValue(fieldValue)
    setDisplayValue(formatDateForDisplay(fieldValue || '', monthFirst))
  }

  const selectedDate = toCalendarDay(fieldValue)

  const handleChange = (ev: ChangeEvent<HTMLInputElement>) => {
    const inputValue = ev.target.value
    const maskedValue = applyDateMask(inputValue)

    setDisplayValue(maskedValue)

    const cleanValue = maskedValue.replace(/[^0-9]/g, '')
    if (cleanValue.length === 8) {
      const isoValue = parseDate(maskedValue, monthFirst)
      if (isoValue) {
        fieldOnChange(isoValue)
      }
    } else if (cleanValue.length === 0) {
      fieldOnChange('')
    }
  }

  // Calendar selection: noon avoids timezone shift (same pattern as
  // parseDate) and closes the popover
  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return
    const normalized = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12,
      0,
      0
    )
    setDisplayValue(formatDateForDisplay(normalized.toISOString(), monthFirst))
    fieldOnChange(normalized.toISOString())
    setCalendarOpen(false)
  }

  return (
    <div className='relative'>
      <Input
        type='text'
        inputMode='numeric'
        {...accessibilityAttrs}
        name={fieldName}
        value={displayValue}
        onChange={handleChange}
        onBlur={fieldOnBlur}
        ref={fieldRef}
        autoFocus={fieldFocus}
        required={fieldRequired}
        disabled={fieldReadOnly}
        placeholder={fieldPlaceholder || t('form.datePlaceholder')}
        maxLength={10}
        className={`pr-9 ${fieldHasError ? 'border-red-500 focus:border-red-500' : ''}`}
      />
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            disabled={fieldReadOnly}
            aria-label={t('form.openCalendar')}
            data-testid='calendar-trigger'
            className={CALENDAR_TRIGGER_CLASS}
          >
            <CalendarIcon className='h-4 w-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='end'>
          <Calendar
            mode='single'
            locale={dateFnsLocale}
            selected={selectedDate}
            // empty field: open on the month the limits allow, not on today's
            defaultMonth={
              selectedDate ?? clampToLimits(new Date(), minDay, maxDay)
            }
            onSelect={handleCalendarSelect}
            disabled={disabledDays.length ? disabledDays : undefined}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export const MaskedDateRenderer: FieldRenderer = {
  render: props => <MaskedDateField {...props} />,
}
