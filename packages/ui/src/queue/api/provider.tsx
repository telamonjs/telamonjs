'use client'

/**
 * Queue API Provider
 *
 * Context provider that injects the API adapter into queries and components.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { QueueApiAdapter, QueueConfigApiAdapter } from './types'

const QueueApiContext = createContext<QueueApiAdapter | null>(null)

export interface QueueApiProviderProps {
  children: ReactNode
  adapter: QueueApiAdapter
}

/**
 * Provider that injects the Queue API adapter.
 *
 * @example
 * ```tsx
 * import { QueueApiProvider, createNestJSAdapter } from '@telamonjs/ui/queue'
 *
 * const adapter = createNestJSAdapter({
 *   baseUrl: 'https://api.example.com',
 *   getAuthToken: async () => session?.user?.accessToken ?? null
 * })
 *
 * <QueueApiProvider adapter={adapter}>
 *   <QueueDashboard />
 * </QueueApiProvider>
 * ```
 */
export function QueueApiProvider({ children, adapter }: QueueApiProviderProps) {
  return (
    <QueueApiContext.Provider value={adapter}>
      {children}
    </QueueApiContext.Provider>
  )
}

/**
 * Hook to access the Queue API adapter.
 *
 * @throws Error if used outside QueueApiProvider
 *
 * @example
 * ```tsx
 * const api = useQueueApi()
 * const stats = await api.getStats()
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook coupled to this file's QueueApiContext; moving it would break 9+ internal imports of '../api/provider'
export function useQueueApi(): QueueApiAdapter {
  const adapter = useContext(QueueApiContext)
  if (!adapter) {
    throw new Error(
      'useQueueApi must be used within QueueApiProvider. ' +
        'Did you forget to wrap your component with <QueueApiProvider adapter={...}>?'
    )
  }
  return adapter
}

/**
 * Optional hook that returns null when there is no provider.
 * Useful for components that can work with or without the provider.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook coupled to this file's QueueApiContext; moving it would break internal imports of '../api/provider'
export function useQueueApiOptional(): QueueApiAdapter | null {
  return useContext(QueueApiContext)
}

/**
 * Hook to access the adapter with job configuration methods.
 * Performs a runtime check of the config methods — returns null if the adapter doesn't support them.
 *
 * @example
 * ```tsx
 * const configApi = useQueueConfigApi()
 * if (configApi) {
 *   const configs = await configApi.getJobConfigs()
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook coupled to this file's QueueApiContext; moving it would break internal imports of '../api/provider'
export function useQueueConfigApi(): QueueConfigApiAdapter | null {
  const adapter = useContext(QueueApiContext)
  return useMemo(() => {
    if (!adapter) return null
    // Runtime check: does the adapter have the config methods?
    if (
      'getJobConfigs' in adapter &&
      'getJobConfig' in adapter &&
      'updateJobConfig' in adapter &&
      'toggleJobConfig' in adapter
    ) {
      return adapter as QueueConfigApiAdapter
    }
    return null
  }, [adapter])
}
