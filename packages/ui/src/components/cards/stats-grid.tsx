'use client'

import { createContext, useContext } from 'react'
import { cn } from '../../utils/cn'
import type { StatsGridProps } from './types'

const gridCols = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-3 lg:grid-cols-6'
} as const

const gridGap = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4'
} as const

/** Context that signals children to use compact sizing when grid is dense */
const StatsGridDenseContext = createContext(false)
// eslint-disable-next-line react-refresh/only-export-components -- hook is the public consumer API for StatsGrid's density context, tightly coupled to this file
export function useStatsGridDense() {
  return useContext(StatsGridDenseContext)
}

export function StatsGrid({
  children,
  columns = 4,
  gap = 'md',
  className
}: StatsGridProps) {
  const dense = columns >= 5

  return (
    <StatsGridDenseContext.Provider value={dense}>
      <div className={cn('grid', gridCols[columns], gridGap[gap], className)}>
        {children}
      </div>
    </StatsGridDenseContext.Provider>
  )
}
