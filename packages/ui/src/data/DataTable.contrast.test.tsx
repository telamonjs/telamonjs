/**
 * PRD 068 item 7: TableHeader already paints bg-muted/50; a second
 * bg-muted/50 on each th stacked to ~75% muted and dropped the header text
 * (muted-foreground) to 4.44:1 — below WCAG AA 4.5:1 (4.54:1 with one layer).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'

vi.unmock('../ui/table')
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}))

type Row = { id: string; name: string }
const columns: ColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }]

describe('DataTable header contrast', () => {
  it('paints the muted header background once (thead), not again on each th', () => {
    render(<DataTable columns={columns} data={[{ id: '1', name: 'Ana' }]} />)
    const th = screen.getByRole('columnheader', { name: /name/i })
    expect(th.closest('thead')?.className).toMatch(/bg-muted\/50/)
    expect(th.className).not.toMatch(/bg-muted/)
    expect(th).toHaveClass('text-muted-foreground')
  })
})
