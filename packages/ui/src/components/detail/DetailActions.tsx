'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { LucideIcon, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getActionAccessibilityAttrs } from '../../utils/test-ids'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

/**
 * ActionButton - Configuration for individual action button
 *
 * @category Detail
 *
 * @description
 * Configuration object that defines a single action button. Supports both
 * navigation (via href) and client-side handlers (via onClick).
 */
export interface ActionButton {
  /** Button label displayed to the user */
  label: I18nText

  /** Optional Lucide React icon displayed before the label */
  icon?: LucideIcon

  /** URL for navigation. When provided, button becomes a Next.js Link. Mutually exclusive with onClick. */
  href?: string

  /** Click handler for client-side actions. Mutually exclusive with href. */
  onClick?: () => void

  /** Visual variant that controls button style. Default: 'outline' */
  variant?:
    | 'default'
    | 'outline'
    | 'destructive'
    | 'secondary'
    | 'ghost'
    | 'link'

  /** Button size. Default: 'sm' */
  size?: 'default' | 'sm' | 'lg' | 'icon'

  /** Whether the button is disabled. Default: false */
  disabled?: boolean

  /** Show external link icon (arrow) after label. Only applies to href buttons. Default: false */
  showExternalIcon?: boolean

  /** Whether the button is in a loading state (shows spinner). Default: false */
  loading?: boolean

  /** Optional unique identifier for the action (used for test IDs) */
  id?: string
}

/**
 * DetailActionsProps - Configuration for DetailActions component
 *
 * @category Detail
 *
 * @description
 * Props for DetailActions component that displays a card with a list of action buttons.
 * Commonly used in detail page sidebars for quick actions.
 */
export interface DetailActionsProps {
  /** Card title displayed at the top. Default: "Quick Actions" */
  title?: I18nText

  /** Array of action button configurations. Each button can be a link or a click handler. */
  actions: ActionButton[]

  /** Layout direction for buttons. 'vertical' stacks buttons, 'horizontal' displays inline. Default: 'vertical' */
  layout?: 'horizontal' | 'vertical'

  /** Additional CSS classes for the card container */
  className?: string
}

/**
 * DetailActions - Card with action buttons for detail pages
 *
 * @category Detail
 * @status stable
 *
 * @description
 * Production-ready card component that displays a list of action buttons in detail pages.
 * Supports both navigation links (Next.js Link) and client-side onClick handlers,
 * with flexible layout options (vertical or horizontal).
 *
 * **Key Features:**
 * - **Dual action types:** Navigation (href) or client-side handlers (onClick)
 * - **Flexible layouts:** Vertical (stacked) or horizontal (inline)
 * - **Icon support:** Optional Lucide React icons for each button
 * - **Button variants:** 6 visual variants (default, outline, destructive, etc.)
 * - **External link indicator:** Optional arrow icon for external/navigation buttons
 * - **Loading states:** Buttons support async operations with loading prop
 * - **Accessibility:** Comprehensive aria-labels and data-testid attributes
 * - **Responsive:** Full-width buttons in vertical layout, compact in horizontal
 * - **Next.js optimized:** Uses Next.js Link for navigation buttons
 *
 * **When to use:**
 * - Sidebar quick actions in detail pages (Edit, Delete, View Related, etc.)
 * - Action panels with multiple operations
 * - Navigation shortcuts to related entities
 * - Grouped action buttons with consistent styling
 *
 * **When NOT to use:**
 * - Single action → Use standalone Button instead
 * - Form actions → Use Form submit/cancel buttons instead
 * - Toolbar actions → Use header actions in DetailLayout instead
 *
 * **Best practices:**
 * - **Vertical layout:** Best for sidebars (3+ actions, full-width)
 * - **Horizontal layout:** Best for footers or compact spaces (2-3 actions)
 * - Order actions by importance (primary actions first)
 * - Use 'destructive' variant for dangerous actions (Delete, Deactivate)
 * - Use 'outline' or 'secondary' for neutral actions
 * - Limit to 5-7 actions to avoid overwhelming users
 * - Group related actions together
 * - Use `loading` prop for async actions
 * - Provide unique `id` for each action for better testability
 *
 * @example
 * Basic usage (vertical layout in sidebar):
 * ```tsx
 * import { DetailActions } from '@telamonjs/ui'
 * import { Edit, Trash2, Eye, FileText } from 'lucide-react'
 *
 * export default function UserDetailPage({ user }: { user: User }) {
 *   return (
 *     <DetailLayout
 *       title="User Details"
 *       leftColumn={
 *         <DetailCard title="User Information">
 *           ...
 *         </DetailCard>
 *       }
 *       rightColumn={
 *         <DetailActions
 *           title="Quick Actions"
 *           actions={[
 *             {
 *               id: 'edit',
 *               label: 'Edit User',
 *               icon: Edit,
 *               href: `/users/${user.id}/edit`,
 *               variant: 'default',
 *             },
 *             {
 *               id: 'view-orders',
 *               label: 'View Orders',
 *               icon: Eye,
 *               href: `/orders?userId=${user.id}`,
 *               showExternalIcon: true,
 *             },
 *             {
 *               id: 'generate-report',
 *               label: 'Generate Report',
 *               icon: FileText,
 *               onClick: handleGenerateReport,
 *               variant: 'secondary',
 *             },
 *             {
 *               id: 'delete',
 *               label: 'Delete User',
 *               icon: Trash2,
 *               onClick: handleDelete,
 *               variant: 'destructive',
 *             },
 *           ]}
 *         />
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Horizontal layout (footer or compact space):
 * ```tsx
 * import { Save, X, Redo } from 'lucide-react'
 *
 * <DetailCard title="Order Summary">
 *   <DetailField label="Order #" value={order.id} />
 *   <DetailField label="Status" value={order.status} />
 *
 *   <DetailActions
 *     title="Actions"
 *     layout="horizontal"
 *     actions={[
 *       { id: 'approve', label: 'Approve', icon: Save, onClick: handleApprove, variant: 'default' },
 *       { id: 'reject', label: 'Reject', icon: X, onClick: handleReject, variant: 'destructive' },
 *       { id: 'revert', label: 'Revert', icon: Redo, onClick: handleRevert, variant: 'outline' },
 *     ]}
 *   />
 * </DetailCard>
 * ```
 *
 * @example
 * Async actions with loading states:
 * ```tsx
 * import { Send, Download } from 'lucide-react'
 *
 * const [sendingEmail, setSendingEmail] = useState(false)
 * const [downloading, setDownloading] = useState(false)
 *
 * const handleSendEmail = async () => {
 *   setSendingEmail(true)
 *   await sendEmail(document.id)
 *   setSendingEmail(false)
 * }
 *
 * const handleDownload = async () => {
 *   setDownloading(true)
 *   await downloadPDF(document.id)
 *   setDownloading(false)
 * }
 *
 * <DetailActions
 *   title="Document Actions"
 *   actions={[
 *     {
 *       id: 'send-email',
 *       label: 'Send Email',
 *       icon: Send,
 *       onClick: handleSendEmail,
 *       loading: sendingEmail,
 *       disabled: sendingEmail,
 *     },
 *     {
 *       id: 'download',
 *       label: 'Download PDF',
 *       icon: Download,
 *       onClick: handleDownload,
 *       loading: downloading,
 *       disabled: downloading,
 *     },
 *   ]}
 * />
 * ```
 *
 * @example
 * Navigation-only actions (all href):
 * ```tsx
 * import { User, CreditCard, Package, Settings } from 'lucide-react'
 *
 * <DetailActions
 *   title="Related Entities"
 *   actions={[
 *     {
 *       id: 'view-customer',
 *       label: 'View Customer',
 *       icon: User,
 *       href: `/customers/${enrollment.customerId}`,
 *       showExternalIcon: true,
 *     },
 *     {
 *       id: 'view-subscription',
 *       label: 'View Subscription',
 *       icon: CreditCard,
 *       href: `/subscriptions/${enrollment.subscriptionId}`,
 *       showExternalIcon: true,
 *     },
 *     {
 *       id: 'view-meal-plan',
 *       label: 'View Meal Plan',
 *       icon: Package,
 *       href: `/meal-plans/${enrollment.mealPlanId}`,
 *       showExternalIcon: true,
 *     },
 *     {
 *       id: 'edit-config',
 *       label: 'Edit Configuration',
 *       icon: Settings,
 *       href: `/enrollments/${enrollment.id}/config`,
 *     },
 *   ]}
 * />
 * ```
 *
 * @example
 * Conditional actions based on state:
 * ```tsx
 * import { Lock, Unlock, Send, Archive } from 'lucide-react'
 *
 * function getActions(order: Order) {
 *   const actions: ActionButton[] = [
 *     {
 *       id: 'view-customer',
 *       label: 'View Customer',
 *       icon: User,
 *       href: `/customers/${order.customerId}`,
 *       showExternalIcon: true,
 *     },
 *   ]
 *
 *   if (order.status === 'PENDING') {
 *     actions.push({
 *       id: 'approve',
 *       label: 'Approve',
 *       icon: Send,
 *       onClick: handleApprove,
 *       variant: 'default',
 *     })
 *   }
 *
 *   if (order.status === 'ACTIVE') {
 *     actions.push({
 *       id: 'lock',
 *       label: 'Lock',
 *       icon: Lock,
 *       onClick: handleLock,
 *       variant: 'outline',
 *     })
 *   }
 *
 *   if (order.status === 'LOCKED') {
 *     actions.push({
 *       id: 'unlock',
 *       label: 'Unlock',
 *       icon: Unlock,
 *       onClick: handleUnlock,
 *       variant: 'outline',
 *     })
 *   }
 *
 *   if (order.status === 'COMPLETED') {
 *     actions.push({
 *       id: 'archive',
 *       label: 'Archive',
 *       icon: Archive,
 *       onClick: handleArchive,
 *       variant: 'secondary',
 *     })
 *   }
 *
 *   return actions
 * }
 *
 * <DetailActions title="Order Actions" actions={getActions(order)} />
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/detail-page.mdx | Detail Views}
 * @see {@link DetailLayout} for page structure
 * @see {@link DetailCard} for grouping information
 * @see {@link Button} for standalone buttons
 */
export function DetailActions({
  title,
  actions,
  layout = 'vertical',
  className = '',
}: DetailActionsProps) {
  const t = useTelamonjsT()
  const text = useText()
  const resolvedTitle = text(title) ?? t('detail.quickActions')
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='text-lg'>{resolvedTitle}</CardTitle>
      </CardHeader>
      <CardContent
        className={layout === 'vertical' ? 'space-y-2' : 'flex gap-2'}
      >
        {actions.map(action => {
          const Icon = action.icon
          const label = text(action.label) ?? ''
          const buttonContent = (
            <>
              {Icon && <Icon className='h-4 w-4 mr-2' />}
              {label}
              {action.href && action.showExternalIcon && (
                <ExternalLink className='h-4 w-4 ml-auto' />
              )}
            </>
          )

          // Generate accessibility attributes
          const accessibilityAttrs = getActionAccessibilityAttrs({
            id: action.id || label.toLowerCase().replace(/\s+/g, '-'),
            label,
            loading: action.loading,
          })

          if (action.href) {
            return (
              <Link
                key={action.id || label}
                href={action.href}
                className='block'
              >
                <Button
                  {...accessibilityAttrs}
                  variant={action.variant || 'outline'}
                  size={action.size || 'sm'}
                  className={
                    layout === 'vertical' ? 'w-full justify-start' : ''
                  }
                  disabled={action.disabled}
                  loading={action.loading}
                >
                  {buttonContent}
                </Button>
              </Link>
            )
          }

          return (
            <Button
              key={action.id || label}
              {...accessibilityAttrs}
              variant={action.variant || 'outline'}
              size={action.size || 'sm'}
              className={layout === 'vertical' ? 'w-full justify-start' : ''}
              onClick={action.onClick}
              disabled={action.disabled}
              loading={action.loading}
            >
              {buttonContent}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
