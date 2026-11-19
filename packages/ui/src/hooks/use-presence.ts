'use client'
import * as React from 'react'

/**
 * Keeps an element mounted for `exitMs` after `open` turns false so a CSS
 * exit animation (tailwindcss-animate `data-[state=closed]:animate-out`) can
 * play. CSS replacement for framer-motion's AnimatePresence.
 *
 * @internal
 */
export function usePresence(open: boolean, exitMs = 200) {
  const [mounted, setMounted] = React.useState(open)
  // Mount synchronously on open (adjust state during render, no extra paint).
  if (open && !mounted) setMounted(true)

  React.useEffect(() => {
    if (open) return
    const id = setTimeout(() => setMounted(false), exitMs)
    return () => clearTimeout(id)
  }, [open, exitMs])

  return { mounted: open || mounted, state: open ? 'open' : 'closed' } as const
}
