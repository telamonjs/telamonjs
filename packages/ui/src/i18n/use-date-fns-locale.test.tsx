import { renderHook } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { expect, it } from 'vitest'
import { telamonjsMessages } from './messages'
import { useDateFnsLocale } from './use-date-fns-locale'

it.each([
  ['pt-BR', 'pt-BR'],
  ['en', 'en-US'],
  ['es', 'es'],
] as const)('%s → date-fns %s', (locale, code) => {
  const { result } = renderHook(() => useDateFnsLocale(), {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale={locale} messages={telamonjsMessages[locale]}>
        {children}
      </NextIntlClientProvider>
    ),
  })
  expect(result.current.code).toBe(code)
})
