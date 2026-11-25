'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '../../utils'
import { renderIcon } from '../../utils/icon'
import { getColorClasses } from '../../utils/color-presets'
import { useText } from '../../i18n/use-t'
import type { StatsGridProps, StatItem } from '../../types/dialog-header'

type Text = ReturnType<typeof useText>

/**
 * Resolve a value from StatItem (static or function; either may be a MessageRef)
 */
function resolveValue<T>(item: T, value: StatItem<T>['value'], text: Text): string | number {
  const result = typeof value === 'function' ? value(item) : value
  if (result === null || result === undefined) return '-'
  return typeof result === 'number' ? result : (text(result) ?? '-')
}

/**
 * Check if a stat should be hidden
 */
function isHidden<T>(
  item: T,
  hidden: boolean | ((item: T) => boolean) | undefined
): boolean {
  if (hidden === undefined) return false
  if (typeof hidden === 'function') return hidden(item)
  return hidden
}

/** Wraps the card in a Link when the stat has an `href` for this item */
function StatLink<T>({
  item,
  stat,
  className,
  children,
}: {
  item: T
  stat: StatItem<T>
  className: string
  children: ReactNode
}) {
  const href = typeof stat.href === 'function' ? stat.href(item) : stat.href
  if (!href) return <div className={className}>{children}</div>
  return (
    <Link
      href={href}
      className={cn(
        className,
        'block transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {children}
    </Link>
  )
}

/**
 * StatsRow Component - Inline stats displayed on the right side of header
 *
 * Uses accent style: white bg, left border, gradient icon
 */
export function StatsRow<T>({ item, stats }: StatsGridProps<T>) {
  const text = useText()
  const visibleItems = stats.items.filter(
    statItem => !isHidden(item, statItem.hidden)
  )

  if (visibleItems.length === 0) return null

  return (
    <div className='flex items-stretch gap-2 overflow-x-auto scrollbar-hide mr-6'>
      {visibleItems.map((statItem, i) => (
        <StatCardInline key={i} item={item} stat={statItem} text={text} />
      ))}
    </div>
  )
}

/**
 * StatsGrid Component - Grid layout (for below-header usage)
 */
export function StatsGrid<T>({ item, stats }: StatsGridProps<T>) {
  const text = useText()
  const visibleItems = stats.items.filter(
    statItem => !isHidden(item, statItem.hidden)
  )

  if (visibleItems.length === 0) return null

  const columns =
    stats.columns || (Math.min(visibleItems.length, 4) as 2 | 3 | 4)

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-3 mt-4', gridCols[columns])}>
      {visibleItems.map((statItem, i) => (
        <StatCardGrid key={i} item={item} stat={statItem} text={text} />
      ))}
    </div>
  )
}

/**
 * Inline stat card for header row (accent style: white bg, left border, gradient icon)
 */
interface StatCardProps<T> {
  item: T
  stat: StatItem<T>
  text: Text
}

function StatCardInline<T>({ item, stat, text }: StatCardProps<T>) {
  const colors = getColorClasses(stat.color)
  const value = resolveValue(item, stat.value, text)

  return (
    <StatLink
      item={item}
      stat={stat}
      className={cn(
        'relative shrink-0 bg-card rounded-lg border-l-[3px] overflow-hidden',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06)]',
        colors.accentBorder
      )}
    >
      <div className='flex items-center gap-2 p-3'>
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            'bg-gradient-to-br shadow-md',
            colors.iconGradient,
            colors.iconShadow
          )}
        >
          {renderIcon(stat.icon, 'h-4 w-4 text-white')}
        </div>

        <div className='min-w-0'>
          <p className='text-lg font-bold leading-none text-foreground'>
            {value}
          </p>
          <p className='text-[10px] text-muted-foreground'>{text(stat.label)}</p>
        </div>
      </div>
    </StatLink>
  )
}

/**
 * Grid stat card (accent style: white bg, left border, gradient icon)
 */
function StatCardGrid<T>({ item, stat, text }: StatCardProps<T>) {
  const colors = getColorClasses(stat.color)
  const value = resolveValue(item, stat.value, text)

  return (
    <StatLink
      item={item}
      stat={stat}
      className={cn(
        'relative bg-card rounded-lg border-l-[3px]',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06)]',
        colors.accentBorder
      )}
    >
      <div className='flex items-center gap-3 p-3'>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            'bg-gradient-to-br shadow-md',
            colors.iconGradient,
            colors.iconShadow
          )}
        >
          {renderIcon(stat.icon, 'h-4 w-4 text-white')}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='text-xs text-muted-foreground truncate'>{text(stat.label)}</p>
          <p className='text-sm font-semibold truncate text-foreground'>
            {value}
          </p>
        </div>
      </div>
    </StatLink>
  )
}

export default StatsGrid
