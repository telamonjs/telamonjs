'use client'

import { Card, CardContent } from '../../ui/card'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  LucideIcon,
} from 'lucide-react'
import { ReactNode } from 'react'
import { getTestId } from '../../utils/test-ids'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { isMessageRef, type I18nText } from '../../i18n/msg'

/**
 * DetailAlertProps - Configuration for DetailAlert component
 *
 * @category Detail
 *
 * @description
 * Props for DetailAlert component that displays contextual alerts, warnings, errors,
 * or success messages in detail pages. Supports dismissible behavior and custom icons.
 */
export interface DetailAlertProps {
  /** Visual variant that defines color scheme and default icon. Default: 'info' */
  variant?: 'danger' | 'warning' | 'info' | 'success'

  /** Alert title displayed prominently. Should be concise (1-5 words). */
  title: I18nText

  /** Alert message displayed below title. Can be I18nText or custom ReactNode for rich content. */
  message?: I18nText | ReactNode

  /** Custom Lucide React icon. Overrides default variant icon. */
  icon?: LucideIcon

  /** Whether the alert can be dismissed by the user. Shows close button when true. Default: false */
  dismissible?: boolean

  /** Callback function executed when user dismisses the alert. Required when `dismissible` is true. */
  onDismiss?: () => void

  /** Additional CSS classes for the card container */
  className?: string
}

const variantConfig = {
  danger: {
    containerClass: 'border-red-200 bg-red-50/50',
    titleClass: 'text-red-800',
    messageClass: 'text-red-700',
    icon: AlertCircle,
    iconClass: 'text-red-600',
  },
  warning: {
    containerClass: 'border-orange-200 bg-orange-50/50',
    titleClass: 'text-orange-800',
    messageClass: 'text-orange-700',
    icon: AlertTriangle,
    iconClass: 'text-orange-600',
  },
  info: {
    containerClass: 'border-blue-200 bg-blue-50/50',
    titleClass: 'text-blue-800',
    messageClass: 'text-blue-700',
    icon: Info,
    iconClass: 'text-blue-600',
  },
  success: {
    containerClass: 'border-green-200 bg-green-50/50',
    titleClass: 'text-green-800',
    messageClass: 'text-green-700',
    icon: CheckCircle2,
    iconClass: 'text-green-600',
  },
}

/**
 * DetailAlert - Contextual alert component for detail pages
 *
 * @category Detail
 * @status stable
 *
 * @description
 * Production-ready alert component for displaying important messages, warnings, errors,
 * or success notifications in detail/view pages. Supports 4 visual variants with
 * automatic color coding, default icons, and dismissible behavior.
 *
 * **Key Features:**
 * - **4 semantic variants:** danger, warning, info, success
 * - **Automatic color coding:** Border, background, text, and icon colors per variant
 * - **Default icons:** Each variant has a semantic icon (AlertCircle, AlertTriangle, Info, CheckCircle2)
 * - **Custom icons:** Override default icons with Lucide React icons
 * - **Dismissible behavior:** Optional close button with callback
 * - **Rich content:** Message can be string or ReactNode for complex content
 * - **Accessible:** Semantic HTML with ARIA labels
 * - **Testable:** Auto-generated data-testid for E2E testing
 *
 * **When to use:**
 * - Displaying important contextual information in detail pages
 * - Warning users about issues, deadlines, or required actions
 * - Showing error messages or validation failures
 * - Confirming successful operations
 * - Highlighting status changes or important notices
 *
 * **When NOT to use:**
 * - Form validation errors → Use form field error messages instead
 * - Toast notifications → Use toast/notification system instead
 * - Page-level alerts → Use DetailLayout.alerts prop instead
 *
 * **Variant Guidelines:**
 * - **danger:** Errors, critical issues, blockers (red)
 * - **warning:** Warnings, cautions, attention needed (orange)
 * - **info:** General information, tips, neutral notices (blue)
 * - **success:** Confirmations, completions, positive feedback (green)
 *
 * **Best practices:**
 * - Keep titles short and descriptive (1-5 words)
 * - Provide actionable messages (what user should do)
 * - Use dismissible alerts for non-critical information
 * - Don't use dismissible for critical errors/warnings
 * - Stack multiple alerts in DetailLayout.alerts prop for better organization
 *
 * @example
 * Basic usage (different variants):
 * ```tsx
 * import { DetailAlert } from '@telamonjs/ui'
 *
 * export default function UserDetailPage({ user }: { user: User }) {
 *   return (
 *     <DetailLayout
 *       title="User Details"
 *       leftColumn={
 *         <>
 *           <DetailAlert
 *             variant="danger"
 *             title="Account Suspended"
 *             message="This account has been suspended due to policy violations. Contact support to resolve."
 *           />
 *
 *           <DetailAlert
 *             variant="warning"
 *             title="Email Not Verified"
 *             message="User must verify their email address within 7 days."
 *           />
 *
 *           <DetailAlert
 *             variant="info"
 *             title="Premium Member"
 *             message="User subscribed to Premium plan on January 15, 2025."
 *           />
 *
 *           <DetailAlert
 *             variant="success"
 *             title="Payment Verified"
 *             message="Last payment was successfully processed."
 *           />
 *         </>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Dismissible alerts with state management:
 * ```tsx
 * 'use client'
 *
 * import { useState } from 'react'
 * import { DetailAlert } from '@telamonjs/ui'
 *
 * export default function OrderDetailPage({ order }: { order: Order }) {
 *   const [showTip, setShowTip] = useState(true)
 *
 *   return (
 *     <DetailLayout
 *       title="Order Details"
 *       leftColumn={
 *         <>
 *           {showTip && (
 *             <DetailAlert
 *               variant="info"
 *               title="Pro Tip"
 *               message="You can export orders to PDF for customer records."
 *               dismissible
 *               onDismiss={() => setShowTip(false)}
 *             />
 *           )}
 *
 *           <DetailCard title="Order Information">
 *             ...
 *           </DetailCard>
 *         </>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Custom icons and rich message content:
 * ```tsx
 * import { CreditCard, Package, Calendar } from 'lucide-react'
 *
 * <DetailCard title="Subscription">
 *   <DetailAlert
 *     variant="warning"
 *     title="Payment Method Expiring"
 *     icon={CreditCard}
 *     message={
 *       <div>
 *         Your credit card ending in <strong>****4532</strong> expires next month.
 *         <a href="/settings/billing" className="underline ml-1">
 *           Update payment method
 *         </a>
 *       </div>
 *     }
 *   />
 *
 *   <DetailAlert
 *     variant="info"
 *     title="Shipment In Transit"
 *     icon={Package}
 *     message="Package #TRK123456 is expected to arrive on Friday, Jan 26."
 *   />
 *
 *   <DetailAlert
 *     variant="success"
 *     title="Auto-Renewal Enabled"
 *     icon={Calendar}
 *     message="Your subscription will automatically renew on February 1, 2025."
 *   />
 * </DetailCard>
 * ```
 *
 * @example
 * Multiple alerts using DetailLayout.alerts prop (recommended for stacked alerts):
 * ```tsx
 * export default function CustomerDetailPage({ customer }: { customer: Customer }) {
 *   return (
 *     <DetailLayout
 *       title="Customer Details"
 *       alerts={[
 *         {
 *           variant: 'danger',
 *           title: 'No Meal Tickets Available',
 *           message: 'Customer cannot access cafeteria. Purchase tickets immediately.',
 *         },
 *         {
 *           variant: 'warning',
 *           title: 'Benefit Expiring Soon',
 *           message: 'Renew benefit within 7 days to avoid interruption.',
 *         },
 *       ]}
 *       leftColumn={
 *         <DetailCard title="Customer Information">
 *           ...
 *         </DetailCard>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Conditional alerts based on data:
 * ```tsx
 * export default function InvoiceDetailPage({ invoice }: { invoice: Invoice }) {
 *   const isOverdue = invoice.dueDate < new Date() && invoice.status !== 'PAID'
 *   const isPaid = invoice.status === 'PAID'
 *
 *   return (
 *     <DetailLayout
 *       title={`Invoice #${invoice.number}`}
 *       leftColumn={
 *         <>
 *           {isOverdue && (
 *             <DetailAlert
 *               variant="danger"
 *               title="Payment Overdue"
 *               message={`Invoice was due on ${formatDate(invoice.dueDate)}. Late fees may apply.`}
 *             />
 *           )}
 *
 *           {isPaid && (
 *             <DetailAlert
 *               variant="success"
 *               title="Payment Received"
 *               message={`Paid on ${formatDate(invoice.paidAt)} via ${invoice.paymentMethod}`}
 *               dismissible
 *               onDismiss={() => console.log('Alert dismissed')}
 *             />
 *           )}
 *
 *           <DetailCard title="Invoice Details">
 *             ...
 *           </DetailCard>
 *         </>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Standalone usage (not inside DetailLayout):
 * ```tsx
 * <div className="space-y-4">
 *   <DetailAlert
 *     variant="info"
 *     title="System Maintenance"
 *     message="Scheduled maintenance on Sunday, 2AM-4AM UTC."
 *   />
 *
 *   <DetailCard title="Settings">
 *     ...
 *   </DetailCard>
 * </div>
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/detail-page.mdx | Detail Views}
 * @see {@link DetailLayout} for page structure and alerts prop
 * @see {@link DetailCard} for grouping information
 */
export function DetailAlert({
  variant = 'info',
  title,
  message,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
}: DetailAlertProps) {
  const t = useTelamonjsT()
  const text = useText()
  const config = variantConfig[variant]
  const Icon = icon || config.icon
  const resolvedMessage = isMessageRef(message) ? text(message) : message

  return (
    <Card
      className={`${config.containerClass} ${className}`}
      data-testid={getTestId({ entity: 'detail-alert', target: variant })}
    >
      <CardContent className='p-4'>
        <div className='flex gap-3'>
          <Icon
            className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.iconClass}`}
          />
          <div className='flex-1 space-y-1'>
            <p className={`font-medium text-sm ${config.titleClass}`}>
              {text(title)}
            </p>
            {resolvedMessage && (
              <div className={`text-xs ${config.messageClass}`}>{resolvedMessage}</div>
            )}
          </div>
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className={`flex-shrink-0 rounded-md p-1 hover:bg-black/5 transition-colors ${config.iconClass}`}
              aria-label={t('common.close')}
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
