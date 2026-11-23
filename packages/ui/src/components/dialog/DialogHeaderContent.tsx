'use client'

import * as React from 'react'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { cn } from '../../utils'
import { renderIcon } from '../../utils/icon'
import {
  getColorClasses,
  DEFAULT_HEADER_GRADIENT,
} from '../../utils/color-presets'
import { Badge } from '../../ui/badge'
import { StatsRow } from './StatsGrid'
import { isMessageRef } from '../../i18n/msg'
import type { I18nText } from '../../i18n/msg'
import type {
  DialogHeaderProps,
  DialogHeaderConfig,
} from '../../types/dialog-header'

/**
 * Resolve an I18nText/function value from config. `text` is passed in (never
 * called via useText() here) so this stays a plain, non-hook helper. The
 * function form may itself return a MessageRef, so its result goes through `text()` too.
 */
function resolveString<T>(
  item: T | null,
  value: I18nText | ((item: T) => I18nText | null | undefined) | undefined,
  text: ReturnType<typeof useText>
): string {
  if (!value) return ''
  if (typeof value === 'function') {
    if (!item) return ''
    return text(value(item) ?? undefined) ?? ''
  }
  return text(value) ?? ''
}

/**
 * Resolve `subtitle`: I18nText/MessageRef is translated, any other ReactNode is
 * rendered as is; the function form receives the item (and may return either).
 */
function resolveSubtitle<T>(
  item: T | null,
  value: DialogHeaderConfig<T>['subtitle'],
  text: ReturnType<typeof useText>
): React.ReactNode {
  const v = typeof value === 'function' ? (item ? value(item) : null) : value
  if (v == null || v === false || v === '') return null
  return isMessageRef(v) ? text(v) : (v as React.ReactNode)
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce(
      (current, key) => (current as Record<string, unknown> | undefined)?.[key],
      obj
    )
}

/**
 * DialogHeaderContent Component
 *
 * Renders a rich dialog header with icon, title, subtitle, badge, and stats.
 * Stats are displayed inline on the right side with decorative backgrounds.
 *
 * @example
 * ```tsx
 * <DialogHeaderContent
 *   item={parametro}
 *   config={{
 *     icon: 'Settings',
 *     iconColor: 'purple',
 *     title: (p) => p.nome,
 *     subtitle: (p) => p.codigo,
 *     gradient: 'from-purple-50 to-indigo-50',
 *     badge: {
 *       field: 'api',
 *       variants: { true: 'default', false: 'secondary' },
 *       labels: { true: 'API', false: 'Sistema' }
 *     },
 *     stats: {
 *       columns: 4,
 *       items: [
 *         { label: 'Tipo', value: (p) => getTipo(p.valor), icon: 'FileType', color: 'blue' }
 *       ]
 *     }
 *   }}
 *   mode="view"
 * />
 * ```
 */
export function DialogHeaderContent<T extends Record<string, unknown>>({
  item,
  config,
  mode,
}: DialogHeaderProps<T>) {
  const t = useTelamonjsT()
  const text = useText()
  const iconColors = getColorClasses(config.iconColor)
  const gradient = config.gradient || DEFAULT_HEADER_GRADIENT

  // Resolve title and subtitle
  const title = resolveString(item, config.title, text)
  const subtitle = resolveSubtitle(item, config.subtitle, text)

  // Resolve badge
  const renderBadge = () => {
    if (!config.badge || !item) return null

    const { field, variants, labels, getVariant, getLabel } = config.badge
    const fieldValue = getNestedValue(item, field)
    const fieldKey = String(fieldValue)

    // Get variant
    const variant = getVariant
      ? getVariant(item)
      : variants[fieldKey] || 'secondary'

    // Get label
    const label = getLabel
      ? text(getLabel(item))
      : text(labels?.[fieldKey]) || fieldKey

    return (
      <Badge variant={variant} className='ml-2'>
        {label}
      </Badge>
    )
  }

  return (
    <div
      className={cn(
        'border-b bg-gradient-to-r px-6 py-4',
        // In dark mode, the consumer's light gradient is neutralized to the theme surface.
        'dark:bg-none dark:bg-card',
        gradient,
        config.className
      )}
    >
      {/* Header row: left side (icon, title, badge) + right side (stats) */}
      <div className='flex items-start justify-between gap-4'>
        {/* Left: Icon + Title + Subtitle + Badge */}
        <div className='flex items-start gap-3 flex-1 min-w-0'>
          <div
            className={cn('rounded-full p-2.5 flex-shrink-0', iconColors.bg)}
          >
            {renderIcon(config.icon, cn('h-5 w-5', iconColors.icon))}
          </div>
          <div className='min-w-0'>
            <div className='flex items-center flex-wrap gap-1'>
              <h2 className='text-lg font-semibold text-foreground truncate'>
                {title ||
                  (mode === 'create'
                    ? t('common.create')
                    : t('common.loading'))}
              </h2>
              {renderBadge()}
            </div>
            {subtitle && (
              // div, not p: a ReactNode subtitle may hold block elements
              <div className='text-sm text-muted-foreground truncate mt-0.5'>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats inline (scrollable, wraps below on small screens) */}
        {config.stats && item && <StatsRow item={item} stats={config.stats} />}
      </div>
    </div>
  )
}

/**
 * Helper to create a header renderer function from config
 * This is used to bridge headerConfig to the existing renderHeader pattern
 */
// eslint-disable-next-line react-refresh/only-export-components -- factory helper tied to DialogHeaderContent, colocated by design
export function createHeaderRenderer<T extends Record<string, unknown>>(
  config: DialogHeaderConfig<T>,
  mode: 'view' | 'edit' | 'create'
): (item: T) => React.ReactNode {
  return (item: T) => (
    <DialogHeaderContent item={item} config={config} mode={mode} />
  )
}

/**
 * Helper to create a header renderer for create dialogs (no item)
 */
// eslint-disable-next-line react-refresh/only-export-components -- factory helper tied to DialogHeaderContent, colocated by design
export function createCreateHeaderRenderer<T extends Record<string, unknown>>(
  config: DialogHeaderConfig<T>
): () => React.ReactNode {
  return () => <DialogHeaderContent item={null} config={config} mode='create' />
}

export default DialogHeaderContent
