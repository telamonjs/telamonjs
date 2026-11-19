import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../DataTable'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/x',
  useSearchParams: () => new URLSearchParams(),
}))

const mounts = vi.hoisted(() => ({ count: 0 }))

// Mount counter on the injected selection checkbox cell
vi.mock('../../ui/checkbox', async () => {
  const React = await import('react')
  return {
    Checkbox: (props: { 'aria-label'?: string }) => {
      React.useEffect(() => {
        mounts.count++
      }, [])
      return <input type='checkbox' aria-label={props['aria-label']} readOnly />
    },
  }
})

type Row = { id: string; name: string }
const data: Row[] = [
  { id: '1', name: 'John' },
  { id: '2', name: 'Jane' },
]
const columns: ColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }]

describe('useSpecialColumns remount', () => {
  it('expanding a row does not remount other special cells', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        tableId='remount-expand'
        data={data}
        columns={columns}
        enableRowSelection
        enableExpandableRows
        expandableRowContent={row => <div>Details {row.name}</div>}
      />
    )
    const before = mounts.count
    expect(before).toBeGreaterThan(0)
    const row = screen.getByText('John').closest('tr')!
    await user.click(
      within(row).getByTestId('icon-chevrondown').closest('button')!
    )
    await screen.findByText('Details John')
    expect(mounts.count).toBe(before)
  })
})
