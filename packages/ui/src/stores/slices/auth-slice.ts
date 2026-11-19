import type { StateCreator } from 'zustand'
import { logger } from '../../utils/logger'

/**
 * Auth Slice - Manages authentication and the user session
 *
 * @example
 * ```tsx
 * const { session, isAuthenticated, signOut } = useAppStore()
 *
 * if (!isAuthenticated) {
 *   return <LoginPage />
 * }
 * ```
 */

// Types
export interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
  [key: string]: unknown // Permite campos customizados
}

export interface Session {
  user: User
  expires?: string
  [key: string]: unknown // Permite campos customizados
}

export interface AuthSlice {
  // State
  session: Session | null
  user: User | null
  isAuthenticated: boolean

  // Actions
  setSession: (session: Session | null) => void
  updateUser: (user: Partial<User>) => void
  clearSession: () => void
  signOut: () => Promise<void>
}

// Slice creator
export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (
  set,
  get
) => ({
  // Initial state
  session: null,
  user: null,
  isAuthenticated: false,

  // Actions
  setSession: session => {
    set({
      session,
      user: session?.user || null,
      isAuthenticated: !!session,
    })
  },

  updateUser: userData => {
    const currentSession = get().session
    const currentUser = get().user

    if (!currentSession || !currentUser) {
      logger.warn('[AuthSlice] Cannot update user: no active session')
      return
    }

    const updatedUser = { ...currentUser, ...userData }

    set({
      user: updatedUser,
      session: {
        ...currentSession,
        user: updatedUser,
      },
    })
  },

  clearSession: () => {
    set({
      session: null,
      user: null,
      isAuthenticated: false,
    })
  },

  signOut: async () => {
    // Clear session state
    get().clearSession()

    // Note: Actual sign out logic (calling API, clearing cookies, etc.)
    // should be handled by the consumer (e.g., next-auth signOut)
    // This slice only manages the state
  },
})
