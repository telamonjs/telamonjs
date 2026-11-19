'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'

/**
 * Type for revalidate action (Server Action)
 */
type RevalidateAction = (
  path: string,
  type?: 'page' | 'layout'
) => Promise<void>

/**
 * Cache context value
 */
interface CacheContextValue {
  /**
   * Server Action to revalidate Next.js cache
   * Configured via AppProviders
   */
  revalidateAction?: RevalidateAction
}

/**
 * Cache context for distributing revalidate action
 * @internal
 */
const CacheContext = createContext<CacheContextValue>({})

/**
 * Hook to access cache context
 *
 * @example
 * ```tsx
 * const { revalidateAction } = useCacheContext()
 *
 * const handleRefresh = async () => {
 *   if (revalidateAction) {
 *     await revalidateAction(pathname, 'layout')
 *   }
 * }
 * ```
 *
 * @returns Cache context with revalidateAction
 */
// eslint-disable-next-line react-refresh/only-export-components -- context hook tied to CacheContextProvider, colocated by design
export function useCacheContext() {
  return useContext(CacheContext)
}

/**
 * Props for CacheContextProvider
 * @internal
 */
interface CacheContextProviderProps {
  children: ReactNode
  revalidateAction?: RevalidateAction
}

/**
 * Cache context provider
 * Wraps app to distribute revalidateAction to components
 *
 * @internal - Used by AppProviders, not meant for direct use
 */
export function CacheContextProvider({
  children,
  revalidateAction,
}: CacheContextProviderProps) {
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ revalidateAction }),
    [revalidateAction]
  )

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  )
}
