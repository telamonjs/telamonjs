'use client'
import * as React from 'react'

const MOBILE_BREAKPOINT = 768

/**
 * Hook that tracks a CSS media query on the client.
 * SSR/first render: `false` (no window); updates on mount and on change.
 * Performance: uses only matchMedia (no redundant resize listener)
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(query)

    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(e.matches)
    }

    // Immediate check on mount
    onChange(mql)

    // matchMedia listener covers all cases including DevTools device toolbar
    mql.addEventListener('change', onChange)

    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [query])

  return !!matches
}

/**
 * Hook to detect whether the device is mobile (< 768px)
 */
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}
