'use client'

import { Card, CardContent, CardHeader } from '../../ui/card'
import { Skeleton } from '../../ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'
import { cn } from '../../utils'

type SkeletonShape = 'card' | 'table' | 'text' | 'stat' | 'avatar'

interface SkeletonConfig {
  icon?: string
  title?: string
  value?: string
  description?: string
  row?: string
  cell?: string
}

const SKELETON_CONFIGS: Record<SkeletonShape, SkeletonConfig> = {
  card: {
    title: 'h-6 w-3/4',
    description: 'h-4 w-1/2',
    row: 'h-4 w-full',
  },
  table: {
    row: 'h-4 w-full',
    cell: 'py-2',
  },
  text: {
    row: 'h-4 w-full',
  },
  stat: {
    icon: 'h-4 w-4 rounded-full',
    title: 'h-4 w-[120px]',
    value: 'h-8 w-[150px]',
    description: 'h-4 w-[100px]',
  },
  avatar: {
    icon: 'h-20 w-20 rounded-full',
    title: 'h-5 w-32',
    description: 'h-4 w-48',
  },
}

export interface LoadingSkeletonProps {
  shape?: SkeletonShape
  count?: number
  columns?: number
  className?: string
}

/**
 * LoadingSkeleton - Unified skeleton loading component.
 *
 * Replaces:
 * - SkeletonCard (removed)
 * - SkeletonTable (removed)
 * - Component-specific loading states
 *
 * @example
 * ```tsx
 * // Card skeleton
 * <LoadingSkeleton shape="card" count={3} />
 *
 * // Table skeleton
 * <LoadingSkeleton shape="table" count={5} columns={4} />
 *
 * // Stat skeleton
 * <LoadingSkeleton shape="stat" />
 *
 * // Avatar skeleton
 * <LoadingSkeleton shape="avatar" />
 *
 * // Text lines
 * <LoadingSkeleton shape="text" count={3} />
 * ```
 */
export function LoadingSkeleton({
  shape = 'card',
  count = 1,
  columns = 4,
  className,
}: LoadingSkeletonProps) {
  const config = SKELETON_CONFIGS[shape]

  // Card Skeleton
  if (shape === 'card') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className={config.title} />
              <Skeleton className={config.description} />
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className={config.row} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Table Skeleton
  if (shape === 'table') {
    return (
      <div className={cn('w-full', className)}>
        <div className='flex items-center py-4 space-x-2'>
          <Skeleton className='h-10 w-[250px]' />
          <Skeleton className='h-10 w-[100px]' />
        </div>
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: columns }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className={config.row} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: count }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columns }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className={config.row} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Stat Skeleton
  if (shape === 'stat') {
    return (
      <Card className={className}>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <Skeleton className={config.title} />
          <Skeleton className={config.icon} />
        </CardHeader>
        <CardContent>
          <Skeleton className={cn(config.value, 'mb-2')} />
          <Skeleton className={config.description} />
        </CardContent>
      </Card>
    )
  }

  // Avatar Skeleton
  if (shape === 'avatar') {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <Skeleton className={config.icon} />
        <div className='space-y-2'>
          <Skeleton className={config.title} />
          <Skeleton className={config.description} />
        </div>
      </div>
    )
  }

  // Text Skeleton (default)
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={config.row} />
      ))}
    </div>
  )
}

/**
 * Hook to get skeleton configuration for custom implementations.
 *
 * @example
 * ```tsx
 * const config = useSkeleton('stat')
 * return <Skeleton className={config.value} />
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components -- helper hook tightly coupled to LoadingSkeleton's shape config, not worth a separate file
export function useSkeleton(shape: SkeletonShape) {
  return SKELETON_CONFIGS[shape]
}
