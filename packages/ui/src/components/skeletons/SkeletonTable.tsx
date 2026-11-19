import { TableBody, TableCell, TableRow } from '../../ui/table'
import { Skeleton } from '../../ui/skeleton'
import { ColumnDef } from '@tanstack/react-table'

interface SkeletonTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  rows?: number
}

/**
 * Skeleton loading state para tabelas
 * Simula linhas de dados durante o carregamento
 */
export function SkeletonTable<TData>({
  columns,
  rows = 10,
}: SkeletonTableProps<TData>) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {columns.map((_column, colIndex) => (
            <TableCell key={colIndex} className='py-2'>
              <Skeleton className='h-4 w-full' />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}
