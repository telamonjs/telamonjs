/**
 * Lazy-loaded Chart Components
 *
 * Reduces initial bundle size by ~80 KB (Recharts library).
 * Uses React.lazy + Suspense for code splitting.
 *
 * @example
 * ```tsx
 * import { LineChartLazy, BarChartLazy } from '@telamonjs/ui'
 *
 * <LineChartLazy data={data} dataKeys={['value']} />
 * ```
 */

'use client'

import React, { Suspense } from 'react'
import { Skeleton } from '../../ui/skeleton'
import type { LineChartProps, ChartData } from './LineChart'
import type { BarChartProps } from './BarChart'
import type { PieChartProps } from './PieChart'
import type { AreaChartProps } from './AreaChart'

// Lazy load chart implementations
const LineChartImpl = React.lazy(() =>
  import('./LineChart').then(mod => ({ default: mod.LineChart }))
)

const BarChartImpl = React.lazy(() =>
  import('./BarChart').then(mod => ({ default: mod.BarChart }))
)

const PieChartImpl = React.lazy(() =>
  import('./PieChart').then(mod => ({ default: mod.PieChart }))
)

const AreaChartImpl = React.lazy(() =>
  import('./AreaChart').then(mod => ({ default: mod.AreaChart }))
)

// Fixed, varied bar heights for the skeleton fallback below — a purely
// decorative silhouette, so it doesn't need Math.random() (impure, not
// allowed during render) to look non-uniform.
const SKELETON_BAR_HEIGHTS = [42, 68, 55, 80, 35, 62, 48, 74]

/**
 * Chart skeleton fallback
 *
 * Exported for reuse as Suspense fallback by other lazy chart consumers
 * (e.g. dashboard ChartWidget).
 */
export function ChartSkeleton({
  height = 300,
  className,
}: {
  height?: number
  className?: string
}) {
  return (
    <div className={className} style={{ height }}>
      <div className='flex h-full w-full flex-col gap-2 rounded-md border bg-muted/20 p-4'>
        {/* Y-axis labels */}
        <div className='flex h-full gap-2'>
          <div className='flex w-8 flex-col justify-between'>
            <Skeleton className='h-3 w-full' />
            <Skeleton className='h-3 w-full' />
            <Skeleton className='h-3 w-full' />
            <Skeleton className='h-3 w-full' />
          </div>
          {/* Chart area */}
          <div className='flex flex-1 items-end gap-1'>
            {SKELETON_BAR_HEIGHTS.map((h, i) => (
              <Skeleton
                key={`bar-${i}`}
                className='flex-1'
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        {/* X-axis labels */}
        <div className='ml-10 flex justify-between'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`label-${i}`} className='h-3 w-12' />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Lazy-loaded LineChart with automatic Suspense fallback
 */
export function LineChartLazy(props: LineChartProps) {
  return (
    <Suspense
      fallback={
        <ChartSkeleton height={props.height} className={props.className} />
      }
    >
      <LineChartImpl {...props} />
    </Suspense>
  )
}

/**
 * Lazy-loaded BarChart with automatic Suspense fallback
 */
export function BarChartLazy(props: BarChartProps) {
  return (
    <Suspense
      fallback={
        <ChartSkeleton height={props.height} className={props.className} />
      }
    >
      <BarChartImpl {...props} />
    </Suspense>
  )
}

/**
 * Lazy-loaded PieChart with automatic Suspense fallback
 */
export function PieChartLazy(props: PieChartProps) {
  return (
    <Suspense
      fallback={
        <ChartSkeleton height={props.height} className={props.className} />
      }
    >
      <PieChartImpl {...props} />
    </Suspense>
  )
}

/**
 * Lazy-loaded AreaChart with automatic Suspense fallback
 */
export function AreaChartLazy(props: AreaChartProps) {
  return (
    <Suspense
      fallback={
        <ChartSkeleton height={props.height} className={props.className} />
      }
    >
      <AreaChartImpl {...props} />
    </Suspense>
  )
}

// Re-export types for convenience
export type {
  LineChartProps,
  BarChartProps,
  PieChartProps,
  AreaChartProps,
  ChartData,
}
