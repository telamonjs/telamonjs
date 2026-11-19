import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LineChart } from './LineChart'

// Mock Recharts
vi.mock('recharts', () => import('../../test/__mocks__/recharts'))

describe('LineChart', () => {
  const mockData = [
    { name: 'Jan', vendas: 4000, lucro: 2400 },
    { name: 'Fev', vendas: 3000, lucro: 1398 },
    { name: 'Mar', vendas: 2000, lucro: 9800 },
  ]

  describe('Rendering', () => {
    it('renders with required props', () => {
      render(<LineChart data={mockData} dataKeys={['vendas', 'lucro']} />)

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('renders with all optional props', () => {
      render(
        <LineChart
          data={mockData}
          dataKeys={['vendas', 'lucro']}
          colors={['#3b82f6', '#10b981']}
          height={400}
          showGrid={true}
          showLegend={true}
          xAxisLabel='Mês'
          yAxisLabel='Valor'
          className='custom-class'
        />
      )

      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })

    it('renders multiple data keys', () => {
      render(<LineChart data={mockData} dataKeys={['vendas', 'lucro']} />)

      expect(screen.getByTestId('line-vendas')).toBeInTheDocument()
      expect(screen.getByTestId('line-lucro')).toBeInTheDocument()
    })

    it('applies custom height', () => {
      render(<LineChart data={mockData} dataKeys={['vendas']} height={500} />)

      expect(screen.getByTestId('responsive-container')).toHaveAttribute(
        'data-height',
        '500'
      )
    })
  })

  describe('Data Handling', () => {
    it('handles empty data array', () => {
      render(<LineChart data={[]} dataKeys={['vendas']} />)

      expect(screen.getByTestId('line-chart')).toHaveAttribute(
        'data-length',
        '0'
      )
    })

    it('handles single data point', () => {
      render(
        <LineChart
          data={[{ name: 'Jan', vendas: 4000 }]}
          dataKeys={['vendas']}
        />
      )

      expect(screen.getByTestId('line-chart')).toHaveAttribute(
        'data-length',
        '1'
      )
    })

    it('handles large datasets', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        name: `Item ${i}`,
        value: Math.random() * 1000,
      }))

      render(<LineChart data={largeData} dataKeys={['value']} />)

      expect(screen.getByTestId('line-chart')).toHaveAttribute(
        'data-length',
        '100'
      )
    })
  })

  describe('Customization', () => {
    it('hides grid when showGrid is false', () => {
      render(
        <LineChart data={mockData} dataKeys={['vendas']} showGrid={false} />
      )

      expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument()
    })

    it('hides legend when showLegend is false', () => {
      render(
        <LineChart data={mockData} dataKeys={['vendas']} showLegend={false} />
      )

      expect(screen.queryByTestId('legend')).not.toBeInTheDocument()
    })

    it('applies custom colors to lines', () => {
      render(
        <LineChart
          data={mockData}
          dataKeys={['vendas']}
          colors={['#ff0000']}
        />
      )

      expect(screen.getByTestId('line-vendas')).toHaveAttribute(
        'data-stroke',
        '#ff0000'
      )
    })
  })
})
