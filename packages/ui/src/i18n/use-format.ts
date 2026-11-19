'use client'

import { useMemo } from 'react'
import { useFormatter, useNow } from 'next-intl'
import { useTelamonjsI18n } from './context'

type DateInput = Date | string | number
const toDate = (v: DateInput) => (v instanceof Date ? v : new Date(v))

export interface TimeFormatOptions {
  /** Include seconds (`15:07:09`). Default: false. */
  seconds?: boolean
}
const timeParts = (o?: TimeFormatOptions): { hour: '2-digit'; minute: '2-digit'; second?: '2-digit' } => ({
  hour: '2-digit',
  minute: '2-digit',
  second: o?.seconds ? '2-digit' : undefined,
})

const DATE_STYLES = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium: { day: '2-digit', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>

/** Locale/timeZone/currency-aware formatters. Components use this instead of `toLocale*('pt-BR')`. */
export function useFormat() {
  const f = useFormatter()
  const { currency } = useTelamonjsI18n()
  return useMemo(
    () => ({
      date: (v: DateInput, style: keyof typeof DATE_STYLES = 'short') => f.dateTime(toDate(v), DATE_STYLES[style]),
      dateTime: (v: DateInput, o?: TimeFormatOptions) => f.dateTime(toDate(v), { ...DATE_STYLES.short, ...timeParts(o) }),
      time: (v: DateInput, o?: TimeFormatOptions) => f.dateTime(toDate(v), timeParts(o)),
      number: (v: number, opts?: Intl.NumberFormatOptions) => f.number(v, opts),
      currency: (v: number, code?: string) => f.number(v, { style: 'currency', currency: code ?? currency }),
      percent: (v: number, fractionDigits = 1) =>
        f.number(v, { style: 'percent', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }),
      relative: (v: DateInput, now?: Date) => f.relativeTime(toDate(v), now),
    }),
    [f, currency],
  )
}

/** Ticking `now` for relative timestamps (Timeline, Comments, queue). */
export function useTickingNow(updateInterval = 60_000) {
  return useNow({ updateInterval })
}
