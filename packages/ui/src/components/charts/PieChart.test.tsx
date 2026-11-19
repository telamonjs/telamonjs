import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PieChart } from './PieChart'

// Mock Recharts
vi.mock('recharts', () => import('../../test/__mocks__/recharts'))

describe('PieChart', () => {
  const mockData = [
    { name: 'Desktop', value: 4000 },
    { name: 'Mobile', value: 3000 },
    { name: 'Tablet', value: 2000 },
  ]

  describe('Rendering', () => {
    it('renders with required props', () => {
      render(<PieChart data={mockData} dataKey='value' />)

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      expect(screen.getByTestId('pie')).toBeInTheDocument()
    })

    it('renders with custom nameKey', () => {
      render(<PieChart data={mockData} dataKey='value' nameKey='name' />)

      expect(screen.getByTestId('pie')).toHaveAttribute(
        'data-name-key',
        'name'
      )
    })

    it('renders as donut chart with innerRadius', () => {
      render(<PieChart data={mockData} dataKey='value' innerRadius={60} />)

      expect(screen.getByTestId('pie')).toHaveAttribute(
        'data-inner-radius',
        '60'
      )
    })
  })

  describe('Data Handling', () => {
    it('handles empty data', () => {
      render(<PieChart data={[]} dataKey='value' />)

      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '0')
    })

    it('handles single data point', () => {
      render(
        <PieChart data={[{ name: 'Single', value: 100 }]} dataKey='value' />
      )

      expect(screen.getByTestId('pie')).toHaveAttribute('data-length', '1')
    })
  })

  describe('Customization', () => {
    it('hides legend when showLegend is false', () => {
      render(<PieChart data={mockData} dataKey='value' showLegend={false} />)

      expect(screen.queryByTestId('legend')).not.toBeInTheDocument()
    })

    it('hides labels when showLabels is false', () => {
      render(<PieChart data={mockData} dataKey='value' showLabels={false} />)

      expect(screen.getByTestId('pie')).toBeInTheDocument()
    })
  })
})
