'use client'

import { cn } from '../../utils'
import { ContentTabs, type TabItem, type ContentTabsVariant } from '../content-tabs'

export interface AdminTabsProps {
  tabs: TabItem[]
  value?: string
  onValueChange?: (value: string) => void
  /** Fill remaining height (default: true) — use for full-height content like maps */
  fillHeight?: boolean
  /** Compact tab sizing (default: false) */
  compact?: boolean
  /** ContentTabs visual variant (default: 'default') */
  variant?: ContentTabsVariant
  className?: string
}

/**
 * AdminTabs — ContentTabs wrapper for page layouts with height-filling CSS.
 *
 * Injects flex-1 min-h-0 so tab content fills the ShellPage container.
 * ContentTabs itself is NOT modified — 24+ dialogs use it directly.
 *
 * @example
 * ```tsx
 * <ShellPage>
 *   <AdminHeader title="Cadastros" icon={Database} />
 *   <AdminTabs tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
 * </ShellPage>
 * ```
 */
export function AdminTabs({
  tabs,
  value,
  onValueChange,
  fillHeight = true,
  compact = false,
  variant = 'default',
  className,
}: AdminTabsProps) {
  return (
    <ContentTabs
      tabs={tabs}
      variant={variant}
      compact={compact}
      flush
      value={value}
      onValueChange={onValueChange}
      className={cn(
        fillHeight && [
          'flex flex-col flex-1 min-h-0',
          '[&>div:last-child]:flex-1 [&>div:last-child]:min-h-0 [&>div:last-child]:mt-0',
          '[&>div:last-child>div]:h-full',
        ],
        className
      )}
    />
  )
}
