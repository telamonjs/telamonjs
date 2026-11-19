'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

/**
 * Hook for horizontal scrollable navigation with scroll detection.
 * Used by ContentTabs and AdminForm tabbed layout.
 *
 * @returns navRef, scroll state, and scroll control functions
 */
export function useScrollableNav() {
  const navRef = useRef<HTMLElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = navRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  const scroll = useCallback((direction: 'left' | 'right') => {
    navRef.current?.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' })
  }, [])

  const rafRef = useRef<number>(0)

  const startHoverScroll = useCallback((direction: 'left' | 'right') => {
    cancelAnimationFrame(rafRef.current)
    const speed = direction === 'left' ? -8 : 8
    const step = () => {
      const el = navRef.current
      if (!el) return
      const atStart = el.scrollLeft <= 0
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      if ((direction === 'left' && atStart) || (direction === 'right' && atEnd)) {
        cancelAnimationFrame(rafRef.current)
        return
      }
      el.scrollBy({ left: speed })
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  const stopHoverScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
  }, [])

  // Cleanup RAF on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  useEffect(() => {
    const el = navRef.current
    if (!el) return

    updateScrollState()

    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState])

  return { navRef, canScrollLeft, canScrollRight, scroll, startHoverScroll, stopHoverScroll, updateScrollState }
}
