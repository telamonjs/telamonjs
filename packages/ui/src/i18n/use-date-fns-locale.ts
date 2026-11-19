'use client'

import { useLocale } from 'next-intl'
import { enUS, es, ptBR, type Locale } from 'date-fns/locale'
import { DEFAULT_LOCALE, isTelamonjsLocale } from './locales'

const MAP = { 'pt-BR': ptBR, en: enUS, es } as const

/** date-fns locale for react-day-picker and date-fns `format()` calls. */
export function useDateFnsLocale(): Locale {
  const locale = useLocale()
  return MAP[isTelamonjsLocale(locale) ? locale : DEFAULT_LOCALE]
}
