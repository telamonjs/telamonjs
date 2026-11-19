'use client'

import React from 'react'
import { cn } from '../../utils'
import { BaseCard } from '../base/BaseCard'
import { Badge } from '../../ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useTelamonjsT } from '../../i18n/use-t'

/**
 * KPICard props
 */
export interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  className?: string
  description?: string
  footer?: React.ReactNode
}

/**
 * KPICard - Key performance indicator card
 *
 * @example
 * ```tsx
 * <KPICard
 *   title="Monthly Sales"
 *   value="R$ 45.231,89"
 *   change={12.5}
 *   changeLabel="vs. last month"
 *   trend="up"
 *   icon={<DollarSign className="w-5 h-5" />}
 * />
 * ```
 */
export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  loading = false,
  className,
  description,
  footer,
}: KPICardProps) {
  const t = useTelamonjsT()
  const resolvedChangeLabel = changeLabel ?? t('dashboard.previousPeriodChange')
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className='w-4 h-4' />
    if (trend === 'down') return <TrendingDown className='w-4 h-4' />
    return <Minus className='w-4 h-4' />
  }

  const getTrendColor = () => {
    if (trend === 'up')
      return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/30'
    if (trend === 'down')
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/30'
    return 'text-muted-foreground bg-muted'
  }

  const getChangeColor = () => {
    if (!change) return 'text-muted-foreground'
    if (change > 0) return 'text-green-600 dark:text-green-400'
    if (change < 0) return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  return (
    <BaseCard
      title={title}
      icon={icon}
      iconClassName='w-5 h-5'
      className={className}
      isLoading={loading}
    >
      <div className='text-2xl font-bold'>{value}</div>

      {description && (
        <p className='text-xs text-muted-foreground mt-1'>{description}</p>
      )}

      {(change !== undefined || trend) && (
        <div className='flex items-center gap-2 mt-2'>
          {trend && (
            <Badge
              variant='secondary'
              className={cn('flex items-center gap-1', getTrendColor())}
            >
              {getTrendIcon()}
              {change !== undefined && (
                <span className='text-xs font-semibold'>
                  {change > 0 && '+'}
                  {change}%
                </span>
              )}
            </Badge>
          )}

          {!trend && change !== undefined && (
            <span className={cn('text-xs font-semibold', getChangeColor())}>
              {change > 0 && '+'}
              {change}%
            </span>
          )}

          {resolvedChangeLabel && (
            <span className='text-xs text-muted-foreground'>{resolvedChangeLabel}</span>
          )}
        </div>
      )}

      {footer && <div className='mt-3 pt-3 border-t'>{footer}</div>}
    </BaseCard>
  )
}
