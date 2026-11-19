'use client'

import { Badge } from '../../ui/badge'
import { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { getTestId } from '../../utils/test-ids'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

/**
 * StatusConfig - Configuration for status display
 *
 * @category Detail
 *
 * @description
 * Configuration object that defines how a specific status value should be rendered.
 * Includes label, badge variant, optional icon, and custom CSS classes.
 */
export interface StatusConfig {
  /** Display label for the status (e.g., "Active", "Pending", "Completed") */
  label: I18nText

  /** Badge variant from telamonjs-ui. Controls color and style. */
  variant: ComponentProps<typeof Badge>['variant']

  /** Optional Lucide React icon displayed before the label */
  icon?: LucideIcon

  /** Additional CSS classes for custom styling */
  className?: string
}

/**
 * DetailStatusProps - Configuration for DetailStatus component
 *
 * @category Detail
 *
 * @description
 * Props for DetailStatus component that renders status badges based on configurable mappings.
 * Promotes separation between presentation and business logic by accepting external config.
 */
export interface DetailStatusProps {
  /** Current status value (e.g., "ACTIVE", "PENDING", "CANCELLED") */
  status: string

  /** Mapping of status values to display configuration */
  statusConfig: Record<string, StatusConfig>

  /** Fallback config for unknown status values. If not provided, uses status as label with 'outline' variant. */
  fallback?: StatusConfig
}

/**
 * DetailStatus - Configurable status badge component
 *
 * @category Detail
 * @status stable
 *
 * @description
 * Production-ready component for displaying status badges in detail pages. Accepts external
 * configuration that defines how each status should be rendered (label, color, icon).
 *
 * **Key Features:**
 * - **Configurable mapping:** External status config promotes reusability
 * - **Icon support:** Optional Lucide React icons for visual context
 * - **Fallback handling:** Graceful rendering for unknown status values
 * - **Type-safe:** Full TypeScript support with variant validation
 * - **Flexible styling:** Custom CSS classes per status
 * - **Separation of concerns:** Presentation logic separate from business logic
 * - **Testable:** Auto-generated data-testid for E2E testing
 *
 * **When to use:**
 * - Displaying status badges in detail pages (Active, Pending, Completed, etc.)
 * - Showing entity states (Order Status, User Status, Task Status)
 * - Any scenario where status needs consistent visual representation
 *
 * **Best practices:**
 * - Define status configs in a centralized file (e.g., `lib/status-configs.ts`)
 * - Use consistent variant mapping across the application
 * - Always provide a fallback config for robustness
 * - Use icons sparingly for the most important statuses
 *
 * @example
 * Basic usage with status config:
 * ```tsx
 * import { DetailStatus } from '@telamonjs/ui'
 * import { CheckCircle, Clock, XCircle } from 'lucide-react'
 *
 * const orderStatusConfig = {
 *   PAID: {
 *     label: 'Paid',
 *     variant: 'default' as const,
 *     icon: CheckCircle,
 *     className: 'bg-green-600'
 *   },
 *   PENDING: {
 *     label: 'Pending Payment',
 *     variant: 'secondary' as const,
 *     icon: Clock
 *   },
 *   CANCELLED: {
 *     label: 'Cancelled',
 *     variant: 'destructive' as const,
 *     icon: XCircle
 *   }
 * }
 *
 * export default function OrderDetailPage({ order }: { order: Order }) {
 *   return (
 *     <DetailCard title="Order Information">
 *       <DetailField label="Order Number" value={order.id} />
 *       <DetailField
 *         label="Status"
 *         value={<DetailStatus status={order.status} statusConfig={orderStatusConfig} />}
 *       />
 *       <DetailField label="Total" value={formatCurrency(order.total)} />
 *     </DetailCard>
 *   )
 * }
 * ```
 *
 * @example
 * With fallback for unknown statuses:
 * ```tsx
 * const taskStatusConfig = {
 *   TODO: { label: 'To Do', variant: 'secondary' as const },
 *   IN_PROGRESS: { label: 'In Progress', variant: 'default' as const, icon: Clock },
 *   DONE: { label: 'Done', variant: 'default' as const, icon: CheckCircle, className: 'bg-green-600' },
 *   BLOCKED: { label: 'Blocked', variant: 'destructive' as const, icon: AlertTriangle },
 * }
 *
 * <DetailStatus
 *   status={task.status}
 *   statusConfig={taskStatusConfig}
 *   fallback={{ label: 'Unknown', variant: 'outline' as const }}
 * />
 * ```
 *
 * @example
 * Centralized status configs (recommended pattern):
 * ```tsx
 * // lib/status-configs.ts
 * import { StatusConfig } from '@telamonjs/ui'
 * import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'
 *
 * export const userStatusConfig: Record<string, StatusConfig> = {
 *   ACTIVE: {
 *     label: 'Active',
 *     variant: 'default',
 *     icon: CheckCircle,
 *     className: 'bg-green-600'
 *   },
 *   INACTIVE: {
 *     label: 'Inactive',
 *     variant: 'secondary',
 *     icon: Clock
 *   },
 *   SUSPENDED: {
 *     label: 'Suspended',
 *     variant: 'destructive',
 *     icon: XCircle
 *   },
 *   PENDING_VERIFICATION: {
 *     label: 'Pending Verification',
 *     variant: 'outline',
 *     icon: AlertTriangle
 *   }
 * }
 *
 * // components/users/[id]/page.tsx
 * import { DetailStatus } from '@telamonjs/ui'
 * import { userStatusConfig } from '@/lib/status-configs'
 *
 * export default function UserDetailPage({ user }: { user: User }) {
 *   return (
 *     <DetailLayout
 *       title="User Details"
 *       leftColumn={
 *         <DetailCard title="Account">
 *           <DetailField
 *             label="Status"
 *             value={<DetailStatus status={user.status} statusConfig={userStatusConfig} />}
 *           />
 *         </DetailCard>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Multiple status types in same page:
 * ```tsx
 * import { userStatusConfig, orderStatusConfig, subscriptionStatusConfig } from '@/lib/status-configs'
 *
 * export default function DashboardPage({ data }: { data: Dashboard }) {
 *   return (
 *     <div className="grid gap-6">
 *       <DetailCard title="User Account">
 *         <DetailStatus status={data.user.status} statusConfig={userStatusConfig} />
 *       </DetailCard>
 *
 *       <DetailCard title="Latest Order">
 *         <DetailStatus status={data.order.status} statusConfig={orderStatusConfig} />
 *       </DetailCard>
 *
 *       <DetailCard title="Subscription">
 *         <DetailStatus status={data.subscription.status} statusConfig={subscriptionStatusConfig} />
 *       </DetailCard>
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * With dynamic status from enum:
 * ```tsx
 * // Prisma schema
 * enum OrderStatus {
 *   PENDING
 *   PROCESSING
 *   SHIPPED
 *   DELIVERED
 *   CANCELLED
 * }
 *
 * // Status config matching enum
 * const orderStatusConfig: Record<OrderStatus, StatusConfig> = {
 *   [OrderStatus.PENDING]: { label: 'Pending', variant: 'secondary', icon: Clock },
 *   [OrderStatus.PROCESSING]: { label: 'Processing', variant: 'default', icon: Package },
 *   [OrderStatus.SHIPPED]: { label: 'Shipped', variant: 'default', icon: Truck },
 *   [OrderStatus.DELIVERED]: { label: 'Delivered', variant: 'default', icon: CheckCircle, className: 'bg-green-600' },
 *   [OrderStatus.CANCELLED]: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
 * }
 *
 * <DetailStatus status={order.status} statusConfig={orderStatusConfig} />
 * ```
 *
 * @example
 * Standalone usage (without DetailField):
 * ```tsx
 * <DetailCard title="Order #12345">
 *   <div className="flex items-center justify-between mb-4">
 *     <h3 className="text-lg font-semibold">Status</h3>
 *     <DetailStatus status={order.status} statusConfig={orderStatusConfig} />
 *   </div>
 *   <p>Order details...</p>
 * </DetailCard>
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/detail-page.mdx | Detail Views}
 * @see {@link DetailCard} for grouping fields
 * @see {@link DetailField} for label-value pairs
 * @see {@link Badge} for underlying badge component
 */
export function DetailStatus({
  status,
  statusConfig,
  fallback,
}: DetailStatusProps) {
  const text = useText()
  const config = statusConfig[status] ||
    fallback || {
      label: status,
      variant: 'outline' as const,
    }

  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={config.className}
      data-testid={getTestId({
        entity: 'detail-status',
        target: status.toLowerCase(),
      })}
    >
      {Icon && <Icon className='h-3 w-3 mr-1' />}
      {text(config.label)}
    </Badge>
  )
}
