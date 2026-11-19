import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TelamonjsI18nProvider, useTelamonjsI18n } from './context'

describe('TelamonjsI18nProvider', () => {
  it('returns defaults without a provider', () => {
    const { result } = renderHook(() => useTelamonjsI18n())
    expect(result.current.currency).toBe('BRL')
    expect(result.current.locales).toEqual(['pt-BR', 'en', 'es'])
  })

  it('exposes the configured values', () => {
    const { result } = renderHook(() => useTelamonjsI18n(), {
      wrapper: ({ children }) => (
        <TelamonjsI18nProvider currency='USD' locales={['en']}>
          {children}
        </TelamonjsI18nProvider>
      ),
    })
    expect(result.current).toMatchObject({ currency: 'USD', locales: ['en'] })
  })
})
