/**
 * Dialog Header Configuration Types
 *
 * Provides a declarative way to configure rich dialog headers with icons,
 * badges, gradients, and stats cards. This eliminates ~100 lines of
 * repetitive JSX per CRUD dialog.
 *
 * @example
 * ```typescript
 * const headerConfig: DialogHeaderConfig<Parametro> = {
 *   icon: 'Settings',
 *   iconColor: 'purple',
 *   title: (p) => p.nome,
 *   subtitle: (p) => p.codigo,
 *   gradient: 'from-purple-50 to-indigo-50',
 *   badge: {
 *     field: 'api',
 *     variants: { true: 'default', false: 'secondary' },
 *     labels: { true: 'API', false: 'System' }
 *   },
 *   stats: {
 *     columns: 4,
 *     items: [
 *       { label: 'Type', value: (p) => getTipo(p.valor), icon: 'FileType', color: 'blue' },
 *       { label: 'Editable', value: (p) => !p.api ? 'Yes' : 'No', icon: 'Edit', color: 'green' }
 *     ]
 *   }
 * }
 * ```
 */

import type { ReactNode } from 'react'
import type { BadgeVariant } from './actions'
import type { I18nText } from '../i18n/msg'

/**
 * Available color presets for icons and stats
 */
export type ColorPreset =
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'violet'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'orange'
  | 'amber'
  | 'red'
  | 'rose'
  | 'pink'
  | 'gray'
  | 'slate'

/**
 * Configuration for a single stat item in the header
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default; consumers write `StatItem`/`DialogHeaderConfig` without type args and expect free item-field access (mirrors CrudConfig's documented default, see types/crud.ts)
export interface StatItem<T = any> {
  /** Label displayed above the value (literal or `msg()`, resolved via `useText()`; I18nText) */
  label: I18nText
  /**
   * Value to display: literal, number, `msg()` or a function of the item that returns any of them
   * (MessageRef accepted — e.g. `(v) => msg('produtos.count', { count: v.total })`).
   */
  value: I18nText | number | ((item: T) => I18nText | number | null | undefined)
  /** Lucide icon name (e.g., 'FileType', 'Edit', 'Clock') */
  icon: string
  /** Color preset for the icon background */
  color: ColorPreset
  /** Optional: hide this stat based on condition */
  hidden?: boolean | ((item: T) => boolean)
  /**
   * Optional: turns the stat into a link (e.g. the list filtered by this record).
   * A function returning null/undefined keeps that item's stat a plain card..
   */
  href?: string | ((item: T) => string | null | undefined)
}

/**
 * Badge configuration for header
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default, see StatItem above
export interface HeaderBadgeConfig<T = any> {
  /** Field path to get badge value (e.g., 'api', 'status') */
  field: string
  /** Map field values to badge variants */
  variants: Record<string, BadgeVariant>
  /** Optional: Map field values to display labels */
  labels?: Record<string, I18nText>
  /** Optional: Custom function to determine badge variant */
  getVariant?: (item: T) => BadgeVariant
  /** Optional: Custom function to determine badge label */
  getLabel?: (item: T) => string
}

/**
 * Stats grid configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default, see StatItem above
export interface HeaderStatsConfig<T = any> {
  /** Stat items to display */
  items: StatItem<T>[]
  /** Number of columns (2, 3, or 4) - defaults to items.length */
  columns?: 2 | 3 | 4
}

/**
 * Main dialog header configuration
 *
 * This is the primary interface for configuring rich dialog headers.
 * It supports icons, titles, subtitles, badges, gradients, and stats.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default, see StatItem above
export interface DialogHeaderConfig<T = any> {
  /** Lucide icon name (e.g., 'Settings', 'User', 'Building') */
  icon: string
  /** Color preset for the icon background */
  iconColor: ColorPreset
  /** Title (I18nText or function that receives item; the function may return a MessageRef) */
  title: I18nText | ((item: T) => I18nText)
  /**
   * Subtitle: I18nText, any ReactNode (rendered as is), or a function
   * that receives the item and returns either (the function may return a MessageRef).
   */
  subtitle?:
    | I18nText
    | ReactNode
    | ((item: T) => I18nText | ReactNode | null | undefined)
  /** Tailwind gradient classes (e.g., 'from-purple-50 to-indigo-50') */
  gradient?: string
  /** Badge configuration */
  badge?: HeaderBadgeConfig<T>
  /** Stats grid configuration */
  stats?: HeaderStatsConfig<T>
  /** Optional: Additional CSS class for the header container */
  className?: string
}

/**
 * Props for the DialogHeader component
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default, see StatItem above
export interface DialogHeaderProps<T = any> {
  /** The data item (null for create dialogs) */
  item: T | null
  /** Header configuration */
  config: DialogHeaderConfig<T>
  /** Mode: 'view', 'edit', or 'create' */
  mode: 'view' | 'edit' | 'create'
}

/**
 * Props for the StatsGrid component
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default, see StatItem above
export interface StatsGridProps<T = any> {
  /** The data item */
  item: T
  /** Stats configuration */
  stats: HeaderStatsConfig<T>
}
