/** PRD 068 item 12: ReportLayout forwards titleAs to PageContent. */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportLayout } from './ReportLayout'

describe('ReportLayout', () => {
  it('renders title, description and content', () => {
    render(
      <ReportLayout title='Receitas' description='Por mês'>
        <p>gráfico</p>
      </ReportLayout>
    )
    expect(screen.getByText('Receitas')).toBeInTheDocument()
    expect(screen.getByText('gráfico')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it("titleAs='h2' makes the title a level-2 heading", () => {
    render(<ReportLayout title='Receitas' description='Por mês' titleAs='h2' />)
    expect(screen.getByRole('heading', { level: 2, name: 'Receitas' })).toBeInTheDocument()
  })
})
