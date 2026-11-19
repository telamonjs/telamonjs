import { renderHook } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { TelamonjsI18nProvider } from './context'
import type { TelamonjsLocale } from './locales'
import { telamonjsMessages } from './messages'
import { useFormat } from './use-format'

const d = new Date('2026-03-05T18:07:00Z') // 15:07 in America/Sao_Paulo
const wrapper =
  (locale: TelamonjsLocale, currency = 'BRL') =>
  ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale={locale} messages={telamonjsMessages[locale]} timeZone='America/Sao_Paulo'>
      <TelamonjsI18nProvider currency={currency}>{children}</TelamonjsI18nProvider>
    </NextIntlClientProvider>
  )
const hook = (locale: TelamonjsLocale, currency?: string) =>
  renderHook(() => useFormat(), { wrapper: wrapper(locale, currency) }).result.current

describe('useFormat', () => {
  it('formats dates/times per locale and provider time zone', () => {
    const pt = hook('pt-BR')
    expect(pt.date(d)).toBe('05/03/2026')
    expect(pt.time(d)).toBe('15:07')
    expect(pt.dateTime('2026-03-05T18:07:00Z')).toBe('05/03/2026, 15:07')
    expect(hook('en').date(d)).toBe('03/05/2026')
  })

  it('dateTime/time include seconds on request', () => {
    const pt = hook('pt-BR')
    const s = new Date('2026-03-05T18:07:09Z')
    expect(pt.dateTime(s, { seconds: true })).toBe('05/03/2026, 15:07:09')
    expect(pt.time(s, { seconds: true })).toBe('15:07:09')
    expect(pt.dateTime(s)).toBe('05/03/2026, 15:07')
  })

  it('formats currency with the provider currency unless overridden', () => {
    const pt = hook('pt-BR')
    expect(pt.currency(1234.5)).toBe('R$ 1.234,50')
    expect(pt.currency(1234.5, 'USD')).toBe('US$ 1.234,50')
    expect(hook('en', 'USD').currency(1234.5)).toBe('$1,234.50')
  })

  it('formats numbers and percents', () => {
    const pt = hook('pt-BR')
    expect(pt.number(1234567.891)).toBe('1.234.567,891')
    expect(pt.percent(0.1234)).toBe('12,3%')
  })
})
