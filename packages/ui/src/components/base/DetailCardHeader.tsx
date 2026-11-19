'use client'

import { CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { cn } from '../../utils'
import { renderIcon, IconType } from '../../utils/icon'
import { ReactNode } from 'react'

export interface DetailCardHeaderProps {
  title?: string
  description?: string
  icon?: IconType
  badge?: ReactNode
  actions?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

/**
 * DetailCardHeader - Unified header component for Detail pages.
 *
 * Consolidates header pattern across:
 * - DetailCard
 * - DetailLayout
 * - DetailAlert
 * - DetailAvatar
 * - DetailActions
 * - DetailFinancialValue
 * - DetailStatsGrid
 * - DetailField
 * - DetailStatus
 *
 * @example
 * ```tsx
 * // Simple header
 * <DetailCardHeader title="User Information" icon={User} />
 *
 * // With description and badge
 * <DetailCardHeader
 *   title="User Information"
 *   description="Personal details"
 *   icon={User}
 *   badge={<Badge>Active</Badge>}
 * />
 *
 * // With actions
 * <DetailCardHeader
 *   title="User Information"
 *   actions={
 *     <Button variant="ghost" size="sm">Edit</Button>
 *   }
 * />
 * ```
 */
export function DetailCardHeader({
  title,
  description,
  icon,
  badge,
  actions,
  size = 'md',
  className,
  titleClassName,
  descriptionClassName,
}: DetailCardHeaderProps) {
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  }

  return (
    <CardHeader className={cn('px-0', className)}>
      <div className='flex items-center justify-between'>
        <div className='flex-1'>
          {(title || icon) && (
            <CardTitle
              className={cn(
                'flex items-center gap-2',
                sizeClasses[size],
                titleClassName
              )}
            >
              {renderIcon(icon, 'h-5 w-5')}
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className={descriptionClassName}>
              {description}
            </CardDescription>
          )}
        </div>
        {badge && <div className='ml-4'>{badge}</div>}
      </div>
      {actions && <div className='mt-3'>{actions}</div>}
    </CardHeader>
  )
}
