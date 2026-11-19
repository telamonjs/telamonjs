import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'
import { createAuthSlice, type AuthSlice } from './slices/auth-slice'
import { createConfigSlice, type ConfigSlice } from './slices/config-slice'

/**
 * App Store - Global application state using Zustand
 *
 * Combines global state slices:
 * - **Auth**: Session, user, authentication
 * - **Config**: App configuration (logos, name, menu items)
 *
 * For UI state (sidebar, menu, etc.), use specialized stores:
 * - `sidebar-store.ts` - Sidebar layout state
 * - `menu-store.ts` - Navigation stack
 *
 * @example
 * ```tsx
 * import { useAuth, useConfig } from '@telamonjs/ui'
 *
 * function MyComponent() {
 *   const { isAuthenticated } = useAuth()
 *   const { appName, logoUrl } = useConfig()
 *
 *   // Component only re-renders when these specific values change
 * }
 * ```
 */

// Combined store type - GLOBAL STATE ONLY
export type AppStore = AuthSlice & ConfigSlice

// Create store with global slices
export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    devtools(
      (...args) => ({
        ...createAuthSlice(...args),
        ...createConfigSlice(...args),
      }),
      {
        name: 'TelamonJS App Store',
        enabled: process.env.NODE_ENV === 'development',
      }
    )
  )
)

// Export store for direct access (use sparingly)
export const appStore = useAppStore

/**
 * Get current store state (useful for non-React contexts)
 *
 * @example
 * ```ts
 * const currentUser = getAppState().user
 * const isAuthenticated = getAppState().isAuthenticated
 * ```
 */
export const getAppState = () => useAppStore.getState()

/**
 * Subscribe to store changes (useful for side effects)
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToStore(
 *   state => state.session,
 *   (session) => {
 *     console.log('Session changed:', session)
 *   }
 * )
 *
 * // Later...
 * unsubscribe()
 * ```
 */
export const subscribeToStore = useAppStore.subscribe

// Re-export types for convenience
export type { AuthSlice, ConfigSlice, User, Session, AppConfig } from './slices'
