'use client'

import { BaseCard } from '../base/BaseCard'
import { DetailCardHeader } from '../base/DetailCardHeader'
import { DetailField, DetailFieldProps } from './DetailField'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '../../utils'
import {
  Density,
  CardFieldLayout,
  DENSITY_SPACING,
  CARD_FIELD_LAYOUTS,
} from '../../utils/spacing'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

export interface DetailCardProps {
  /** Card title (optional when using only children) */
  title?: I18nText
  /** Optional description below the title */
  description?: I18nText
  /** Optional icon next to the title */
  icon?: LucideIcon
  /** Badge or element in the top-right corner of the header */
  headerBadge?: ReactNode
  /** Array of fields to render automatically */
  fields?: DetailFieldProps[]
  /** Custom content (used instead of fields) */
  children?: ReactNode
  /** Additional classes */
  className?: string

  /**
   * Density controls spacing and sizing for the entire card.
   * - 'compact': Minimal spacing for dense information display
   * - 'comfortable': Default balanced spacing (legacy behavior)
   * - 'spacious': Extra padding for emphasis
   *
   * @default 'comfortable'
   */
  density?: Density

  /**
   * Layout for fields inside the card.
   * - 'single': One field per row (default, legacy behavior)
   * - '2-col': Two fields per row on md+ screens
   * - '3-col': Three fields per row on lg+ screens
   *
   * @default 'single'
   */
  fieldLayout?: CardFieldLayout

  /**
   * Header size (exposed from DetailCardHeader).
   * - 'sm': Smaller title text
   * - 'md': Default title text
   *
   * @default 'md'
   */
  headerSize?: 'sm' | 'md'
}

/**
 * DetailCard - Card for grouping related information on detail pages
 *
 * @category Detail
 * @status stable
 *
 * @description
 * Generic card for displaying information on detail pages.
 * Can render fields automatically via the `fields` prop or accept custom children.
 *
 * Key features:
 * - Auto-rendering of fields via `fields` prop
 * - Supports icon, title, description, and badge in the header
 * - Custom content via children
 * - Responsive and consistent with the design system
 * - **Density control:** Compact, comfortable, or spacious spacing
 * - **Field layout:** Single, 2-col, or 3-col grid for fields
 * - **Header size:** sm or md for title sizing
 *
 * @example
 * Using fields (automatic):
 * ```tsx
 * <DetailCard
 *   title="General Information"
 *   icon={Tag}
 *   headerBadge={<DetailStatus status="ACTIVE" statusConfig={statusConfig} />}
 *   fields={[
 *     { label: 'Name', value: 'John Smith', icon: User },
 *     { label: 'Email', value: 'john@email.com', icon: Mail, border: true },
 *     { label: 'Phone', value: '(84) 99999-9999', icon: Phone }
 *   ]}
 * />
 * ```
 *
 * @example
 * With compact density and 2-column layout:
 * ```tsx
 * <DetailCard
 *   title="Summary"
 *   icon={Info}
 *   density="compact"
 *   fieldLayout="2-col"
 *   headerSize="sm"
 *   fields={[
 *     { label: 'Packing', value: '12345' },
 *     { label: 'Line', value: 'Line A' },
 *     { label: 'Status', value: 'Active' },
 *     { label: 'Date', value: '2025-01-26' },
 *   ]}
 * />
 * ```
 *
 * @example
 * Using children (custom):
 * ```tsx
 * <DetailCard title="Additional Data" icon={Info}>
 *   <div className="space-y-2">
 *     <p>Custom content...</p>
 *     <Button>Action</Button>
 *   </div>
 * </DetailCard>
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/detail-page.mdx | Detail Views}
 */
export function DetailCard({
  title,
  description,
  icon,
  headerBadge,
  fields,
  children,
  className,
  density = 'comfortable',
  fieldLayout = 'single',
  headerSize = 'md',
}: DetailCardProps) {
  const text = useText()
  const hasHeader = title || icon || headerBadge || description

  // Get spacing based on density
  const spacing = DENSITY_SPACING[density]

  // Get grid layout classes
  const gridClasses = CARD_FIELD_LAYOUTS[fieldLayout]

  // Padding classes based on density
  const contentPadding =
    density === 'compact' ? 'pb-3 pt-2' : density === 'spacious' ? 'pb-8 pt-6' : 'pb-6 pt-4'

  return (
    <BaseCard className={className}>
      {hasHeader && (
        <DetailCardHeader
          title={text(title)}
          description={text(description)}
          icon={icon}
          badge={headerBadge}
          size={headerSize}
        />
      )}
      {(fields || children) && (
        <div className={contentPadding}>
          {fields ? (
            <div
              className={cn(
                'grid',
                gridClasses,
                fieldLayout === 'single' ? spacing.spaceY : spacing.gap
              )}
            >
              {fields.map((field, idx) => (
                <DetailField key={idx} {...field} density={field.density || density} />
              ))}
            </div>
          ) : (
            <div className={spacing.spaceY}>{children}</div>
          )}
        </div>
      )}
    </BaseCard>
  )
}
