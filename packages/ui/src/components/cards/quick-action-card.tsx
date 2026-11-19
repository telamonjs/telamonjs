'use client'

import { memo } from 'react'
import Link from 'next/link'
import { resolveIcon } from '../../utils/icon'
import { cn } from '../../utils/cn'
import { cardColors } from './colors'
import { useText } from '../../i18n/use-t'
import type { QuickActionCardProps } from './types'

export const QuickActionCard = memo(function QuickActionCard({
  title,
  icon,
  color,
  href,
  onClick,
  className,
}: QuickActionCardProps) {
  const text = useText()
  const Icon = resolveIcon(icon)
  const styles = cardColors.accent[color]

  const content = (
    <>
      <div
        className={cn(
          'mb-3 flex h-14 w-14 items-center justify-center rounded-xl',
          'bg-gradient-to-br text-white shadow-lg',
          'transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3',
          styles.iconGradient,
          styles.iconShadow
        )}
      >
        <Icon className='h-7 w-7' />
      </div>
      <span className='text-center text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors'>
        {text(title)}
      </span>
    </>
  )

  const baseClass = cn(
    'group flex flex-col items-center rounded-xl bg-card p-4',
    'shadow-sm transition-all duration-200 hover:shadow-md',
    className
  )

  if (onClick) {
    return (
      <button
        type='button'
        onClick={onClick}
        className={cn(baseClass, 'w-full')}
        data-testid='quick-action-card'
      >
        {content}
      </button>
    )
  }

  return (
    <Link href={href ?? '#'} className={baseClass}>
      {content}
    </Link>
  )
})
