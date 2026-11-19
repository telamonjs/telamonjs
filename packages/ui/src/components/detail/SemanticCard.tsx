'use client'

/**
 * SemanticCard - Semantic colored card for detail views
 *
 * Following the Rich Header pattern for Detail Dialogs:
 * - Blue: Identification/main data
 * - Green: Contact/communication
 * - Purple: Location/address
 * - Orange: Telemetry/metrics/status
 */

import { type ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'
import type { HeadingLevel } from '../../ui/heading-level'

export type CardColor = 'blue' | 'green' | 'purple' | 'orange'

// eslint-disable-next-line react-refresh/only-export-components -- color style map is the public config for SemanticCard's `color` prop, tightly coupled to this file
export const colorStyles: Record<
  CardColor,
  { border: string; bg: string; title: string; icon: string }
> = {
  blue: {
    border: 'border-blue-100 dark:border-blue-900/40',
    bg: 'bg-gradient-to-br from-blue-50 to-card dark:from-blue-950/30',
    title: 'text-blue-900 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    border: 'border-green-100 dark:border-green-900/40',
    bg: 'bg-gradient-to-br from-green-50 to-card dark:from-green-950/30',
    title: 'text-green-900 dark:text-green-200',
    icon: 'text-green-600 dark:text-green-400',
  },
  purple: {
    border: 'border-purple-100 dark:border-purple-900/40',
    bg: 'bg-gradient-to-br from-purple-50 to-card dark:from-purple-950/30',
    title: 'text-purple-900 dark:text-purple-200',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    border: 'border-orange-100 dark:border-orange-900/40',
    bg: 'bg-gradient-to-br from-orange-50 to-card dark:from-orange-950/30',
    title: 'text-orange-900 dark:text-orange-200',
    icon: 'text-orange-600 dark:text-orange-400',
  },
}

export interface SemanticCardProps {
  title: I18nText
  icon: React.ComponentType<{ className?: string }>
  color: CardColor
  children: ReactNode
  className?: string
  /** Semantic level of the title heading (default 3). Visual style is unchanged. */
  headingLevel?: HeadingLevel
}


export function SemanticCard({
  title,
  icon: Icon,
  color,
  children,
  className,
  headingLevel = 3,
}: SemanticCardProps) {
  const Heading = `h${headingLevel}` as const
  const text = useText()
  const styles = colorStyles[color]

  return (
    <div
      className={cn(
        'rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md',
        styles.border,
        styles.bg,
        className
      )}
    >
      <Heading
        className={cn(
          'mb-3 flex items-center gap-2 text-sm font-semibold',
          styles.title
        )}
      >
        <Icon className={cn('h-4 w-4', styles.icon)} />
        {text(title)}
      </Heading>
      <div className='space-y-2.5'>{children}</div>
    </div>
  )
}

