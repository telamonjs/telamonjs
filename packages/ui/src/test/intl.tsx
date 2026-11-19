import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { telamonjsMessages } from '../i18n/messages'

/**
 * Wrapper for i18n tests: `en` locale with the library messages plus `app` (consumer) messages.
 * Nested inside the global pt-BR wrapper from setup.tsx — the inner provider wins.
 */
export function withAppMessages(app: Record<string, unknown>, locale: 'en' | 'pt-BR' = 'en') {
  return function AppIntl({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={{ ...telamonjsMessages[locale], ...app }} timeZone='UTC'>
        {children}
      </NextIntlClientProvider>
    )
  }
}
