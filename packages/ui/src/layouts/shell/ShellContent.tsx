'use client'

import type { ReactNode } from 'react'
import { cn } from '../../utils'

export interface ShellContentProps {
  /** Full height with hidden overflow (default: true) — use for maps/fixed-height content */
  fullHeight?: boolean
  /** Add padding (p-4 lg:p-6) to content area (default: false) */
  padding?: boolean
  className?: string
  children: ReactNode
}

/**
 * ShellContent — Content area for pages without tabs.
 *
 * - fullHeight=true: flex-1 min-h-0 overflow-hidden (maps, fixed layouts)
 * - fullHeight=false: flex-1 overflow-auto (scrollable content)
 *
 * @example
 * ```tsx
 * <ShellPage>
 *   <AdminHeader title="Monitoramento" icon={Map} />
 *   <ShellContent>
 *     <MapComponent />
 *   </ShellContent>
 * </ShellPage>
 * ```
 */
export function ShellContent({
  fullHeight = true,
  padding = false,
  className,
  children,
}: ShellContentProps) {
  return (
    <div
      className={cn(
        fullHeight ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1 overflow-auto',
        padding && 'p-4 lg:p-6',
        className
      )}
    >
      {children}
    </div>
  )
}
