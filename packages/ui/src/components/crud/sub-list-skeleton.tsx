'use client'

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

export interface SubListSkeletonProps {
  columns?: number
  rows?: number
  showToolbar?: boolean
  className?: string
}

export function SubListSkeleton({
  columns = 4,
  rows = 5,
  showToolbar = true,
  className,
}: SubListSkeletonProps) {
  // Generate varied widths for more natural look
  const getRandomWidth = (seed: number) => {
    const widths = [60, 70, 80, 90, 50]
    return widths[seed % widths.length]
  }

  return (
    <div className={cn('w-full space-y-3', className)}>
      {/* Toolbar Skeleton */}
      {showToolbar && (
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {/* Search Input Skeleton */}
            <Skeleton className='h-9 w-[200px]' />
          </div>
          {/* Column Visibility Button Skeleton */}
          <Skeleton className='h-8 w-[100px] hidden md:block' />
        </div>
      )}

      {/* Table Skeleton */}
      <div className='rounded-md border border-border/50 overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/30 hover:bg-muted/30'>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i} className='py-3'>
                  <Skeleton
                    className='h-4'
                    style={{
                      width: `${getRandomWidth(i + 10)}%`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                </TableHead>
              ))}
              {/* Actions Column */}
              <TableHead className='w-[80px]'>
                <Skeleton className='h-4 w-10 ml-auto' />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow
                key={rowIndex}
                className={cn(
                  'border-b border-border/30',
                  rowIndex % 2 === 1 && 'bg-muted/10'
                )}
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex} className='py-3'>
                    <Skeleton
                      className='h-4'
                      style={{
                        width: `${getRandomWidth(rowIndex * columns + colIndex)}%`,
                        animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                      }}
                    />
                  </TableCell>
                ))}
                {/* Actions Column Skeleton */}
                <TableCell className='py-3'>
                  <div className='flex items-center justify-end gap-1'>
                    <Skeleton className='h-8 w-8 rounded-md' />
                    <Skeleton className='h-8 w-8 rounded-md' />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      <div className='flex items-center justify-between px-2'>
        <Skeleton className='h-4 w-[120px]' />
        <div className='flex items-center gap-4'>
          <Skeleton className='h-8 w-[100px]' />
          <Skeleton className='h-4 w-[80px]' />
          <div className='flex gap-1'>
            <Skeleton className='h-8 w-8' />
            <Skeleton className='h-8 w-8' />
          </div>
        </div>
      </div>
    </div>
  )
}
