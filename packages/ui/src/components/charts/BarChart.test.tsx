import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BarChart } from './BarChart'

// Mock Recharts
vi.mock('recharts', () => import('../../test/__mocks__/recharts'))

describe('BarChart', () => {
  const mockData = [
    { name: 'Jan', vendas: 4000 },
    { name: 'Fev', vendas: 3000 },
    { name: 'Mar', vendas: 2000 },
  ]

  describe('Rendering', () => {
    it('renders with required props', () => {
      render(<BarChart data={mockData} dataKeys={['vendas']} />)

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      expect(screen.getByTestId('bar-vendas')).toBeInTheDocument()
    })

    it('renders with horizontal layout', () => {
      render(
        <BarChart data={mockData} dataKeys={['vendas']} layout='horizontal' />
      )

      expect(screen.getByTestId('bar-chart')).toHaveAttribute(
        'data-layout',
        'horizontal'
      )
    })

    it('renders with vertical layout', () => {
      render(
        <BarChart data={mockData} dataKeys={['vendas']} layout='vertical' />
      )

      expect(screen.getByTestId('bar-chart')).toHaveAttribute(
        'data-layout',
        'vertical'
      )
    })
  })

  describe('Data Handling', () => {
    it('handles empty data', () => {
      render(<BarChart data={[]} dataKeys={['vendas']} />)

      expect(screen.getByTestId('bar-chart')).toHaveAttribute(
        'data-length',
        '0'
      )
    })

    it('handles multiple data keys', () => {
      render(<BarChart data={mockData} dataKeys={['vendas', 'lucro']} />)

      expect(screen.getByTestId('bar-vendas')).toBeInTheDocument()
      expect(screen.getByTestId('bar-lucro')).toBeInTheDocument()
    })
  })

  describe('Customization', () => {
    it('applies custom colors', () => {
      render(
        <BarChart
          data={mockData}
          dataKeys={['vendas']}
          colors={['#00ff00']}
        />
      )

      expect(screen.getByTestId('bar-vendas')).toHaveAttribute(
        'data-fill',
        '#00ff00'
      )
    })
  })
})
