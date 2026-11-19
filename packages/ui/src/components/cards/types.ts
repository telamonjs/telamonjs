import type { IconInput } from '../../utils/icon'
import type { I18nText } from '../../i18n/msg'

export type CardColor =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'orange'
  | 'gray'

export type StatCardVariant = 'tinted' | 'outlined' | 'accent'
export type StatCardSize = 'mini' | 'compact' | 'default'

export type CardIcon = IconInput

export interface StatCardBadge {
  text: I18nText
  variant: 'success' | 'destructive' | 'warning'
}

export interface StatCardProps {
  label: I18nText
  value: string | number
  icon: CardIcon
  color: CardColor
  variant?: StatCardVariant
  size?: StatCardSize
  badge?: StatCardBadge
  subtitle?: I18nText
  onClick?: () => void
  formatNumber?: boolean
  highlight?: boolean
  pulse?: boolean
  /** Animated count up to the value — only animates when `value` is a number */
  animate?: boolean
  /** Animation duration in ms (default 500) */
  animationDuration?: number
  /**
   * Let a long label wrap instead of truncating with an ellipsis
   * (`outlined`/`accent`; `tinted` never truncates). Default: truncate
   */
  wrapLabel?: boolean
  className?: string
}

export interface StatsGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5 | 6
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export interface QuickActionCardProps {
  title: I18nText
  icon: CardIcon
  color: CardColor
  href?: string
  onClick?: () => void
  className?: string
}

export interface QuickActionGridProps {
  children: React.ReactNode
  columns?: 3 | 4 | 5 | 6
  className?: string
}

export interface StatCardSkeletonProps {
  count?: number
  variant?: StatCardVariant
  size?: StatCardSize
  className?: string
}
