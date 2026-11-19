import { describe, it, expect } from 'vitest'
import { renderHook, screen } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { getColumnLabel } from './column-label'
import { MobileCard } from './MobileCard'
import { renderWithProviders } from '../test/test-utils'
import { resolveColumns } from '../pages/list-page/resolve-columns'
import { useText } from '../i18n/use-t'
import { msg } from '../i18n/msg'
import { withAppMessages } from '../test/intl'
import type { CrudColumnDef } from '../types/crud'

interface Row {
  id: number
  name: string
  plate: string
  city: string
}

describe('getColumnLabel (export / column selector / mobile card)', () => {
  it('string header wins (legacy)', () => {
    expect(getColumnLabel({ header: 'Nome', meta: { label: 'x' } })).toBe('Nome')
  })

  it('function header falls back to meta.label', () => {
    expect(getColumnLabel({ header: () => 'X', meta: { label: 'Placa' } })).toBe('Placa')
  })

  it('no string header and no meta.label → undefined (callers keep their own fallback, e.g. column.id)', () => {
    expect(getColumnLabel({ header: () => 'X' })).toBeUndefined()
  })
})

describe('resolveColumns resolves meta.label MessageRef at the ListPage boundary', () => {
  it('turns meta.label msg() into a string', () => {
    const text = renderHook(() => useText(), { wrapper: withAppMessages({ v: { plate: 'Plate' } }) }).result.current
    const cols: CrudColumnDef<Row>[] = [{ accessorKey: 'plate', header: () => 'P', meta: { label: msg('v.plate') } }]
    expect(getColumnLabel(resolveColumns(cols, text)[0])).toBe('Plate')
  })
})

describe('MobileCard uses meta.label for function headers', () => {
  it('shows the meta label instead of the "Campo N" fallback', () => {
    const columns: ColumnDef<Row>[] = [
      { accessorKey: 'name', header: 'Nome' },
      { accessorKey: 'plate', header: 'Placa' },
      { accessorKey: 'city', header: () => 'Cidade', meta: { label: 'Cidade' } },
    ]
    renderWithProviders(<MobileCard data={{ id: 1, name: 'A', plate: 'B', city: 'Natal' }} columns={columns} />)
    expect(screen.getByText(/Cidade/)).toBeInTheDocument()
  })
})
