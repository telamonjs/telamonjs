'use client'

import { PageContent } from '../../layouts/PageContent'
import { DetailAlert, DetailAlertProps } from './DetailAlert'
import { ErrorBoundary } from '../utilities/ErrorBoundary'
import { cn } from '../../utils'
import { Density, GapSize, DENSITY_SPACING, GAP_SIZES } from '../../utils/spacing'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

/**
 * DetailLayoutMode - Layout mode options for DetailLayout
 *
 * @category Detail
 */
export type DetailLayoutMode = '2-columns' | '3-columns-sidebar' | '4-columns'

/**
 * DetailLayoutProps - Configuration for DetailLayout component
 *
 * @category Detail
 *
 * @description
 * Props for DetailLayout component that provides a structured layout for detail pages.
 * Supports multiple layout modes: 2-column grid (1:1), 3-column grid with sidebar (2:1),
 * and 4-column grid for dense information display.
 */
export interface DetailLayoutProps {
  /** Page title displayed at the top (optional when used inside dialogs) */
  title?: I18nText

  /** Description or subtitle below the title */
  description?: I18nText

  /** Content for left column (used in 2-columns mode) */
  leftColumn?: React.ReactNode

  /** Content for right column (used in 2-columns mode) */
  rightColumn?: React.ReactNode

  /** Content for main column (2/3 width, used in 3-columns-sidebar mode) */
  mainColumn?: React.ReactNode

  /** Content for sidebar (1/3 width, used in 3-columns-sidebar mode) */
  sidebar?: React.ReactNode

  /**
   * Array of columns for 4-columns layout mode.
   * Each element represents content for one column.
   *
   */
  columns?: React.ReactNode[]

  /**
   * Layout mode.
   * - '2-columns': Equal width columns (md:grid-cols-2)
   * - '3-columns-sidebar': Main content (2/3) + sidebar (1/3) (lg:grid-cols-3)
   * - '4-columns': Four equal columns for dense display (lg:grid-cols-4)
   *
   * @default '2-columns'
   */
  layout?: DetailLayoutMode

  /**
   * Gap between columns.
   * - 'sm': gap-2
   * - 'md': gap-4
   * - 'lg': gap-6 (default, legacy behavior)
   *
   * @default 'lg'
   */
  gap?: GapSize

  /**
   * Density controls vertical spacing within sections.
   * - 'compact': Minimal spacing for dense information display
   * - 'comfortable': Default balanced spacing (legacy behavior)
   * - 'spacious': Extra padding for emphasis
   *
   * @default 'comfortable'
   */
  density?: Density

  /** Array of alerts to display at the top of the page */
  alerts?: Omit<DetailAlertProps, 'className'>[]

  /** Action buttons in header (e.g., Edit, Delete). Rendered on the right side. */
  headerActions?: React.ReactNode

  /** Additional content below the grid (e.g., tables, timeline, comments) */
  footer?: React.ReactNode

  /** Additional CSS classes for container */
  className?: string

  /**
   * Enable ErrorBoundary wrapping. Default: true
   * Set to false to disable automatic error boundary.
   */
  errorBoundary?: boolean

  /**
   * Custom fallback component for ErrorBoundary.
   * If not provided, uses DefaultErrorFallback.
   */
  errorFallback?: React.ReactNode
}

/**
 * DetailLayout - Standard layout for detail pages
 *
 * @category Detail
 * @status stable
 *
 * @description
 * Production-ready layout component for detail/view pages. Provides structured organization
 * of content with responsive grids, alerts, header actions, and footer sections.
 *
 * **Key Features:**
 * - **Three layout modes:** 2-column (1:1), 3-column with sidebar (2:1), 4-column (1:1:1:1)
 * - **Gap control:** sm, md, or lg spacing between columns
 * - **Density control:** Compact, comfortable, or spacious vertical spacing
 * - **Responsive grid:** Automatically stacks on mobile
 * - **Alerts section:** Display warnings, errors, or info messages at the top
 * - **Header actions:** Quick actions (Edit, Delete) in header
 * - **Footer section:** Full-width content below grid (timeline, comments, etc.)
 * - **Flexible content:** Use with any Detail components (DetailCard, DetailField, etc.)
 *
 * **Layout Modes:**
 * - **2-columns (default):** Equal width columns (`md:grid-cols-2`)
 *   - Use `leftColumn` and `rightColumn` props
 *   - Best for: Balanced information display
 *
 * - **3-columns-sidebar:** Main content (2/3) + sidebar (1/3) (`lg:grid-cols-3`)
 *   - Use `mainColumn` and `sidebar` props
 *   - Best for: Primary content with supporting actions/status
 *
 * - **4-columns:** Four equal columns (`lg:grid-cols-4`)
 *   - Use `columns` array prop
 *   - Best for: Dense information display in dialogs
 *
 * **When to use:**
 * - ALWAYS for detail/view pages (`/users/[id]`, `/products/[id]`)
 * - NOT for edit pages (use Form components instead)
 * - NOT for list pages (use ListPage component instead)
 *
 * @example
 * 2-column layout (default - equal width columns):
 * ```tsx
 * import { DetailLayout, DetailCard, DetailField } from '@telamonjs/ui'
 *
 * export default function UserDetailPage({ user }: { user: User }) {
 *   return (
 *     <DetailLayout
 *       title="User Details"
 *       description={user.name}
 *       layout="2-columns" // Optional, this is the default
 *       leftColumn={
 *         <>
 *           <DetailCard title="Personal Information">
 *             <DetailField label="Name" value={user.name} />
 *             <DetailField label="Email" value={user.email} />
 *             <DetailField label="Phone" value={user.phone} />
 *           </DetailCard>
 *         </>
 *       }
 *       rightColumn={
 *         <>
 *           <DetailCard title="Account Status">
 *             <DetailField label="Created At" value={formatDate(user.createdAt)} />
 *           </DetailCard>
 *         </>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * 4-column layout (for dense dialogs):
 * ```tsx
 * <DetailLayout
 *   layout="4-columns"
 *   gap="sm"
 *   density="compact"
 *   columns={[
 *     <DetailCard title="Operation" density="compact" headerSize="sm">
 *       <DetailField label="Packing" value="12345" density="compact" layout="horizontal" />
 *       <DetailField label="Line" value="Line A" density="compact" layout="horizontal" />
 *     </DetailCard>,
 *     <DetailCard title="Product" density="compact" headerSize="sm">
 *       <DetailField label="SKU" value="ABC123" density="compact" layout="horizontal" />
 *       <DetailField label="Name" value="Product X" density="compact" layout="horizontal" />
 *     </DetailCard>,
 *     <DetailCard title="Weight" density="compact" headerSize="sm">
 *       <DetailField label="Gross" value="1.500 kg" density="compact" layout="horizontal" />
 *       <DetailField label="Net" value="1.200 kg" density="compact" layout="horizontal" />
 *     </DetailCard>,
 *     <DetailCard title="Status" density="compact" headerSize="sm">
 *       <DetailField label="Status" value="Active" density="compact" layout="horizontal" />
 *       <DetailField label="Data" value="2025-01-26" density="compact" layout="horizontal" />
 *     </DetailCard>,
 *   ]}
 * />
 * ```
 *
 * @example
 * With custom gap and density:
 * ```tsx
 * <DetailLayout
 *   layout="2-columns"
 *   gap="sm"
 *   density="compact"
 *   leftColumn={...}
 *   rightColumn={...}
 * />
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/detail-page.mdx | Detail Views}
 * @see {@link DetailCard} for grouping related information
 * @see {@link DetailField} for displaying individual fields
 * @see {@link DetailAlert} for alert messages
 */
export function DetailLayout({
  title,
  description,
  leftColumn,
  rightColumn,
  mainColumn,
  sidebar,
  columns,
  layout = '2-columns',
  gap = 'lg',
  density = 'comfortable',
  alerts,
  headerActions,
  footer,
  className,
  errorBoundary = true,
  errorFallback,
}: DetailLayoutProps) {
  const text = useText()
  // Get spacing configurations
  const gapClass = GAP_SIZES[gap]
  const spacingConfig = DENSITY_SPACING[density]

  // Determine grid layout classes based on mode
  const getGridClasses = () => {
    switch (layout) {
      case '4-columns':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      case '3-columns-sidebar':
        return 'lg:grid-cols-3'
      case '2-columns':
      default:
        return 'md:grid-cols-2'
    }
  }

  // Render content based on layout mode
  const renderColumns = () => {
    if (layout === '4-columns' && columns) {
      return columns.map((column, colIdx) => (
        <div key={`col-${colIdx}`} className={spacingConfig.spaceY}>
          {column}
        </div>
      ))
    }

    if (layout === '3-columns-sidebar') {
      return (
        <>
          {/* Main column (2/3 width) */}
          <div className={cn('lg:col-span-2', spacingConfig.spaceY)}>
            {mainColumn}
          </div>
          {/* Sidebar (1/3 width) */}
          {sidebar && (
            <div className={spacingConfig.spaceY}>{sidebar}</div>
          )}
        </>
      )
    }

    // Default: 2-columns
    return (
      <>
        {/* Left column */}
        <div className={spacingConfig.spaceY}>{leftColumn}</div>
        {/* Right column */}
        {rightColumn && (
          <div className={spacingConfig.spaceY}>{rightColumn}</div>
        )}
      </>
    )
  }

  // Main spacing based on density
  const mainSpacing =
    density === 'compact'
      ? 'space-y-3'
      : density === 'spacious'
        ? 'space-y-8'
        : 'space-y-6'

  // Extract content to enable ErrorBoundary wrapping
  const content = (
    <PageContent
      title={text(title)}
      description={text(description)}
      variant='plain'
      className={cn(mainSpacing, className)}
    >
      {/* Header Actions */}
      {headerActions && (
        <div className='flex justify-between items-center -mt-2 mb-6'>
          <div />
          {headerActions}
        </div>
      )}

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div
          className={cn(
            density === 'compact' ? 'space-y-2 mb-3' : 'space-y-3 mb-6'
          )}
        >
          {alerts.map((alert, idx) => (
            <DetailAlert key={idx} {...alert} />
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className={cn('grid items-start', gapClass, getGridClasses())}>
        {renderColumns()}
      </div>

      {/* Footer (full width) */}
      {footer && (
        <div className={density === 'compact' ? 'mt-3' : 'mt-6'}>
          {footer}
        </div>
      )}
    </PageContent>
  )

  // Wrap with ErrorBoundary (opt-out via errorBoundary prop)
  if (!errorBoundary) {
    return content
  }

  return <ErrorBoundary fallback={errorFallback}>{content}</ErrorBoundary>
}
