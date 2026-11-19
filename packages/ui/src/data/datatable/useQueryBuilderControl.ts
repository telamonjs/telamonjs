'use client'

import React, { useCallback } from 'react'
import { QueryGroup, buildPrismaWhere } from '../queryBuilderUtils'

export interface QueryBuilderControl {
  queryBuilderOpen: boolean
  setQueryBuilderOpen: React.Dispatch<React.SetStateAction<boolean>>
  queryGroup: QueryGroup
  setQueryGroup: React.Dispatch<React.SetStateAction<QueryGroup>>
  handleQueryBuilderApply: () => void
  handleQueryBuilderClear: () => void
}

/**
 * Owns the visual query builder state (dialog open + query group) and the
 * apply/clear handlers that emit a Prisma where object to the parent.
 *
 * @internal Extracted from DataTable.tsx (query builder state/handlers)
 */
export function useQueryBuilderControl(
  onQueryBuilderChange?: (where: Record<string, unknown> | undefined) => void
): QueryBuilderControl {
  // Query Builder state
  const [queryBuilderOpen, setQueryBuilderOpen] = React.useState(false)
  const [queryGroup, setQueryGroup] = React.useState<QueryGroup>({
    logic: 'AND',
    conditions: [],
  })

  // Query Builder handlers
  const handleQueryBuilderApply = useCallback(() => {
    const where = buildPrismaWhere(queryGroup)
    if (onQueryBuilderChange) {
      onQueryBuilderChange(where)
    }
    setQueryBuilderOpen(false)
  }, [queryGroup, onQueryBuilderChange])

  const handleQueryBuilderClear = useCallback(() => {
    const emptyGroup: QueryGroup = { logic: 'AND', conditions: [] }
    setQueryGroup(emptyGroup)
    if (onQueryBuilderChange) {
      onQueryBuilderChange(undefined)
    }
  }, [onQueryBuilderChange])

  return {
    queryBuilderOpen,
    setQueryBuilderOpen,
    queryGroup,
    setQueryGroup,
    handleQueryBuilderApply,
    handleQueryBuilderClear,
  }
}
