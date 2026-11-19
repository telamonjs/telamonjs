'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader } from '../../ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '../../utils'
import { getTestId } from '../../utils/test-ids'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

/**
 * StatConfig - Configuration for individual stat item
 *
 * @category Detail
 *
 * @description
 * Configuration object that defines a single metric/statistic to display in the grid.
 * Supports numeric values, percentages, formatted strings, or custom React components.
 */
export interface StatConfig {
  /** Metric label displayed above the value (e.g., "Total Users", "Revenue", "Conversion Rate") */
  label: I18nText

  /** Value to display. Can be number, string (e.g., "95%", "$1,500"), or custom ReactNode. */
  value: string | number | React.ReactNode

  /** Optional Lucide React icon displayed before the label */
  icon?: LucideIcon

  /** Color variant that controls text color for the value. Default: 'default' */
  color?: 'default' | 'success' | 'danger' | 'warning' | 'info'

  /** Optional description shown below the value (e.g., "Last 30 days", "+12% from last month") */
  description?: I18nText
}

/**
 * DetailStatsGridProps - Configuration for DetailStatsGrid component
 *
 * @category Detail
 *
 * @description
 * Props for DetailStatsGrid component that displays multiple metrics/statistics
 * in a responsive grid layout. Each stat is rendered as a card.
 */
export interface DetailStatsGridProps {
  /** Array of statistics to display in the grid */
  stats: StatConfig[]

  /** Number of columns in the grid (2, 3, or 4). Default: 2 */
  columns?: 2 | 3 | 4

  /** Additional CSS classes for the grid container */
  className?: string
}

const colorMap = {
  default: 'text-foreground',
  success: 'text-green-600',
  danger: 'text-red-600',
  warning: 'text-orange-600',
  info: 'text-blue-600',
}

/**
 * StatCard - Memoized individual stat card component
 */
const StatCard = memo<{ stat: StatConfig }>(
  ({ stat }) => {
    const text = useText()
    const Icon = stat.icon
    const colorClass = colorMap[stat.color || 'default']
    const label = text(stat.label) ?? ''
    const statLabel = label.toLowerCase().replace(/\s+/g, '-')

    return (
      <Card
        data-testid={getTestId({
          entity: 'detail-stat',
          target: statLabel,
        })}
      >
        <CardHeader className='pb-2'>
          <CardDescription className='flex items-center gap-2'>
            {Icon && <Icon className='h-4 w-4' />}
            {label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', colorClass)}>
            {stat.value}
          </div>
          {stat.description && (
            <p className='text-xs text-muted-foreground mt-1'>
              {text(stat.description)}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }
)
StatCard.displayName = 'StatCard'

/**
 * DetailStatsGrid - Grid of metric cards for detail pages and dashboards
 *
 * @category Detail
 * @status stable
 *
 * @description
 * Production-ready grid component for displaying multiple metrics/statistics as cards.
 * Supports 2-4 column responsive layouts with color-coded values, icons, and descriptions.
 * Perfect for dashboards, analytics pages, and detail page summaries.
 *
 * **Key Features:**
 * - **Responsive grid:** 2, 3, or 4 columns
 * - **Color-coded values:** 5 semantic colors (default, success, danger, warning, info)
 * - **Icon support:** Optional Lucide React icons for visual context
 * - **Flexible values:** Numbers, strings, percentages, or custom ReactNode
 * - **Descriptions:** Optional context text below each value
 * - **Auto-wrapping:** Grid wraps to fewer columns on smaller screens
 * - **Consistent cards:** Each metric in its own card with uniform styling
 * - **Testable:** Auto-generated data-testid for E2E testing
 *
 * **When to use:**
 * - Dashboard summary sections (KPIs, metrics overview)
 * - Detail page summaries (user stats, order totals, analytics)
 * - Analytics panels with multiple metrics
 * - Any scenario requiring side-by-side metric display
 *
 * **When NOT to use:**
 * - Single metric → Use `DetailFinancialValue` or custom card instead
 * - Financial-only values → Use `DetailFinancialValue` for better formatting
 * - Tabular data → Use `DataTable` instead
 * - Charts/graphs → Use Chart components instead
 *
 * **Column Guidelines:**
 * - **2 columns:** Best for 2-4 metrics, balanced layout
 * - **3 columns:** Best for 3-6 metrics, compact but readable
 * - **4 columns:** Best for 4-8 metrics, dense dashboards (desktop-first)
 *
 * **Best practices:**
 * - Use color coding consistently (success = positive, danger = negative)
 * - Add descriptions for context when needed (time periods, comparisons)
 * - Keep labels short (1-3 words)
 * - Use icons sparingly (only for most important metrics)
 * - Limit to 8 metrics max to avoid overwhelming users
 * - Order metrics by importance (most critical first)
 *
 * @example
 * Basic usage (2 columns):
 * ```tsx
 * import { DetailStatsGrid } from '@telamonjs/ui'
 * import { Users, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react'
 *
 * export default function DashboardPage() {
 *   return (
 *     <DetailStatsGrid
 *       columns={2}
 *       stats={[
 *         {
 *           label: 'Total Users',
 *           value: 1250,
 *           icon: Users,
 *           color: 'default',
 *         },
 *         {
 *           label: 'Active Orders',
 *           value: 87,
 *           icon: ShoppingCart,
 *           color: 'info',
 *         },
 *         {
 *           label: 'Revenue',
 *           value: 'R$ 45.320,00',
 *           icon: DollarSign,
 *           color: 'success',
 *           description: 'Last 30 days',
 *         },
 *         {
 *           label: 'Growth',
 *           value: '+12%',
 *           icon: TrendingUp,
 *           color: 'success',
 *           description: 'vs. last month',
 *         },
 *       ]}
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * 3-column layout for dashboards:
 * ```tsx
 * import { Eye, MousePointerClick, Clock, CheckCircle } from 'lucide-react'
 *
 * <DetailStatsGrid
 *   columns={3}
 *   stats={[
 *     {
 *       label: 'Page Views',
 *       value: '52.3K',
 *       icon: Eye,
 *       color: 'info',
 *       description: 'Last 7 days',
 *     },
 *     {
 *       label: 'Click Rate',
 *       value: '3.2%',
 *       icon: MousePointerClick,
 *       color: 'success',
 *     },
 *     {
 *       label: 'Avg. Time',
 *       value: '2m 45s',
 *       icon: Clock,
 *       color: 'default',
 *     },
 *     {
 *       label: 'Conversions',
 *       value: 127,
 *       icon: CheckCircle,
 *       color: 'success',
 *       description: '+18% this week',
 *     },
 *   ]}
 * />
 * ```
 *
 * @example
 * 4-column layout (dense dashboard):
 * ```tsx
 * import { FileText, Download, Share2, Star } from 'lucide-react'
 *
 * <DetailStatsGrid
 *   columns={4}
 *   stats={[
 *     { label: 'Documents', value: 432, icon: FileText, color: 'default' },
 *     { label: 'Downloads', value: 1829, icon: Download, color: 'info' },
 *     { label: 'Shares', value: 234, icon: Share2, color: 'success' },
 *     { label: 'Favorites', value: 89, icon: Star, color: 'warning' },
 *   ]}
 * />
 * ```
 *
 * @example
 * Detail page summary (user stats):
 * ```tsx
 * export default function UserDetailPage({ user }: { user: User }) {
 *   return (
 *     <DetailLayout
 *       title="User Details"
 *       leftColumn={
 *         <DetailCard title="User Information">
 *           <DetailField label="Name" value={user.name} />
 *           <DetailField label="Email" value={user.email} />
 *         </DetailCard>
 *       }
 *       rightColumn={
 *         <>
 *           <DetailStatsGrid
 *             columns={2}
 *             stats={[
 *               {
 *                 label: 'Total Orders',
 *                 value: user.ordersCount,
 *                 color: 'default',
 *               },
 *               {
 *                 label: 'Total Spent',
 *                 value: formatCurrency(user.totalSpent),
 *                 color: 'success',
 *               },
 *               {
 *                 label: 'Avg. Order',
 *                 value: formatCurrency(user.avgOrderValue),
 *                 color: 'info',
 *               },
 *               {
 *                 label: 'Member Since',
 *                 value: formatDaysAgo(user.createdAt),
 *                 color: 'default',
 *               },
 *             ]}
 *           />
 *
 *           <DetailActions actions={...} />
 *         </>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * With custom ReactNode values (badges, components):
 * ```tsx
 * import { Badge } from '@telamonjs/ui'
 *
 * <DetailStatsGrid
 *   columns={2}
 *   stats={[
 *     {
 *       label: 'Status',
 *       value: <Badge variant="success">Active</Badge>,
 *       color: 'default',
 *     },
 *     {
 *       label: 'Priority',
 *       value: <Badge variant="destructive">High</Badge>,
 *       color: 'danger',
 *     },
 *     {
 *       label: 'Progress',
 *       value: (
 *         <div className="flex items-center gap-2">
 *           <div className="flex-1 bg-gray-200 rounded-full h-2">
 *             <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }} />
 *           </div>
 *           <span>75%</span>
 *         </div>
 *       ),
 *       color: 'success',
 *     },
 *   ]}
 * />
 * ```
 *
 * @example
 * Color-coded metrics (success, danger, warning):
 * ```tsx
 * import { TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react'
 *
 * <DetailStatsGrid
 *   columns={2}
 *   stats={[
 *     {
 *       label: 'Revenue',
 *       value: '+R$ 12.500',
 *       icon: TrendingUp,
 *       color: 'success',
 *       description: '+15% vs. last week',
 *     },
 *     {
 *       label: 'Refunds',
 *       value: 'R$ 850',
 *       icon: TrendingDown,
 *       color: 'danger',
 *       description: '5 refunds this week',
 *     },
 *     {
 *       label: 'Pending',
 *       value: 23,
 *       icon: AlertTriangle,
 *       color: 'warning',
 *       description: 'Awaiting approval',
 *     },
 *     {
 *       label: 'Active Users',
 *       value: 342,
 *       icon: Activity,
 *       color: 'info',
 *       description: 'Online now',
 *     },
 *   ]}
 * />
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/detail-page.mdx | Detail Views}
 * @see {@link DetailLayout} for page structure
 * @see {@link DetailCard} for grouping information
 * @see {@link DetailFinancialValue} for single financial values
 */
export const DetailStatsGrid = memo<DetailStatsGridProps>(function DetailStatsGrid({
  stats,
  columns = 2,
  className,
}) {
  const gridCols = useMemo(
    () => ({
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    }),
    []
  )

  return (
    <div
      className={cn('grid gap-4', gridCols[columns], className)}
      data-testid='detail-stats-grid'
    >
      {stats.map((stat, idx) => (
        <StatCard key={idx} stat={stat} />
      ))}
    </div>
  )
})

DetailStatsGrid.displayName = 'DetailStatsGrid'
