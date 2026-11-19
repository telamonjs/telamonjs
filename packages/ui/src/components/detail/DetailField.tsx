'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '../../utils'
import { TEST_IDS } from '../../utils/test-ids'
import {
  Density,
  FieldLayout,
  DENSITY_SPACING,
} from '../../utils/spacing'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

/**
 * DetailFieldProps - Configuration for DetailField component
 *
 * @category Detail
 *
 * @description
 * Props for DetailField component that displays a label-value pair in detail pages.
 * Commonly used within DetailCard to show individual pieces of information.
 */
export interface DetailFieldProps {
  /** Optional icon displayed before the label. Use Lucide React icons. */
  icon?: LucideIcon

  /** Field label (e.g., "Email", "Created At", "Total Amount") */
  label: I18nText

  /** Field value. Can be string, number, formatted date, or custom ReactNode. */
  value: React.ReactNode

  /** Visual variant. 'highlighted' uses primary color and larger font. Default: 'default' */
  variant?: 'default' | 'highlighted'

  /** Display top border above the field. Useful for separating sections. Default: false */
  border?: boolean

  /** Additional CSS classes */
  className?: string

  /** Field name used for generating test ID. Defaults to kebab-cased label. */
  name?: string

  /**
   * Density controls spacing and sizing.
   * - 'compact': Minimal spacing for dense information display
   * - 'comfortable': Default balanced spacing (legacy behavior)
   * - 'spacious': Extra padding for emphasis
   *
   * @default 'comfortable'
   */
  density?: Density

  /**
   * Layout direction for label and value.
   * - 'stacked': Label and value in same row (default, legacy behavior)
   * - 'horizontal': Label left, value right with justify-between
   *
   * @default 'stacked'
   */
  layout?: FieldLayout
}

/**
 * DetailField - Display individual field in detail pages
 *
 * @category Detail
 * @status stable
 *
 * @description
 * Production-ready component for displaying label-value pairs in detail/view pages.
 * Renders a horizontal layout with optional icon, label, and formatted value.
 *
 * **Key Features:**
 * - **Icon support:** Optional Lucide React icon before label
 * - **Flexible value:** Accepts string, number, or custom React components
 * - **Visual variants:** Default or highlighted (primary color + larger font)
 * - **Border option:** Add top border for visual separation
 * - **Density control:** Compact, comfortable, or spacious spacing
 * - **Layout options:** Stacked or horizontal alignment
 * - **Responsive:** Adapts to container width
 * - **Semantic:** Clear label-value relationship
 * - **Testable:** Auto-generated data-testid for E2E testing
 *
 * **When to use:**
 * - Inside DetailCard to display individual fields
 * - For label-value pairs in any detail/view page
 * - Anywhere you need to show "Label: Value" format
 *
 * **Best practices:**
 * - Use icons sparingly (only for important fields)
 * - Use 'highlighted' variant for key metrics or totals
 * - Use 'border' prop to separate logical groups of fields
 * - Use 'compact' density inside dialogs for denser information
 * - Use 'horizontal' layout when space is limited
 *
 * @example
 * Basic field (no icon):
 * ```tsx
 * import { DetailField } from '@telamonjs/ui'
 *
 * export default function UserDetailPage({ user }: { user: User }) {
 *   return (
 *     <DetailCard title="Contact Information">
 *       <DetailField label="Email" value={user.email} />
 *       <DetailField label="Phone" value={user.phone} />
 *       <DetailField label="Address" value={user.address} />
 *     </DetailCard>
 *   )
 * }
 * ```
 *
 * @example
 * With compact density (for dialogs):
 * ```tsx
 * <DetailCard title="Summary" density="compact">
 *   <DetailField label="Packing" value={packing.numero} density="compact" />
 *   <DetailField label="Linha" value={linha.nome} density="compact" />
 *   <DetailField label="Status" value="Ativo" density="compact" />
 * </DetailCard>
 * ```
 *
 * @example
 * With horizontal layout:
 * ```tsx
 * <DetailCard title="Metrics">
 *   <DetailField label="Total" value="$1,234.56" layout="horizontal" />
 *   <DetailField label="Count" value="42" layout="horizontal" />
 * </DetailCard>
 * ```
 *
 * @example
 * With icon:
 * ```tsx
 * import { Mail, Phone, MapPin, Calendar } from 'lucide-react'
 *
 * <DetailCard title="Contact Information">
 *   <DetailField icon={Mail} label="Email" value={user.email} />
 *   <DetailField icon={Phone} label="Phone" value={user.phone} />
 *   <DetailField icon={MapPin} label="City" value={user.city} />
 *   <DetailField icon={Calendar} label="Member Since" value={formatDate(user.createdAt)} />
 * </DetailCard>
 * ```
 *
 * @example
 * With highlighted variant (for important metrics):
 * ```tsx
 * <DetailCard title="Order Summary">
 *   <DetailField label="Subtotal" value={formatCurrency(order.subtotal)} />
 *   <DetailField label="Tax" value={formatCurrency(order.tax)} />
 *   <DetailField label="Shipping" value={formatCurrency(order.shipping)} />
 *   <DetailField
 *     label="Total"
 *     value={formatCurrency(order.total)}
 *     variant="highlighted" // Primary color, larger font
 *     border // Top border for separation
 *   />
 * </DetailCard>
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/detail-page.mdx | Detail Views}
 * @see {@link DetailCard} for grouping multiple fields
 * @see {@link DetailLayout} for overall page structure
 */
export function DetailField({
  icon: Icon,
  label,
  value,
  variant = 'default',
  border = false,
  className,
  name,
  density = 'comfortable',
  layout = 'stacked',
}: DetailFieldProps) {
  const text = useText()
  const resolvedLabel = text(label) ?? ''
  // Generate test ID from name or label (kebab-cased)
  const fieldName = name || resolvedLabel.toLowerCase().replace(/\s+/g, '-')

  // Get spacing based on density
  const spacing = DENSITY_SPACING[density]

  // Text size based on density
  const textSize = density === 'compact' ? 'text-xs' : 'text-sm'

  // Border spacing based on density
  const borderClass = border
    ? density === 'compact'
      ? 'pt-1.5 border-t'
      : 'pt-3 border-t'
    : ''

  // Layout-specific classes
  const layoutClasses =
    layout === 'horizontal'
      ? 'flex items-center justify-between'
      : `flex items-center ${spacing.gap}`

  return (
    <div
      data-testid={TEST_IDS.DETAIL.field(fieldName)}
      className={cn(layoutClasses, textSize, borderClass, className)}
    >
      {layout === 'horizontal' ? (
        // Horizontal layout: label left, value right
        <>
          <span className='text-muted-foreground flex items-center gap-1.5'>
            {Icon && (
              <Icon
                className={cn(
                  'text-muted-foreground flex-shrink-0',
                  spacing.iconSize
                )}
              />
            )}
            {resolvedLabel}
          </span>
          <span
            className={cn(
              'font-medium text-right',
              variant === 'highlighted' &&
                (density === 'compact'
                  ? 'text-primary text-sm'
                  : 'text-primary text-lg')
            )}
          >
            {value}
          </span>
        </>
      ) : (
        // Stacked layout (default): icon + label: + value
        <>
          {Icon && (
            <Icon
              className={cn(
                'text-muted-foreground flex-shrink-0',
                spacing.iconSize
              )}
            />
          )}
          <span className='text-muted-foreground'>{resolvedLabel}:</span>
          <span
            className={cn(
              'font-medium',
              variant === 'highlighted' &&
                (density === 'compact'
                  ? 'text-primary text-sm'
                  : 'text-primary text-lg')
            )}
          >
            {value}
          </span>
        </>
      )}
    </div>
  )
}
