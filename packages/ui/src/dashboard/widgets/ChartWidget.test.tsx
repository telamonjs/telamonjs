import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartWidget } from './ChartWidget'

// Mock Recharts
vi.mock('recharts', () => import('../../test/__mocks__/recharts'))

// Mock ui/skeleton (Suspense fallback while the recharts body lazy-loads)
vi.mock('../../ui/skeleton', () => ({
  Skeleton: ({ className }: any) => (
    <div data-testid='skeleton' className={className}>
      Loading...
    </div>
  ),
}))

// NOTE: ChartWidget lazy-loads its recharts body (React.lazy + Suspense), so
// chart-content assertions await the lazy chunk via findBy* queries. Header
// content (title/description/actions) still renders synchronously.
describe('ChartWidget', () => {
  const mockData = [
    { month: 'Jan', revenue: 4000, expenses: 2400 },
    { month: 'Feb', revenue: 3000, expenses: 1398 },
    { month: 'Mar', revenue: 2000, expenses: 9800 },
  ]

  describe('Rendering', () => {
    it('renders with required props', async () => {
      render(<ChartWidget title='Revenue Chart' data={mockData} />)

      expect(screen.getByText('Revenue Chart')).toBeInTheDocument()
      expect(
        await screen.findByTestId('responsive-container')
      ).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <ChartWidget
          title='Sales Overview'
          description='Monthly revenue breakdown'
          data={mockData}
        />
      )

      expect(screen.getByText('Sales Overview')).toBeInTheDocument()
      expect(screen.getByText('Monthly revenue breakdown')).toBeInTheDocument()
    })

    it('renders header action', () => {
      render(
        <ChartWidget
          title='Chart'
          data={mockData}
          headerAction={<button>Export</button>}
        />
      )

      expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <ChartWidget
          title='Chart'
          data={mockData}
          className='custom-chart-widget'
        />
      )

      expect(
        container.querySelector('.custom-chart-widget')
      ).toBeInTheDocument()
    })
  })

  describe('Chart Types', () => {
    it('renders line chart by default', async () => {
      render(<ChartWidget title='Line Chart' data={mockData} />)

      expect(await screen.findByTestId('line-chart')).toBeInTheDocument()
    })

    it('renders line chart explicitly', async () => {
      render(
        <ChartWidget
          title='Line Chart'
          data={mockData}
          type='line'
          xAxisKey='month'
          dataKeys={['revenue', 'expenses']}
        />
      )

      expect(await screen.findByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('line-revenue')).toBeInTheDocument()
      expect(screen.getByTestId('line-expenses')).toBeInTheDocument()
    })

    it('renders bar chart', async () => {
      render(
        <ChartWidget
          title='Bar Chart'
          data={mockData}
          type='bar'
          xAxisKey='month'
          dataKeys={['revenue', 'expenses']}
        />
      )

      expect(await screen.findByTestId('bar-chart')).toBeInTheDocument()
      expect(screen.getByTestId('bar-revenue')).toBeInTheDocument()
      expect(screen.getByTestId('bar-expenses')).toBeInTheDocument()
    })

    it('renders pie chart', async () => {
      render(
        <ChartWidget
          title='Pie Chart'
          data={mockData}
          type='pie'
          valueKey='revenue'
          nameKey='month'
        />
      )

      expect(await screen.findByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  describe('Chart Customization', () => {
    it('renders with custom colors', async () => {
      render(
        <ChartWidget
          title='Chart'
          data={mockData}
          colors={['#ff0000', '#00ff00', '#0000ff']}
        />
      )

      expect(await screen.findByTestId('line-chart')).toBeInTheDocument()
    })

    it('renders with custom height', async () => {
      render(<ChartWidget title='Chart' data={mockData} height={500} />)

      expect(
        await screen.findByTestId('responsive-container')
      ).toBeInTheDocument()
    })

    it('renders without legend', async () => {
      render(<ChartWidget title='Chart' data={mockData} showLegend={false} />)

      await screen.findByTestId('line-chart')
      expect(screen.queryByTestId('legend')).not.toBeInTheDocument()
    })

    it('renders without grid', async () => {
      render(<ChartWidget title='Chart' data={mockData} showGrid={false} />)

      await screen.findByTestId('line-chart')
      expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument()
    })

    it('renders with legend enabled', async () => {
      render(<ChartWidget title='Chart' data={mockData} showLegend={true} />)

      expect(await screen.findByTestId('legend')).toBeInTheDocument()
    })

    it('renders with grid enabled', async () => {
      render(<ChartWidget title='Chart' data={mockData} showGrid={true} />)

      expect(await screen.findByTestId('cartesian-grid')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty data', async () => {
      render(<ChartWidget title='Empty Chart' data={[]} />)

      expect(screen.getByText('Empty Chart')).toBeInTheDocument()
      expect(
        await screen.findByTestId('responsive-container')
      ).toBeInTheDocument()
    })

    it('renders with single data point', () => {
      render(
        <ChartWidget
          title='Single Point'
          data={[{ month: 'Jan', value: 100 }]}
        />
      )

      expect(screen.getByText('Single Point')).toBeInTheDocument()
    })
  })
})
