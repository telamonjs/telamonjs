'use client'

import { type ReactNode, useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '../../utils'
import { ShellPageContext, type ShellPageContextValue } from './ShellPageContext'

export interface ShellPageProps {
  /** Enable fullscreen toggle (default: true) */
  allowFullscreen?: boolean
  className?: string
  children: ReactNode
}

/**
 * ShellPage — Full-height composable page container with optional fullscreen.
 *
 * CSS fullscreen (fixed inset-0 z-50) keeps Radix portals working.
 *
 * @example
 * ```tsx
 * <ShellPage>
 *   <AdminHeader title="Dashboard" icon={Activity} />
 *   <AdminTabs tabs={tabs} value={tab} onValueChange={setTab} />
 * </ShellPage>
 * ```
 */
export function ShellPage({
  allowFullscreen = true,
  className,
  children,
}: ShellPageProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    if (!allowFullscreen) return
    setIsFullscreen((prev) => !prev)
  }, [allowFullscreen])

  // ESC to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isFullscreen])

  const ctx = useMemo<ShellPageContextValue>(
    () => ({ isFullscreen, toggleFullscreen }),
    [isFullscreen, toggleFullscreen]
  )

  return (
    <ShellPageContext.Provider value={ctx}>
      <div
        className={cn(
          'flex flex-col h-full',
          isFullscreen && 'fixed inset-0 z-50 h-screen bg-background',
          className
        )}
      >
        {children}
      </div>
    </ShellPageContext.Provider>
  )
}
