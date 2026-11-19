import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KPICard } from './KPICard'

// Mock ui/skeleton (loading state)
vi.mock('../../ui/skeleton', () => ({
  Skeleton: ({ className }: any) => (
    <div data-testid='skeleton' className={className}>
      Loading...
    </div>
  ),
}))

describe('KPICard', () => {
  describe('Rendering', () => {
    it('renders with required props', () => {
      render(<KPICard title='Vendas do Mês' value='R$ 45.231,89' />)

      expect(screen.getByTestId('card-title')).toHaveTextContent(
        'Vendas do Mês'
      )
      expect(screen.getByText('R$ 45.231,89')).toBeInTheDocument()
    })

    it('renders with numeric value', () => {
      render(<KPICard title='Total de Vendas' value={45231.89} />)

      expect(screen.getByText('45231.89')).toBeInTheDocument()
    })

    it('renders with icon', () => {
      render(
        <KPICard
          title='Vendas'
          value='R$ 1000'
          icon={<div data-testid='custom-icon'>$</div>}
        />
      )

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <KPICard
          title='Vendas'
          value='R$ 1000'
          description='Vendas realizadas no período'
        />
      )

      expect(
        screen.getByText('Vendas realizadas no período')
      ).toBeInTheDocument()
    })

    it('renders with footer', () => {
      render(
        <KPICard
          title='Vendas'
          value='R$ 1000'
          footer={<div data-testid='custom-footer'>Ver detalhes</div>}
        />
      )

      expect(screen.getByTestId('custom-footer')).toBeInTheDocument()
    })
  })

  describe('Trend Indicators', () => {
    it('renders positive change', () => {
      render(
        <KPICard title='Vendas' value='R$ 1000' change={12.5} trend='up' />
      )

      expect(screen.getByText('+12.5%')).toBeInTheDocument()
      expect(screen.getByTestId('icon-trendingup')).toBeInTheDocument()
    })

    it('renders negative change', () => {
      render(
        <KPICard title='Vendas' value='R$ 1000' change={-5.2} trend='down' />
      )

      expect(screen.getByText('-5.2%')).toBeInTheDocument()
      expect(screen.getByTestId('icon-trendingdown')).toBeInTheDocument()
    })

    it('renders neutral trend', () => {
      render(
        <KPICard title='Vendas' value='R$ 1000' change={0} trend='neutral' />
      )

      expect(screen.getByTestId('icon-minus')).toBeInTheDocument()
    })

    it('renders change without trend icon', () => {
      render(<KPICard title='Vendas' value='R$ 1000' change={10} />)

      expect(screen.getByText('+10%')).toBeInTheDocument()
    })

    it('renders custom change label', () => {
      render(
        <KPICard
          title='Vendas'
          value='R$ 1000'
          change={12.5}
          changeLabel='vs. último trimestre'
        />
      )

      expect(screen.getByText('vs. último trimestre')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('renders loading skeleton', () => {
      render(<KPICard title='Vendas' value='R$ 1000' loading={true} />)

      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('does not render content when loading', () => {
      render(<KPICard title='Vendas' value='R$ 1000' loading={true} />)

      expect(screen.queryByText('R$ 1000')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined change', () => {
      render(<KPICard title='Vendas' value='R$ 1000' change={undefined} />)

      expect(screen.queryByText('%')).not.toBeInTheDocument()
    })

    it('handles zero change', () => {
      render(<KPICard title='Vendas' value='R$ 1000' change={0} />)

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <KPICard title='Vendas' value='R$ 1000' className='custom-kpi' />
      )

      expect(container.querySelector('.custom-kpi')).toBeInTheDocument()
    })
  })
})
