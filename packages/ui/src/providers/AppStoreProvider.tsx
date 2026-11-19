'use client'

import { useEffect } from 'react'
import { useAppStore, type Session, type AppConfig } from '../stores/app-store'

/**
 * App Store Provider - Hydrates the Zustand store with server data
 *
 * This provider must wrap the whole application and receive server
 * data (session, config) to hydrate the store.
 *
 * @example
 * ```tsx
 * // app/admin/layout.tsx (Server Component)
 * export default async function AdminLayout({ children }) {
 *   const session = await auth()
 *
 *   const config = {
 *     appName: 'My App',
 *     logoUrl: '/logo.png',
 *     menuItems: menuConfig,
 *   }
 *
 *   return (
 *     <AppStoreProvider session={session} config={config}>
 *       <AdminShell>{children}</AdminShell>
 *     </AppStoreProvider>
 *   )
 * }
 * ```
 */

export interface AppStoreProviderProps {
  children: React.ReactNode

  /** Server session (NextAuth, Auth.js, etc.) */
  session?: Session | null

  /** Application configuration */
  config?: Partial<AppConfig>

  /** Callback invoked when signOut is called */
  onSignOut?: () => void | Promise<void>
}

export function AppStoreProvider({
  children,
  session,
  config,
  onSignOut,
}: AppStoreProviderProps) {
  // Hydrate session
  useEffect(() => {
    if (session !== undefined) {
      useAppStore.getState().setSession(session)
    }
  }, [session])

  // Hydrate config
  useEffect(() => {
    if (config) {
      useAppStore.getState().setConfig(config)
    }
  }, [config])

  // Set up the onSignOut callback
  useEffect(() => {
    if (onSignOut) {
      const store = useAppStore.getState()

      // Override signOut action to call custom callback
      const originalSignOut = store.signOut

      store.signOut = async () => {
        await originalSignOut()
        await onSignOut()
      }
    }
  }, [onSignOut])

  return <>{children}</>
}

/**
 * Hook to initialize the store manually
 * Useful when AppStoreProvider is not used
 *
 * @example
 * ```tsx
 * useInitializeAppStore({ session, config })
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components -- alt-init hook tied to AppStoreProvider, colocated by design
export function useInitializeAppStore({
  session,
  config,
}: {
  session?: Session | null
  config?: Partial<AppConfig>
}) {
  useEffect(() => {
    if (session !== undefined) {
      useAppStore.getState().setSession(session)
    }
  }, [session])

  useEffect(() => {
    if (config) {
      useAppStore.getState().setConfig(config)
    }
  }, [config])
}
