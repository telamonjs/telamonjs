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

  describe('Bar corner radius', () => {
    it('rounds the top corners in horizontal layout (vertical bars)', () => {
      render(<BarChart data={mockData} dataKeys={['vendas']} />)

      expect(screen.getByTestId('bar-vendas')).toHaveAttribute(
        'data-radius',
        '[4,4,0,0]'
      )
    })

    it('rounds the end (right) corners in vertical layout (horizontal bars)', () => {
      render(
        <BarChart
          data={mockData}
          dataKeys={['vendas', 'lucro']}
          layout='vertical'
        />
      )

      expect(screen.getByTestId('bar-vendas')).toHaveAttribute(
        'data-radius',
        '[0,4,4,0]'
      )
      expect(screen.getByTestId('bar-lucro')).toHaveAttribute(
        'data-radius',
        '[0,4,4,0]'
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

    it('value axis allows decimals by default', () => {
      render(<BarChart data={mockData} dataKeys={['vendas']} />)

      expect(screen.getByTestId('y-axis')).toHaveAttribute(
        'data-allow-decimals',
        'true'
      )
    })

    it('allowDecimals={false} reaches the value axis in both layouts', () => {
      const { unmount } = render(
        <BarChart data={mockData} dataKeys={['vendas']} allowDecimals={false} />
      )
      expect(screen.getByTestId('y-axis')).toHaveAttribute(
        'data-allow-decimals',
        'false'
      )
      unmount()

      render(
        <BarChart
          data={mockData}
          dataKeys={['vendas']}
          layout='vertical'
          allowDecimals={false}
        />
      )
      expect(screen.getByTestId('x-axis')).toHaveAttribute(
        'data-allow-decimals',
        'false'
      )
    })

    it('categoryAxisWidth sets the category (Y) axis width in vertical layout', () => {
      render(
        <BarChart
          data={mockData}
          dataKeys={['vendas']}
          layout='vertical'
          categoryAxisWidth={160}
        />
      )

      expect(screen.getByTestId('y-axis')).toHaveAttribute('data-width', '160')
    })
  })
})
