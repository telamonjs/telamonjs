'use client'

import { useEffect, useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl'
import { setIconResolver } from '@telamonjs/ui'
import { TelamonjsI18nProvider, setupZodLocale } from '@telamonjs/ui/i18n'
import { iconRegistry } from '@/lib/icons'
import { currency, locales, type AppLocale } from '@/i18n/config'

// Runs once at module load (client): string icon names in menuConfig,
// headerConfig and TabItem resolve against this app's registry first.
setIconResolver((name) => iconRegistry[name])

interface AppProvidersProps {
  children: React.ReactNode
  locale: AppLocale
  messages: AbstractIntlMessages
  timeZone: string
}

export function AppProviders({ children, locale, messages, timeZone }: AppProvidersProps) {
  // useState (not module scope) -- one QueryClient per app instance, not
  // shared across requests/users on the server.
  const [queryClient] = useState(() => new QueryClient())

  // zod error map speaks the active locale (validation messages in forms).
  useEffect(() => {
    setupZodLocale(locale)
  }, [locale])

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <TelamonjsI18nProvider currency={currency} locales={locales}>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </SessionProvider>
      </TelamonjsI18nProvider>
    </NextIntlClientProvider>
  )
}
