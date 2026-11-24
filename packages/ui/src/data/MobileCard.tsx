'use client'

import React, { memo } from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { ColumnDef, flexRender } from '@tanstack/react-table'
import type { CellContext } from '@tanstack/react-table'
import { useTelamonjsT } from '../i18n/use-t'
import { getColumnLabel } from './column-label'
import { isOwnRowClick } from './row-click'

/**
 * MobileCardProps - Configuration for MobileCard component
 *
 * @category Data
 *
 * @description
 * Props for MobileCard component that displays a single table row as a mobile-friendly card.
 * Automatically used by DataTable on small screens (<768px) to replace table rows.
 */
interface MobileCardProps<TData, TValue = unknown> {
  /** Row data to display in the card */
  data: TData

  /** Table column definitions from TanStack Table. Used to extract and render data. */
  columns: ColumnDef<TData, TValue>[]

  /** Callback when card is clicked. Used for row selection. */
  onSelect?: (data: TData) => void

  /** Whether the card is currently selected. Shows ring border when true. */
  isSelected?: boolean

  /** Array of action buttons shown in dropdown menu (3-dot menu in top-right) */
  actions?: Array<{
    label: string
    onClick: (data: TData) => void
    variant?: 'default' | 'destructive'
  }>
}

/**
 * MobileCard - Card component for mobile-responsive table data display
 *
 * @category Data
 * @status stable
 *
 * @description
 * Production-ready card component that displays a single table row as a mobile-friendly card.
 * Automatically renders the first 4 non-special columns in a structured layout: title, subtitle,
 * and detail fields. Includes actions dropdown and selection support.
 *
 * **Key Features:**
 * - **Auto column mapping:** Uses first 4 columns (excluding select/actions/id)
 * - **Structured layout:** Title, subtitle, and detail fields with labels
 * - **Actions dropdown:** 3-dot menu in top-right corner
 * - **Selection support:** Click to select with visual ring indicator
 * - **Boolean badges:** Automatic "Sim/Não" badges for boolean values
 * - **Truncation:** Long text automatically truncates with ellipsis
 * - **Hover effect:** Shadow on hover for better UX
 *
 * **Column Mapping:**
 * - **Column 1:** Title (large, bold)
 * - **Column 2:** Subtitle (small, muted)
 * - **Columns 3-4:** Detail fields with labels
 *
 * **When to use:**
 * - **Automatically:** DataTable uses this automatically on mobile screens
 * - **Custom mobile views:** Build custom mobile layouts with consistent cards
 * - **List views:** Alternative to table view for any list of items
 *
 * **When NOT to use:**
 * - **Desktop only:** Use table view instead
 * - **Complex layouts:** Create custom card component
 *
 * **DataTable Integration:**
 * DataTable automatically switches to MobileCard view on screens <768px.
 * No configuration needed - it just works!
 *
 * **Best practices:**
 * - Ensure first 4 columns contain most important data
 * - Use concise column headers (appear as labels in mobile view)
 * - Limit actions to 3-5 items for better UX
 * - Use destructive variant for delete/remove actions
 *
 * @example
 * Automatic usage via DataTable (recommended):
 * ```tsx
 * import { DataTable } from '@telamonjs/ui'
 * import { ColumnDef } from '@tanstack/react-table'
 *
 * const columns: ColumnDef<User>[] = [
 *   { accessorKey: 'name', header: 'Name' },
 *   { accessorKey: 'email', header: 'Email' },
 *   { accessorKey: 'role', header: 'Role' },
 *   { accessorKey: 'status', header: 'Status' },
 * ]
 *
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   enableRowSelection
 *   actions={[
 *     { label: 'Edit', onClick: (row) => editUser(row.id) },
 *     { label: 'Delete', onClick: (row) => deleteUser(row.id), variant: 'destructive' },
 *   ]}
 * />
 * ```
 *
 * @example
 * Direct usage (custom mobile view):
 * ```tsx
 * import { MobileCard } from '@telamonjs/ui'
 * import { ColumnDef } from '@tanstack/react-table'
 *
 * const columns: ColumnDef<Product>[] = [
 *   { accessorKey: 'name', header: 'Product Name' },
 *   { accessorKey: 'price', header: 'Price' },
 *   { accessorKey: 'stock', header: 'Stock' },
 *   { accessorKey: 'category', header: 'Category' },
 * ]
 *
 * export function ProductList({ products }: { products: Product[] }) {
 *   const [selected, setSelected] = useState<Product | null>(null)
 *
 *   return (
 *     <div className="grid gap-4">
 *       {products.map(product => (
 *         <MobileCard
 *           key={product.id}
 *           data={product}
 *           columns={columns}
 *           isSelected={selected?.id === product.id}
 *           onSelect={setSelected}
 *           actions={[
 *             { label: 'Edit', onClick: (p) => editProduct(p.id) },
 *             { label: 'Duplicate', onClick: (p) => duplicateProduct(p.id) },
 *             { label: 'Delete', onClick: (p) => deleteProduct(p.id), variant: 'destructive' },
 *           ]}
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * With selection and bulk actions:
 * ```tsx
 * import { useState } from 'react'
 * import { MobileCard } from '@telamonjs/ui'
 * import { Button } from '@telamonjs/ui'
 *
 * export function OrderList({ orders }: { orders: Order[] }) {
 *   const [selectedOrders, setSelectedOrders] = useState<Order[]>([])
 *
 *   const toggleSelection = (order: Order) => {
 *     setSelectedOrders(prev =>
 *       prev.some(o => o.id === order.id)
 *         ? prev.filter(o => o.id !== order.id)
 *         : [...prev, order]
 *     )
 *   }
 *
 *   const handleBulkDelete = () => {
 *     deleteOrders(selectedOrders.map(o => o.id))
 *     setSelectedOrders([])
 *   }
 *
 *   return (
 *     <div>
 *       {selectedOrders.length > 0 && (
 *         <div className="mb-4 flex gap-2">
 *           <Button onClick={handleBulkDelete} variant="destructive">
 *             Delete {selectedOrders.length} orders
 *           </Button>
 *         </div>
 *       )}
 *
 *       <div className="grid gap-4">
 *         {orders.map(order => (
 *           <MobileCard
 *             key={order.id}
 *             data={order}
 *             columns={orderColumns}
 *             isSelected={selectedOrders.some(o => o.id === order.id)}
 *             onSelect={toggleSelection}
 *             actions={[
 *               { label: 'View Details', onClick: (o) => viewOrder(o.id) },
 *               { label: 'Cancel Order', onClick: (o) => cancelOrder(o.id), variant: 'destructive' },
 *             ]}
 *           />
 *         ))}
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * Custom column rendering with cell functions:
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   { accessorKey: 'name', header: 'Name' },
 *   {
 *     accessorKey: 'email',
 *     header: 'Email',
 *     cell: ({ row }) => (
 *       <a href={`mailto:${row.original.email}`} className="text-blue-600 underline">
 *         {row.original.email}
 *       </a>
 *     ),
 *   },
 *   {
 *     accessorKey: 'role',
 *     header: 'Role',
 *     cell: ({ row }) => (
 *       <Badge variant={row.original.role === 'ADMIN' ? 'default' : 'secondary'}>
 *         {row.original.role}
 *       </Badge>
 *     ),
 *   },
 *   {
 *     accessorKey: 'active',
 *     header: 'Active',
 *   },
 * ]
 *
 * <MobileCard
 *   data={user}
 *   columns={columns}
 *   actions={userActions}
 * />
 * ```
 *
 * @example
 * Without actions (read-only):
 * ```tsx
 * <MobileCard
 *   data={notification}
 *   columns={notificationColumns}
 *   onSelect={markAsRead}
 * />
 * ```
 *
 * @see {@link DataTable} for automatic mobile view
 * @see {@link ListPage} for complete list page with mobile support
 */
function MobileCardImpl<TData, TValue = unknown>({
  data,
  columns,
  onSelect,
  isSelected,
  actions,
}: MobileCardProps<TData, TValue>) {
  const t = useTelamonjsT()
  // Function to extract values from the columns
  const getColumnValue = (
    column: ColumnDef<TData, TValue>,
    data: TData
  ): React.ReactNode => {
    // Intersection cast to access accessor properties across the ColumnDef union
    const colDef = column as ColumnDef<TData, TValue> & {
      accessorKey?: string
      accessorFn?: (row: TData, index: number) => unknown
    }

    if (colDef.accessorKey) {
      return (data as Record<string, unknown>)[
        colDef.accessorKey
      ] as React.ReactNode
    }
    if (colDef.accessorFn) {
      return colDef.accessorFn(data, 0) as React.ReactNode
    }
    if (colDef.cell) {
      // Simplified rendering to avoid complex typing problems
      try {
        return flexRender(colDef.cell, {
          getValue: () => data,
          row: { original: data },
          column,
          table: {},
        } as unknown as CellContext<TData, TValue>)
      } catch {
        return String(data)
      }
    }
    return null
  }

  // Take the first relevant columns for the card
  const primaryColumns = columns
    .filter(col => {
      const colDef = col as ColumnDef<TData, TValue> & { accessorKey?: string }
      return (
        colDef.accessorKey !== 'select' &&
        col.id !== 'actions' &&
        colDef.accessorKey !== 'id'
      )
    })
    .slice(0, 4)

  const titleColumn = primaryColumns[0]
  const subtitleColumn = primaryColumns[1]
  const detailColumns = primaryColumns.slice(2)

  const titleValue = titleColumn ? getColumnValue(titleColumn, data) : ''
  const subtitleValue = subtitleColumn
    ? getColumnValue(subtitleColumn, data)
    : ''

  return (
    <Card
      className={`relative transition-all hover:shadow-md cursor-pointer ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={e => {
        if (isOwnRowClick(e)) onSelect?.(data)
      }}
    >
      <CardHeader className='pb-2'>
        <div className='flex items-start justify-between'>
          <div className='flex-1 min-w-0'>
            <h3 className='font-semibold text-sm truncate'>{titleValue}</h3>
            {subtitleValue && (
              <p className='text-xs text-muted-foreground truncate mt-1'>
                {subtitleValue}
              </p>
            )}
          </div>

          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  className='h-8 w-8 p-0'
                  onClick={e => e.stopPropagation()}
                  aria-label={t('data.openRowActions')}
                >
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {actions.map(action => (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={e => {
                      e.stopPropagation()
                      action.onClick(data)
                    }}
                    className={
                      action.variant === 'destructive' ? 'text-destructive' : ''
                    }
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      {detailColumns.length > 0 && (
        <CardContent className='pt-0'>
          <div className='space-y-2'>
            {detailColumns.map((column, colIdx) => {
              const value = getColumnValue(column, data)
              const header = getColumnLabel(column)
              const columnId = column.id || header || `col-${colIdx}`

              if (!value) return null

              return (
                <div
                  key={columnId}
                  className='flex justify-between items-center text-xs'
                >
                  <span className='text-muted-foreground font-medium'>
                    {header ?? t('data.fieldFallback', { n: colIdx + 3 })}
                    :
                  </span>
                  <span className='truncate ml-2 max-w-[60%]'>
                    {typeof value === 'boolean' ? (
                      <Badge
                        variant={value ? 'default' : 'secondary'}
                        className='text-xs'
                      >
                        {value ? t('common.yes') : t('common.no')}
                      </Badge>
                    ) : (
                      value
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Memoized version of MobileCard for better performance.
 * Prevents unnecessary re-renders when parent component updates.
 */
export const MobileCard = memo(MobileCardImpl) as typeof MobileCardImpl
