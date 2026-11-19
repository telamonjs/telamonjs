'use client'

import { memo } from 'react'
import { useAnimatedCounter } from '../../dashboard/hooks/useAnimatedCounter'
import { resolveIcon } from '../../utils/icon'
import { cn } from '../../utils/cn'
import { Badge } from '../../ui/badge'
import { cardColors } from './colors'
import { useStatsGridDense } from './stats-grid'
import { useFormat } from '../../i18n/use-format'
import { useText } from '../../i18n/use-t'
import type { StatCardProps, StatCardBadge } from './types'

/** `StatCardProps` with `label`/`subtitle`/`badge.text` already resolved to
 * plain strings — what `TintedCard`/`OutlinedCard`/`AccentCard` render. The
 * I18nText -> string resolution happens once, in the `StatCard` dispatcher below. */
type ResolvedStatCardProps = Omit<StatCardProps, 'label' | 'subtitle' | 'badge'> & {
  label: string
  subtitle?: string
  badge?: Omit<StatCardBadge, 'text'> & { text: string }
}

function formatValue(
  value: string | number,
  formatNumber: boolean,
  formatNumberFn: (v: number) => string
): string {
  if (value == null) return '-'
  if (typeof value === 'string') return value
  if (!formatNumber) return String(value)
  return formatNumberFn(value)
}

// memo: an un-memoized component elsewhere in this file confuses the React
// Compiler's analysis of TintedCard/OutlinedCard/AccentCard's icon rendering
// below (verified empirically) — memoizing every component in the file
// clears it.
const PulseDot = memo(function PulseDot() {
  return (
    <span className='h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 animate-pulse' />
  )
})

// memo: each *Card resolves its icon prop to a component reference via
// resolveIcon() at render time; the compiler can't prove that reference is
// stable across renders unless the declaring component itself is memoized
// (same situation/fix as CardLink.tsx's CardLinkIcon).
const TintedCard = memo(function TintedCard({
  label,
  value,
  icon,
  color,
  size,
  subtitle,
  highlight,
  pulse,
  formatNumber = true,
  className,
}: ResolvedStatCardProps) {
  const { number } = useFormat()
  const Icon = resolveIcon(icon)
  const styles = cardColors.tinted[color]
  const isMini = size === 'mini'
  const isCompact = size === 'compact' || isMini

  return (
    <div
      className={cn(
        'relative overflow-hidden border',
        styles.bg,
        styles.border,
        isMini
          ? 'rounded-md px-1.5 py-1'
          : isCompact
            ? 'rounded-lg p-2'
            : 'rounded-lg p-3',
        highlight && `ring-2 ${styles.ring}`,
        className
      )}
    >
      {!isCompact && (
        <div className='absolute -right-2 -top-2 h-12 w-12 rounded-full bg-current opacity-5' />
      )}
      <div
        className={cn(
          'relative flex items-center',
          isMini ? 'gap-1' : isCompact ? 'gap-1.5' : 'gap-2'
        )}
      >
        <div
          className={cn(
            'rounded-md shrink-0',
            isMini ? 'p-1' : isCompact ? 'p-1' : 'p-1.5',
            styles.iconBg
          )}
        >
          <Icon
            className={cn(
              isMini ? 'h-3.5 w-3.5' : isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4',
              styles.text
            )}
          />
        </div>
        <div className='min-w-0'>
          <p
            className={cn(
              'font-bold leading-none truncate',
              styles.value,
              isMini ? 'text-xs' : isCompact ? 'text-sm' : 'text-lg'
            )}
          >
            {formatValue(value, formatNumber, number)}
          </p>
          <div className='flex items-center gap-1'>
            <p
              className={cn(
                'text-muted-foreground',
                isMini ? 'text-[8px]' : isCompact ? 'text-[9px]' : 'text-[10px]'
              )}
            >
              {label}
            </p>
            {pulse && Number(value) > 0 && <PulseDot />}
          </div>
          {subtitle && !isMini && (
            <p className='text-[10px] text-muted-foreground truncate'>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
})

const OutlinedCard = memo(function OutlinedCard({
  label,
  value,
  icon,
  color,
  badge,
  subtitle,
  highlight,
  pulse,
  formatNumber = true,
  wrapLabel,
  className,
}: ResolvedStatCardProps) {
  const { number } = useFormat()
  const Icon = resolveIcon(icon)
  const styles = cardColors.outlined[color]

  return (
    <div
      className={cn(
        'rounded-xl bg-card border border-border',
        'px-3 py-2 w-full',
        'shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5',
        highlight && `ring-2 ${styles.ring}`,
        className
      )}
    >
      <div className='flex items-center gap-2.5'>
        <div
          className={cn(
            'flex items-center justify-center h-9 w-9 rounded-full shrink-0',
            styles.iconBg,
            styles.iconText
          )}
        >
          <Icon className='h-4 w-4' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-1'>
            <p
              className={cn(
                'text-[11px] font-medium text-muted-foreground',
                wrapLabel ? 'break-words' : 'truncate'
              )}
            >
              {label}
            </p>
            {pulse && Number(value) > 0 && <PulseDot />}
          </div>
          <p className='text-lg font-bold tabular-nums leading-tight text-foreground'>
            {formatValue(value, formatNumber, number)}
          </p>
          {subtitle && (
            <p className='text-xs text-muted-foreground truncate'>
              {subtitle}
            </p>
          )}
          {badge && (
            <Badge
              variant={
                badge.variant === 'success' || badge.variant === 'warning'
                  ? 'default'
                  : badge.variant
              }
              className={cn(
                'mt-1 text-xs',
                badge.variant === 'success' &&
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                badge.variant === 'warning' &&
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              )}
            >
              {badge.text}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
})

const AccentCard = memo(function AccentCard({
  label,
  value,
  icon,
  color,
  size,
  badge,
  subtitle,
  highlight,
  pulse,
  formatNumber = true,
  wrapLabel,
  className,
}: ResolvedStatCardProps) {
  const { number } = useFormat()
  const Icon = resolveIcon(icon)
  const styles = cardColors.accent[color]
  const gridDense = useStatsGridDense()
  // Explicit size prop wins; otherwise auto-detect from StatsGrid context
  const isCompact = size === 'compact' || (size == null && gridDense)

  return (
    <div
      className={cn(
        'relative bg-card border-l-[3px] h-full',
        isCompact ? 'rounded-lg' : 'rounded-xl',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)]',
        'hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_20px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.06)]',
        'transition-all duration-200 ease-out',
        styles.accentBorder,
        highlight && `ring-2 ring-offset-2 ${styles.ring}`,
        className
      )}
    >
      <div
        className={cn(
          'flex items-center',
          isCompact ? 'gap-2.5 px-2.5 py-2' : 'gap-4 p-4'
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-center bg-gradient-to-br',
            isCompact
              ? 'h-9 w-9 rounded-lg shadow-md'
              : 'h-12 w-12 rounded-xl shadow-lg',
            styles.iconGradient,
            styles.iconShadow
          )}
        >
          <Icon
            className={cn('text-white', isCompact ? 'h-4 w-4' : 'h-6 w-6')}
          />
        </div>
        <div className='min-w-0 flex-1'>
          <p
            className={cn(
              'font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100',
              isCompact ? 'text-lg leading-tight' : 'text-2xl'
            )}
          >
            {formatValue(value, formatNumber, number)}
          </p>
          <div className='flex items-center gap-1'>
            <p
              className={cn(
                'text-muted-foreground',
                wrapLabel ? 'break-words' : 'truncate',
                isCompact ? 'text-[11px]' : 'text-sm'
              )}
            >
              {label}
            </p>
            {pulse && Number(value) > 0 && <PulseDot />}
          </div>
          {subtitle && (
            <p
              className={cn(
                'text-muted-foreground truncate',
                isCompact ? 'text-[10px]' : 'text-xs'
              )}
            >
              {subtitle}
            </p>
          )}
          {badge && (
            <Badge
              variant={
                badge.variant === 'success' || badge.variant === 'warning'
                  ? 'default'
                  : badge.variant
              }
              className={cn(
                'mt-1 text-xs',
                badge.variant === 'success' &&
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                badge.variant === 'warning' &&
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              )}
            >
              {badge.text}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
})

const variantMap = {
  tinted: TintedCard,
  outlined: OutlinedCard,
  accent: AccentCard,
} as const

export const StatCard = memo(function StatCard(props: StatCardProps) {
  const {
    variant = 'outlined',
    onClick,
    animate = false,
    animationDuration,
  } = props
  const CardComponent = variantMap[variant]
  const text = useText()

  // Animated count (optional): implemented here in the dispatcher so it
  // applies to all 3 variants; strings never animate (same semantics as the
  // old DashboardStatCard).
  const isNumeric = typeof props.value === 'number'
  const animatedValue = useAnimatedCounter(
    isNumeric && animate ? (props.value as number) : 0,
    animationDuration
  )
  const animatedProps =
    isNumeric && animate
      ? { ...props, value: Math.round(animatedValue) }
      : props

  // Resolve I18nText slots once at this boundary — TintedCard/OutlinedCard/
  // AccentCard keep receiving plain strings.
  const cardProps = {
    ...animatedProps,
    label: text(animatedProps.label) ?? '',
    subtitle: text(animatedProps.subtitle),
    badge: animatedProps.badge
      ? { ...animatedProps.badge, text: text(animatedProps.badge.text) ?? '' }
      : animatedProps.badge,
  }

  if (onClick) {
    return (
      <button
        type='button'
        onClick={onClick}
        className='text-left w-full cursor-pointer'
        data-testid='stat-card-button'
      >
        <CardComponent {...cardProps} />
      </button>
    )
  }

  return <CardComponent {...cardProps} />
})
