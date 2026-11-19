'use client'

import { Badge } from '../../ui/badge'
import { cn } from '../../utils'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { ReactNode } from 'react'
import { useTelamonjsT } from '../../i18n/use-t'

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
type BadgeType = 'new' | 'beta' | 'custom' | 'status' | 'trend'

// Valid Badge component variants (from ui/badge.tsx)
type ValidBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export interface StatusBadgeProps {
  type?: BadgeType
  label?: string
  variant?: BadgeVariant
  value?: number // For trend badges
  className?: string
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const BADGE_TYPE_CONFIG: Record<BadgeType, { variant: BadgeVariant }> = {
  new: { variant: 'secondary' },
  beta: { variant: 'outline' },
  custom: { variant: 'secondary' },
  status: { variant: 'default' },
  trend: { variant: 'secondary' },
}

const SIZE_CLASSES = {
  sm: 'px-1 py-0 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

/**
 * Maps StatusBadge custom variants to valid Badge component variants
 */
function mapToValidBadgeVariant(variant: BadgeVariant): ValidBadgeVariant {
  switch (variant) {
    case 'success':
      return 'default' // Will use green color via className
    case 'warning':
      return 'outline' // Will use yellow/orange color via className
    default:
      return variant as ValidBadgeVariant
  }
}

/**
 * Returns additional className for custom variants
 */
function getVariantColorClass(variant: BadgeVariant): string {
  switch (variant) {
    case 'success':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800'
    default:
      return ''
  }
}

/**
 * StatusBadge - Unified status badge component.
 *
 * Consolidates badge patterns across:
 * - ModernSidebar (isNew, isBeta, badge)
 * - KPICard (trend badges)
 * - DetailStatus (status badges)
 * - FinancialSummaryCard
 * - DashboardWidget
 *
 * Supports:
 * - Simple badges (Novo, Beta)
 * - Status badges (Active, Inactive, etc)
 * - Trend badges (with icons and values)
 * - Custom badges
 *
 * @example
 * ```tsx
 * // New badge
 * <StatusBadge type="new" />
 *
 * // Beta badge
 * <StatusBadge type="beta" />
 *
 * // Status badge
 * <StatusBadge type="status" label="Active" variant="success" />
 *
 * // Trend badge
 * <StatusBadge type="trend" value={15.5} />
 *
 * // Custom badge
 * <StatusBadge type="custom" label="Custom" variant="outline" />
 * ```
 */
export function StatusBadge({
  type = 'custom',
  label,
  variant,
  value,
  className,
  icon,
  size = 'sm',
}: StatusBadgeProps) {
  const t = useTelamonjsT()
  const config = BADGE_TYPE_CONFIG[type]
  const badgeVariant = variant || config.variant
  // 'Beta' is a product-status term, not translated pt-BR copy — left as-is.
  const defaultLabel =
    type === 'new' ? t('common.create') : type === 'beta' ? 'Beta' : ''
  const badgeLabel = label || defaultLabel

  // Trend Badge
  if (type === 'trend' && value !== undefined) {
    const isPositive = value > 0
    const isNeutral = value === 0

    const trendColor = isNeutral
      ? 'text-muted-foreground'
      : isPositive
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400'

    const TrendIcon = isNeutral ? Minus : isPositive ? ArrowUp : ArrowDown

    return (
      <Badge
        variant={mapToValidBadgeVariant(badgeVariant)}
        className={cn(
          'flex items-center gap-1',
          SIZE_CLASSES[size],
          trendColor,
          getVariantColorClass(badgeVariant),
          className
        )}
      >
        <TrendIcon className='h-3 w-3' />
        <span className='font-semibold'>{Math.abs(value)}%</span>
      </Badge>
    )
  }

  // Simple/Status Badge
  return (
    <Badge
      variant={mapToValidBadgeVariant(badgeVariant)}
      className={cn(
        SIZE_CLASSES[size],
        getVariantColorClass(badgeVariant),
        className
      )}
    >
      {icon && <span className='mr-1'>{icon}</span>}
      {badgeLabel}
    </Badge>
  )
}
