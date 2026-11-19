import { cn } from '../../utils/cn'
import type { QuickActionGridProps } from './types'

const gridCols = {
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-3 sm:grid-cols-5',
  6: 'grid-cols-3 sm:grid-cols-6'
} as const

export function QuickActionGrid({
  children,
  columns = 6,
  className
}: QuickActionGridProps) {
  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  )
}
