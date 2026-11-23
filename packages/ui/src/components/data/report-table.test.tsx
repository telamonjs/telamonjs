/**
 * PRD 068 item 11: the scroll box (max-height) must be keyboard reachable to
 * satisfy axe `scrollable-region-focusable` — opt-in via `scrollProps`.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportTable } from './report-table'

const data = [{ id: '1', nome: 'Ana' }]
const columns = [{ key: 'nome', header: 'Nome' }]

describe('ReportTable scrollProps', () => {
  it('default scroll box has no tab stop nor role (unchanged)', () => {
    const { container } = render(<ReportTable data={data} columns={columns} />)
    const box = container.querySelector('.overflow-auto')!
    expect(box).not.toHaveAttribute('tabindex')
    expect(box).not.toHaveAttribute('role')
  })

  it('applies tabIndex, role and aria-label to the scroll box', () => {
    render(
      <ReportTable
        data={data}
        columns={columns}
        scrollProps={{ tabIndex: 0, role: 'region', 'aria-label': 'Receitas por mês' }}
      />
    )
    const region = screen.getByRole('region', { name: 'Receitas por mês' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toHaveClass('overflow-auto')
    expect(region.querySelector('table')).not.toBeNull()
  })
})

describe('ReportTable showFooter', () => {
  const labels = { records: 'footer-records' }

  it('shows the "Showing X of Y" footer by default', () => {
    render(<ReportTable data={data} columns={columns} labels={labels} />)
    expect(screen.getByText(/footer-records/)).toHaveTextContent('1')
  })

  it('showFooter={false} hides it and keeps the table', () => {
    render(<ReportTable data={data} columns={columns} labels={labels} showFooter={false} />)
    expect(screen.queryByText(/footer-records/)).toBeNull()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
