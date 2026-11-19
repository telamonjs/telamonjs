'use client'

import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group'
import { useTelamonjsT } from '../../i18n/use-t'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'

// Component day order is Monday-first; date-fns `localize.day` is
// Sunday-first (0 = Sunday). This maps array index -> date-fns day-of-week.
const DATE_FNS_DAY_OF_WEEK = [1, 2, 3, 4, 5, 6, 0] as const

export interface WeekDayLabel {
  label: string
  shortLabel: string
}

export interface WeekDaysLabels {
  /** 7 entries, index 0 = Monday */
  days: WeekDayLabel[]
  /** Text shown before the selected days summary */
  selectedText: string
  /** Text shown when no days are selected */
  noneText: string
}

interface WeekDay {
  index: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  key: string
  label: string
  shortLabel: string
}

function buildWeekDays(labels: WeekDaysLabels): WeekDay[] {
  // Order: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
  const dayKeys = [
    'segunda',
    'terca',
    'quarta',
    'quinta',
    'sexta',
    'sabado',
    'domingo',
  ]
  const dayIndices = [1, 2, 3, 4, 5, 6, 0]

  return labels.days.map((day, i) => ({
    index: dayIndices[i],
    key: dayKeys[i],
    label: day.label,
    shortLabel: day.shortLabel,
  }))
}

export interface WeekDaysSelectorProps {
  id?: string
  value?: number[]
  onChange?: (value: number[]) => void
  labels?: Partial<WeekDaysLabels>
}

export const WeekDaysSelector = ({
  value = [],
  onChange,
  labels: labelsProp,
}: WeekDaysSelectorProps) => {
  const t = useTelamonjsT()
  const dateFnsLocale = useDateFnsLocale()
  // `width: 'short'` — the only width that's actually abbreviated for every
  // locale we ship (pt-BR's 'abbreviated' width falls back to full names,
  // e.g. 'segunda' instead of 'SEG'); short + uppercase reproduces the old
  // hardcoded pt-BR labels exactly ('SEG', 'TER', ...) and gives 2-letter
  // abbreviations for en/es.
  const shortLabelFor = (i: number) =>
    dateFnsLocale.localize
      .day(DATE_FNS_DAY_OF_WEEK[i], { width: 'short' })
      .toUpperCase()
  const defaultLabels: WeekDaysLabels = {
    days: [
      { label: t('form.weekDays.monday'), shortLabel: shortLabelFor(0) },
      { label: t('form.weekDays.tuesday'), shortLabel: shortLabelFor(1) },
      { label: t('form.weekDays.wednesday'), shortLabel: shortLabelFor(2) },
      { label: t('form.weekDays.thursday'), shortLabel: shortLabelFor(3) },
      { label: t('form.weekDays.friday'), shortLabel: shortLabelFor(4) },
      { label: t('form.weekDays.saturday'), shortLabel: shortLabelFor(5) },
      { label: t('form.weekDays.sunday'), shortLabel: shortLabelFor(6) },
    ],
    selectedText: t('form.weekDaysSelected'),
    noneText: t('common.none'),
  }
  const mergedLabels: WeekDaysLabels = {
    ...defaultLabels,
    ...labelsProp,
    days: labelsProp?.days ?? defaultLabels.days,
  }

  const weekDays = buildWeekDays(mergedLabels)

  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : []

  // Convert number[] to string[] (ToggleGroup uses strings)
  const stringValue = safeValue.map(String)

  // Handler that converts string[] back to number[]
  const handleValueChange = (newValue: string[]) => {
    if (!onChange) return
    const numberValue = newValue.map(Number).sort((a, b) => a - b)
    onChange(numberValue)
  }

  return (
    <div className='space-y-3'>
      <ToggleGroup
        type='multiple'
        value={stringValue}
        onValueChange={handleValueChange}
        className='flex flex-wrap justify-start gap-2'
      >
        {weekDays.map(day => (
          <ToggleGroupItem
            key={day.index}
            value={String(day.index)}
            aria-label={day.label}
            title={day.label}
            className='h-12 min-w-[3rem] rounded-lg px-3 text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
          >
            {day.shortLabel}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className='text-xs text-muted-foreground'>
        {mergedLabels.selectedText}{' '}
        {safeValue.length > 0
          ? weekDays
              .filter(d => safeValue.includes(d.index))
              .map(d => d.shortLabel)
              .join(', ')
          : mergedLabels.noneText}
      </div>
    </div>
  )
}
