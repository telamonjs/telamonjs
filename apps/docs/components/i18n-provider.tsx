'use client'

import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { TelamonjsI18nProvider, telamonjsMessages } from '@telamonjs/ui/i18n'

/** Component previews render real telamonjs-ui components, which need the i18n context. */
export function DocsI18nProvider({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale='pt-BR'
      messages={telamonjsMessages['pt-BR']}
      timeZone='America/Sao_Paulo'
    >
      <TelamonjsI18nProvider>{children}</TelamonjsI18nProvider>
    </NextIntlClientProvider>
  )
}
