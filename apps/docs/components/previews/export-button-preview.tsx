'use client'

import { ExportButtons, type ExportColumn } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

interface OrderRow extends Record<string, unknown> {
  id: string
  customer: string
  total: number
}

const data: OrderRow[] = [
  { id: 'ORD-001', customer: 'Ana Lima', total: 149.9 },
  { id: 'ORD-002', customer: 'Bruno Reis', total: 89.5 },
  { id: 'ORD-003', customer: 'Carla Souza', total: 320.0 },
]

const columns: ExportColumn<OrderRow>[] = [
  { header: 'Order', accessorKey: 'id' },
  { header: 'Customer', accessorKey: 'customer' },
  { header: 'Total', accessorFn: row => row.total.toFixed(2) },
]

async function exportCSV(
  rows: OrderRow[],
  cols: ExportColumn<OrderRow>[],
  filename: string
) {
  const cell = (row: OrderRow, col: ExportColumn<OrderRow>) =>
    String(col.accessorFn ? (col.accessorFn(row) ?? '') : (row[col.accessorKey!] ?? ''))
  const csv = [
    cols.map(c => c.header).join(','),
    ...rows.map(row => cols.map(col => cell(row, col)).join(',')),
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const CODE = `import { ExportButtons, type ExportColumn } from '@telamonjs/ui'

const columns: ExportColumn<OrderRow>[] = [
  { header: 'Order', accessorKey: 'id' },
  { header: 'Customer', accessorKey: 'customer' },
  { header: 'Total', accessorFn: row => row.total.toFixed(2) },
]

// Only the handlers you pass become menu entries (PDF/Excel/CSV)
<ExportButtons
  data={orders}
  columns={columns}
  filename='orders'
  onExportCSV={exportCSV}
/>`

export function ExportButtonPreview() {
  return (
    <ComponentPreview code={CODE}>
      {/* eslint-disable-next-line telamonjs-accessibility/button-accessibility -- ExportButtons is a composite component (not a native button); it doesn't forward data-testid/aria-label props */}
      <ExportButtons<OrderRow>
        data={data}
        columns={columns}
        filename='orders'
        onExportCSV={exportCSV}
      />
    </ComponentPreview>
  )
}
