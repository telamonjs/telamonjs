'use client'

import { ReactNode, useEffect, useState } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  IntlErrorCode,
  NextIntlClientProvider,
  useLocale,
  useMessages,
  type AbstractIntlMessages,
  type IntlError,
} from 'next-intl'
import { TelamonjsI18nProvider } from '../i18n/context'
import {
  DEFAULT_LOCALE,
  DEFAULT_TIME_ZONE,
  type TelamonjsLocale,
} from '../i18n/locales'
// Only the default locale ships in this chunk; en/es load on demand.
import { ptBR } from '../i18n/messages/pt-BR'
import type { TelamonjsMessages } from '../i18n/messages'
import { loadTelamonjsMessages } from '../i18n/load-messages'
import { installZodErrorMap } from '../i18n/zod-error-map'
import { AuthProvider } from './AuthProvider'
import { QueryProvider } from './QueryProvider'
import { MapsProvider } from './MapsProvider'
import { CacheContextProvider } from '../contexts/CacheContext'
import { InstantTooltip } from '../components/utilities/InstantTooltip'

export interface ProvidersConfig {
  googleMapsApiKey?: string
  // `any` kept intentionally: NextAuth session shape is augmented per-consumer
  // (module augmentation); passed straight through to next-auth's SessionProvider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session?: any
  queryClientConfig?: {
    refetchOnWindowFocus?: boolean
    staleTime?: number
    cacheTime?: number
  }
  /**
   * The app's own QueryClient (global error handlers, retry, defaults). When
   * set, the library uses it instead of creating one and `queryClientConfig`
   * is ignored. Pass it here instead of wrapping AppProviders in an app
   * QueryClientProvider: with a single react-query copy (the published
   * package — react-query is a peer) the internal provider would
   * shadow the app's for the whole tree, silently dropping its `onError`.
   * Library queries/mutations carry `meta: { skipErrorToast: true }` (they
   * handle their own errors) — honor it in the global handler.
   * A client from another react-query copy (link mode) is ignored with a dev
   * warning; keep the app's own QueryClientProvider (same client) around
   * AppProviders so the app's hooks still find it in that mode.
   *
   * @example
   * ```tsx
   * 'use client'
   * const [queryClient] = useState(() => new QueryClient({
   *   mutationCache: new MutationCache({
   *     onError: (error, _v, _c, mutation) => {
   *       if (mutation.meta?.skipErrorToast) return
   *       toast.error(error.message)
   *     },
   *   }),
   * }))
   * <AppProviders config={{ queryClient }}>{children}</AppProviders>
   * ```
   *
   */
  // Structural on purpose: a client from another react-query copy (link mode)
  // must type-check; the runtime `instanceof` check decides whether it is used.
  queryClient?: Pick<QueryClient, 'mount' | 'unmount'>
  themeConfig?: {
    attribute?: string
    defaultTheme?: string
    enableSystem?: boolean
  }
  authConfig?: {
    refetchInterval?: number
    refetchOnWindowFocus?: boolean
  }
  /**
   * Server Action to revalidate the Next.js cache, called by ListPage's refresh
   * with the current pathname. Any visitor can call a Server Action that a client
   * component references: pass one the app owns, which checks the session first.
   *
   * @example
   * ```tsx
   * // app/actions/revalidate.ts
   * 'use server'
   * export async function revalidateAdminPath(path: string, type: 'page' | 'layout' = 'layout') {
   *   if (!(await auth())?.user || !/^\/admin(\/|$)/.test(path)) return
   *   revalidatePath(path, type)
   * }
   *
   * <AppProviders config={{ revalidateAction: revalidateAdminPath }}>{children}</AppProviders>
   * ```
   */
  revalidateAction?: (path: string, type?: 'page' | 'layout') => Promise<void>
  /**
   * i18n. Omitted → pt-BR with the library's own messages, so existing apps keep working.
   * Apps with per-user locale pass `locale`/`messages`/`timeZone` from `next-intl/server`
   * (`getLocale()`, `getMessages()`, `getTimeZone()`) in the root layout.
   */
  i18n?: {
    locale?: TelamonjsLocale
    /** Full message tree (telamonjs + app). Defaults to the library messages for `locale`. */
    messages?: AbstractIntlMessages
    timeZone?: string
    /** ISO 4217, used by money fields/columns without an explicit currency. Default 'BRL'. */
    currency?: string
    /** Locales offered by LocaleSwitcher. Default: all three. */
    locales?: readonly TelamonjsLocale[]
    onLocaleChange?: (locale: TelamonjsLocale) => void | Promise<void>
  }
}

function onIntlError(error: IntlError) {
  if (
    process.env.NODE_ENV !== 'production' &&
    error.code === IntlErrorCode.MISSING_MESSAGE
  ) {
    console.warn(error.message)
  }
}

/** Last key segment: `users.title` → `title`, never the dotted key on screen. */
const messageFallback = ({ key }: { key: string }) =>
  key.split('.').pop() ?? key

// Reads the provider's messages (library + app), so the zod map works with
// whatever the app passed without importing every locale here.
function ZodLocaleEffect() {
  const locale = useLocale() as TelamonjsLocale
  const messages = useMessages()
  useEffect(() => installZodErrorMap(locale, messages), [locale, messages])
  return null
}

/**
 * Fallback library messages when the app passes no `i18n.messages`: pt-BR is
 * synchronous; en/es load on first use (pt-BR shows until then — apps in
 * another locale should pass `i18n.messages` from the server).
 */
function useFallbackMessages(
  locale: TelamonjsLocale,
  skip: boolean
): TelamonjsMessages {
  const [loaded, setLoaded] = useState<{
    locale: TelamonjsLocale
    messages: TelamonjsMessages
  } | null>(null)
  const needsLoad = !skip && locale !== DEFAULT_LOCALE
  useEffect(() => {
    if (!needsLoad) return
    let ignore = false
    void loadTelamonjsMessages(locale).then(messages => {
      if (!ignore) setLoaded({ locale, messages })
    })
    return () => {
      ignore = true
    }
  }, [needsLoad, locale])
  return loaded?.locale === locale ? loaded.messages : ptBR
}

interface AppProvidersProps {
  children: ReactNode
  config?: ProvidersConfig
}

export function AppProviders({ children, config = {} }: AppProvidersProps) {
  const {
    googleMapsApiKey = '',
    session,
    queryClientConfig = {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    },
    themeConfig = {
      attribute: 'class',
      defaultTheme: 'light',
      enableSystem: true,
    },
    authConfig = {
      refetchInterval: 5 * 60,
      refetchOnWindowFocus: true,
    },
    queryClient,
    revalidateAction,
    i18n = {},
  } = config
  const locale = i18n.locale ?? DEFAULT_LOCALE
  const fallbackMessages = useFallbackMessages(locale, !!i18n.messages)
  // Only a client from the same react-query copy as the library: in link mode
  // the app and the linked library resolve different copies (possibly different
  // versions), and a foreign client breaks the library's observers
  // (`query.isFetched is not a function`). Fall back to the internal client.
  const appQueryClient =
    queryClient instanceof QueryClient ? queryClient : undefined
  if (queryClient && !appQueryClient && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[telamonjs] config.queryClient comes from another @tanstack/react-query copy (link mode?) — using the internal client.'
    )
  }

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={i18n.messages ?? fallbackMessages}
      timeZone={i18n.timeZone ?? DEFAULT_TIME_ZONE}
      onError={onIntlError}
      getMessageFallback={messageFallback}
    >
      <TelamonjsI18nProvider
        currency={i18n.currency}
        locales={i18n.locales}
        onLocaleChange={i18n.onLocaleChange}
      >
        <ZodLocaleEffect />
        <InstantTooltip />
        <CacheContextProvider revalidateAction={revalidateAction}>
          <NextThemesProvider
            attribute={themeConfig.attribute as 'class' | 'data-theme'}
            defaultTheme={themeConfig.defaultTheme}
            enableSystem={themeConfig.enableSystem}
          >
            <AuthProvider
              session={session}
              refetchInterval={authConfig.refetchInterval}
              refetchOnWindowFocus={authConfig.refetchOnWindowFocus}
            >
              {appQueryClient ? (
                <QueryClientProvider client={appQueryClient}>
                  <MapsProvider apiKey={googleMapsApiKey} language={locale}>
                    {children}
                  </MapsProvider>
                </QueryClientProvider>
              ) : (
                <QueryProvider
                  refetchOnWindowFocus={queryClientConfig.refetchOnWindowFocus}
                  staleTime={queryClientConfig.staleTime}
                  gcTime={queryClientConfig.cacheTime}
                >
                  <MapsProvider apiKey={googleMapsApiKey} language={locale}>
                    {children}
                  </MapsProvider>
                </QueryProvider>
              )}
            </AuthProvider>
          </NextThemesProvider>
        </CacheContextProvider>
      </TelamonjsI18nProvider>
    </NextIntlClientProvider>
  )
}

// Type-only exports for better developer experience
export type { ReactNode }
