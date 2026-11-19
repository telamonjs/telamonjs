'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to track page visibility state
 *
 * Useful for pausing polling, animations, or expensive operations
 * when the page is not visible.
 *
 * @example
 * ```tsx
 * const isVisible = usePageVisibility()
 *
 * useQuery({
 *   queryKey: ['data'],
 *   queryFn: fetchData,
 *   refetchInterval: isVisible ? 5000 : false // Pause polling when hidden
 * })
 * ```
 *
 * @returns boolean - true if page is visible, false if hidden
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() => {
    // Default to true during SSR
    if (typeof document === 'undefined') return true
    return document.visibilityState === 'visible'
  })

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return isVisible
}
