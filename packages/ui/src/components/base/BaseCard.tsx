'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card'
import { Skeleton } from '../../ui/skeleton'
import { cn } from '../../utils'
import { renderIcon, IconType } from '../../utils/icon'
import { ReactNode } from 'react'

export interface BaseCardProps {
  title?: string
  description?: string
  icon?: IconType
  iconClassName?: string
  headerBadge?: ReactNode
  children?: ReactNode
  className?: string
  isLoading?: boolean
  loadingSkeletons?: {
    title?: boolean
    icon?: boolean
    content?: boolean
    description?: boolean
  }
  headerClassName?: string
  contentClassName?: string
}

/**
 * BaseCard - Unified card component with automatic loading state.
 *
 * Replaces duplicated card patterns across:
 * - DashboardStatCard
 * - KPICard
 * - DetailCard
 * - FinancialSummaryCard
 * - MetricCard
 * - QuickStatsCard
 *
 * @example
 * ```tsx
 * // Simple card
 * <BaseCard title="Users" icon={Users}>
 *   <div className="text-2xl font-bold">1,234</div>
 * </BaseCard>
 *
 * // With loading state
 * <BaseCard title="Users" icon={Users} isLoading={true}>
 *   <div className="text-2xl font-bold">1,234</div>
 * </BaseCard>
 *
 * // With badge
 * <BaseCard
 *   title="Sales"
 *   icon={DollarSign}
 *   headerBadge={<Badge>+15%</Badge>}
 * >
 *   <div className="text-2xl font-bold">$45,231</div>
 * </BaseCard>
 * ```
 */
export function BaseCard({
  title,
  description,
  icon,
  iconClassName = 'h-4 w-4',
  headerBadge,
  children,
  className,
  isLoading = false,
  loadingSkeletons: loadingSkeletonsProp,
  headerClassName,
  contentClassName,
}: BaseCardProps) {
  // Merge partial loadingSkeletons config with defaults so that
  // e.g. `{ icon: false }` only disables the icon skeleton
  const loadingSkeletons = {
    title: true,
    icon: true,
    content: true,
    description: true,
    ...loadingSkeletonsProp,
  }
  // Loading State
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader
          className={cn(
            'flex flex-row items-center justify-between space-y-0 pb-2',
            headerClassName
          )}
        >
          {loadingSkeletons.title && <Skeleton className='h-4 w-[120px]' />}
          {loadingSkeletons.icon && (
            <Skeleton className={cn('rounded-full', iconClassName)} />
          )}
        </CardHeader>
        <CardContent className={contentClassName}>
          {loadingSkeletons.content && (
            <Skeleton className='h-8 w-[150px] mb-2' />
          )}
          {loadingSkeletons.description && (
            <Skeleton className='h-4 w-[100px]' />
          )}
        </CardContent>
      </Card>
    )
  }

  // Normal State
  return (
    <Card className={className}>
      {(title || icon || description || headerBadge) && (
        <CardHeader
          className={cn(
            'flex flex-row items-center justify-between space-y-0 pb-2',
            headerClassName
          )}
        >
          <div className='flex-1'>
            {title && (
              <CardTitle className='text-sm font-medium'>{title}</CardTitle>
            )}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className='flex items-center gap-2'>
            {icon && renderIcon(icon, iconClassName)}
            {headerBadge}
          </div>
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
