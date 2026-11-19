'use client'

import React from 'react'
import { cn } from '../../utils'
import { Card } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Check, X } from 'lucide-react'
import { useTelamonjsT } from '../../i18n/use-t'
import { useFormat } from '../../i18n/use-format'

/**
 * Comparison table column
 */
export interface ComparisonColumn {
  label: string
  key: string
  highlight?: boolean
  badge?: string
}

/**
 * Comparison table row
 */
export interface ComparisonRow {
  feature: string
  category?: string
  [key: string]: string | boolean | number | undefined
}

/**
 * ComparisonTable props
 */
export interface ComparisonTableProps {
  columns: ComparisonColumn[]
  rows: ComparisonRow[]
  className?: string
  stickyHeader?: boolean
}

/**
 * ComparisonTable - Feature/product comparison table
 *
 * @example
 * ```tsx
 * <ComparisonTable
 *   columns={[
 *     { label: 'Basic', key: 'basic' },
 *     { label: 'Pro', key: 'pro', highlight: true, badge: 'Popular' },
 *     { label: 'Enterprise', key: 'enterprise' }
 *   ]}
 *   rows={[
 *     { feature: 'Users', basic: '5', pro: '20', enterprise: 'Unlimited' },
 *     { feature: 'Support', basic: false, pro: true, enterprise: true }
 *   ]}
 * />
 * ```
 */
export function ComparisonTable({
  columns,
  rows,
  className,
  stickyHeader = true,
}: ComparisonTableProps) {
  const t = useTelamonjsT()
  const { number } = useFormat()
  const renderCellValue = (value: string | boolean | number | undefined) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className='w-5 h-5 text-green-600 mx-auto' />
      ) : (
        <X className='w-5 h-5 text-red-400 mx-auto' />
      )
    }

    if (typeof value === 'number') {
      return (
        <span className='font-medium'>{number(value)}</span>
      )
    }

    return <span>{value || '-'}</span>
  }

  // Group rows by category
  const groupedRows = rows.reduce(
    (acc, row) => {
      const category = row.category || 'default'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(row)
      return acc
    },
    {} as Record<string, ComparisonRow[]>
  )

  const categories = Object.keys(groupedRows)

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead
            className={cn('bg-muted/50', stickyHeader && 'sticky top-0 z-10')}
          >
            <tr>
              <th className='text-left p-4 font-semibold min-w-[200px]'>
                {t('dashboard.feature')}
              </th>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    'text-center p-4 font-semibold min-w-[150px]',
                    column.highlight && 'bg-primary/10'
                  )}
                >
                  <div className='flex flex-col items-center gap-2'>
                    <span>{column.label}</span>
                    {column.badge && (
                      <Badge variant='secondary' className='text-xs'>
                        {column.badge}
                      </Badge>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <React.Fragment key={category}>
                {category !== 'default' && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className='p-3 bg-muted/30 font-semibold text-sm'
                    >
                      {category}
                    </td>
                  </tr>
                )}
                {groupedRows[category].map((row, rowIndex) => (
                  <tr
                    key={`${category}-${rowIndex}`}
                    className='border-t hover:bg-muted/50 transition-colors'
                  >
                    <td className='p-4 font-medium'>{row.feature}</td>
                    {columns.map(column => (
                      <td
                        key={column.key}
                        className={cn(
                          'p-4 text-center',
                          column.highlight && 'bg-primary/5'
                        )}
                      >
                        {renderCellValue(row[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
