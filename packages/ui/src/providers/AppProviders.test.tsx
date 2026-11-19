import { render, screen, waitFor } from '@testing-library/react'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query'
import { AppProviders } from './AppProviders'

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

function Probe() {
  const t = useTranslations('telamonjs.common')
  return <span>{t('save')}</span>
}

describe('AppProviders i18n', () => {
  it('defaults to pt-BR library messages', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>
    )
    expect(screen.getByText('Salvar')).toBeInTheDocument()
  })

  it('honours config.i18n.locale, loading that locale on demand', async () => {
    render(
      <AppProviders config={{ i18n: { locale: 'en' } }}>
        <Probe />
      </AppProviders>
    )
    // en is its own chunk (not bundled with the provider)
    expect(await screen.findByText('Save')).toBeInTheDocument()
  })

  it('uses the messages the app passes, with no async load', () => {
    render(
      <AppProviders
        config={{
          i18n: {
            locale: 'en',
            messages: { telamonjs: { common: { save: 'Store it' } } },
          },
        }}
      >
        <Probe />
      </AppProviders>
    )
    expect(screen.getByText('Store it')).toBeInTheDocument()
  })

  it('installs the zod error map from the provider messages', async () => {
    render(
      <AppProviders config={{ i18n: { locale: 'en' } }}>
        <Probe />
      </AppProviders>
    )
    await screen.findByText('Save')
    // The map is installed in a passive effect that can run after "Save" is
    // already in the DOM, so wait for the map itself.
    await waitFor(() => {
      const r = z.string().email().safeParse('x')
      expect(r.success).toBe(false)
      expect(r.error?.issues[0].message).toMatch(/email/i)
      expect(r.error?.issues[0].message).not.toMatch(/inválido/i)
    })
  })
})

function ClientProbe({ onClient }: { onClient: (c: QueryClient) => void }) {
  onClient(useQueryClient())
  return null
}

describe('AppProviders queryClient (7.13)', () => {
  it('uses the QueryClient the app passes, so its global handlers are not shadowed', () => {
    const appClient = new QueryClient()
    const onClient = vi.fn()
    render(
      <AppProviders config={{ queryClient: appClient }}>
        <ClientProbe onClient={onClient} />
      </AppProviders>
    )
    expect(onClient).toHaveBeenLastCalledWith(appClient)
  })

  it('keeps creating its own QueryClient when none is passed', () => {
    const outer = new QueryClient()
    const onClient = vi.fn()
    render(
      <QueryClientProvider client={outer}>
        <AppProviders>
          <ClientProbe onClient={onClient} />
        </AppProviders>
      </QueryClientProvider>
    )
    const used = onClient.mock.calls.at(-1)?.[0]
    expect(used).toBeInstanceOf(QueryClient)
    // the documented shadowing: an outer app provider does not reach inside
    expect(used).not.toBe(outer)
  })

  it('ignores a client from another react-query copy (link mode) and falls back to its own', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const foreign = { mount() {}, unmount() {} } as unknown as QueryClient
    const onClient = vi.fn()
    render(
      <AppProviders config={{ queryClient: foreign }}>
        <ClientProbe onClient={onClient} />
      </AppProviders>
    )
    const used = onClient.mock.calls.at(-1)?.[0]
    expect(used).toBeInstanceOf(QueryClient)
    expect(used).not.toBe(foreign)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('another @tanstack/react-query copy')
    )
    warn.mockRestore()
  })
})
