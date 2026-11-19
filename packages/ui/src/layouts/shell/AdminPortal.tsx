'use client'

import { cn } from '../../utils'
import { ContentPortal } from '../content-portal'
import type { ContentPortalProps } from '../content-portal'

export interface AdminPortalProps extends ContentPortalProps {
  /** Fill remaining height (default: true) — use for full-height content like embedded ListPage. */
  fillHeight?: boolean
}

/**
 * AdminPortal — ContentPortal wrapper for page layouts with height-filling CSS.
 *
 * Injects flex-1 min-h-0 so the rail+panel (or grid launcher) fills the
 * ShellPage container instead of shrink-wrapping to content height and
 * leaving blank space below. Same contract as `AdminTabs` for `ContentTabs`.
 * ContentPortal itself is NOT modified — ViewPortalDialog uses it directly
 * and already has its own (dialog-bounded) height chain.
 *
 * @example
 * ```tsx
 * <ShellPage>
 *   <AdminHeader title="Administration" icon={Settings} />
 *   <AdminPortal tabs={items} value={active} onValueChange={setActive} />
 * </ShellPage>
 * ```
 *
 * @category Layout
 */
export function AdminPortal({
  fillHeight = true,
  className,
  ...props
}: AdminPortalProps) {
  return (
    <ContentPortal
      {...props}
      className={cn(fillHeight && 'flex-1 min-h-0', className)}
    />
  )
}
