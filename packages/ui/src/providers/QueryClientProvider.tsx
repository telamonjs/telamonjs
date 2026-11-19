/**
 * QueryClientProvider - React Query provider for telamonjs
 *
 * Optional provider for projects that don't have their own QueryClient.
 *
 * The library does NOT re-export `@tanstack/react-query`: apps import
 * `QueryClient`, `QueryCache`, `MutationCache` and `useQueryClient` from
 * '@tanstack/react-query' directly, and must resolve a single copy of it
 * (a second instance makes the library hooks throw "No QueryClient set").
 * Pass `config`/`client` to this provider to customize it.
 *
 * @example
 * ```tsx
 * // app/layout.tsx — defaults
 * import { QueryClientProvider } from '@telamonjs/ui'
 *
 * export default function RootLayout({ children }) {
 *   return <QueryClientProvider>{children}</QueryClientProvider>
 * }
 * ```
 *
 * @example
 * Custom configuration (caches, error handlers):
 * ```tsx
 * import { QueryCache, MutationCache } from '@tanstack/react-query'
 * import { QueryClientProvider } from '@telamonjs/ui'
 *
 * <QueryClientProvider
 *   config={{
 *     queryCache: new QueryCache({ onError: handleError }),
 *     mutationCache: new MutationCache({ onError: handleError }),
 *     defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
 *   }}
 * >
 *   {children}
 * </QueryClientProvider>
 * ```
 */

'use client'

import {
  QueryClient,
  QueryClientProvider as RQProvider,
  type QueryClientConfig,
} from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

interface QueryClientProviderProps {
  children: ReactNode
  /**
   * Full QueryClient configuration (queryCache, mutationCache,
   * defaultOptions...). When provided, replaces the telamonjs defaults.
   * Build caches with QueryCache/MutationCache re-exported from
   * '@telamonjs/ui' to guarantee a single react-query instance.
   */
  config?: QueryClientConfig
  /**
   * Pre-built QueryClient instance. Takes precedence over `config`.
   * Must be constructed from the QueryClient re-exported by
   * '@telamonjs/ui' (single instance).
   */
  client?: QueryClient
}

/**
 * Default QueryClient provider with sensible defaults for telamonjs
 */
export function QueryClientProvider({
  children,
  config,
  client,
}: QueryClientProviderProps) {
  // Create QueryClient instance (memoized per component instance)
  const [queryClient] = useState(
    () =>
      client ??
      new QueryClient(
        config ?? {
          defaultOptions: {
            queries: {
              // Stale time: 5 seconds (balance between freshness and performance)
              staleTime: 5_000,
              // Refetch on window focus (good UX for returning to tab)
              refetchOnWindowFocus: true,
              // Retry failed requests 3 times with exponential backoff
              retry: 3,
              retryDelay: attemptIndex =>
                Math.min(1000 * 2 ** attemptIndex, 30000),
            },
            mutations: {
              // Retry mutations once (avoid duplicate creates on network issues)
              retry: 1,
            },
          },
        }
      )
  )

  return <RQProvider client={queryClient}>{children}</RQProvider>
}
