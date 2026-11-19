'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { DEFAULT_CURRENCY, TELAMONJS_LOCALES, type TelamonjsLocale } from './locales'

export interface TelamonjsI18nConfig {
  /** ISO 4217 code used by money fields/columns when the field has no override. */
  currency: string
  /** Locales offered by LocaleSwitcher. */
  locales: readonly TelamonjsLocale[]
  /** Called by LocaleSwitcher after the cookie is written (e.g. persist to the user profile). */
  onLocaleChange?: (locale: TelamonjsLocale) => void | Promise<void>
}

const DEFAULTS: TelamonjsI18nConfig = { currency: DEFAULT_CURRENCY, locales: TELAMONJS_LOCALES }
const TelamonjsI18nContext = createContext<TelamonjsI18nConfig>(DEFAULTS)

/** What next-intl does not carry: currency, offered locales and the locale-change callback. */
export function TelamonjsI18nProvider({
  children,
  currency = DEFAULT_CURRENCY,
  locales = TELAMONJS_LOCALES,
  onLocaleChange,
}: Partial<TelamonjsI18nConfig> & { children: ReactNode }) {
  const value = useMemo(() => ({ currency, locales, onLocaleChange }), [currency, locales, onLocaleChange])
  return <TelamonjsI18nContext.Provider value={value}>{children}</TelamonjsI18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook colocated by design
export function useTelamonjsI18n(): TelamonjsI18nConfig {
  return useContext(TelamonjsI18nContext)
}
