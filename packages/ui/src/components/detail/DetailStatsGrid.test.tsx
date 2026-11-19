import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { DetailStatsGrid } from './DetailStatsGrid'

// Lucide icons and Next Image are mocked globally in setup.ts

describe('DetailStatsGrid', () => {
  describe('Rendering', () => {
    it('renders multiple stats', () => {
      renderWithProviders(
        <DetailStatsGrid
          stats={[
            { label: 'Total Users', value: 150 },
            { label: 'Active', value: 120 },
          ]}
        />
      )

      expect(screen.getByText('Total Users')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('120')).toBeInTheDocument()
    })

    it('renders with icons', () => {
      const { User, TrendingUp } = require('lucide-react')
      const { container } = renderWithProviders(
        <DetailStatsGrid
          stats={[
            { label: 'Users', value: 100, icon: User },
            { label: 'Growth', value: '15%', icon: TrendingUp },
          ]}
        />
      )

      // Icons render as SVG elements (2 stats = 2 SVGs)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(2)
    })

    it('renders with colors', () => {
      renderWithProviders(
        <DetailStatsGrid
          stats={[
            { label: 'Success', value: 100, color: 'success' },
            { label: 'Error', value: 5, color: 'danger' },
          ]}
        />
      )

      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty stats array', () => {
      expect(() => {
        renderWithProviders(<DetailStatsGrid stats={[]} />)
      }).not.toThrow()
    })

    it('renders with different column counts', () => {
      renderWithProviders(
        <DetailStatsGrid
          columns={3}
          stats={[
            { label: 'Stat 1', value: 1 },
            { label: 'Stat 2', value: 2 },
            { label: 'Stat 3', value: 3 },
          ]}
        />
      )

      expect(screen.getByText('Stat 1')).toBeInTheDocument()
      expect(screen.getByText('Stat 2')).toBeInTheDocument()
      expect(screen.getByText('Stat 3')).toBeInTheDocument()
    })
  })

  describe('Enhanced Coverage', () => {
    describe('Column Configurations', () => {
      it('renders with 3 columns', () => {
        renderWithProviders(
          <DetailStatsGrid
            columns={3}
            stats={[
              { label: 'Stat 1', value: 100 },
              { label: 'Stat 2', value: 200 },
              { label: 'Stat 3', value: 300 },
            ]}
          />
        )

        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('200')).toBeInTheDocument()
        expect(screen.getByText('300')).toBeInTheDocument()
      })

      it('renders with 4 columns', () => {
        renderWithProviders(
          <DetailStatsGrid
            columns={4}
            stats={[
              { label: 'A', value: 1 },
              { label: 'B', value: 2 },
              { label: 'C', value: 3 },
              { label: 'D', value: 4 },
            ]}
          />
        )

        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('4')).toBeInTheDocument()
      })
    })

    describe('Stat Variants', () => {
      it('renders all color variants', () => {
        renderWithProviders(
          <DetailStatsGrid
            stats={[
              { label: 'Default', value: 100, color: 'default' },
              { label: 'Success', value: 200, color: 'success' },
              { label: 'Danger', value: 300, color: 'danger' },
              { label: 'Warning', value: 400, color: 'warning' },
              { label: 'Info', value: 500, color: 'info' },
            ]}
          />
        )

        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('200')).toBeInTheDocument()
        expect(screen.getByText('300')).toBeInTheDocument()
        expect(screen.getByText('400')).toBeInTheDocument()
        expect(screen.getByText('500')).toBeInTheDocument()
      })

      it('renders with descriptions', () => {
        renderWithProviders(
          <DetailStatsGrid
            stats={[
              {
                label: 'Revenue',
                value: 'R$ 10.000',
                description: 'Last 30 days',
              },
              {
                label: 'Growth',
                value: '+15%',
                description: 'vs. last month',
              },
            ]}
          />
        )

        expect(screen.getByText('Last 30 days')).toBeInTheDocument()
        expect(screen.getByText('vs. last month')).toBeInTheDocument()
      })

      it('renders string values', () => {
        renderWithProviders(
          <DetailStatsGrid
            stats={[
              { label: 'Status', value: 'Active' },
              { label: 'Rate', value: '95.5%' },
              { label: 'Currency', value: 'R$ 1.234,56' },
            ]}
          />
        )

        expect(screen.getByText('Active')).toBeInTheDocument()
        expect(screen.getByText('95.5%')).toBeInTheDocument()
        expect(screen.getByText('R$ 1.234,56')).toBeInTheDocument()
      })

      it('renders ReactNode values', () => {
        renderWithProviders(
          <DetailStatsGrid
            stats={[
              {
                label: 'Status',
                value: <span data-testid='badge'>Active</span>,
              },
            ]}
          />
        )

        expect(screen.getByTestId('badge')).toBeInTheDocument()
      })
    })

    describe('Large Datasets', () => {
      it('renders many stats (8+)', () => {
        const stats = Array.from({ length: 12 }, (_, i) => ({
          label: `Metric ${i + 1}`,
          value: (i + 1) * 100,
        }))

        renderWithProviders(<DetailStatsGrid columns={4} stats={stats} />)

        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('1200')).toBeInTheDocument()
      })
    })

    describe('Custom className', () => {
      it('applies custom className to grid', () => {
        const { container } = renderWithProviders(
          <DetailStatsGrid
            className='my-custom-grid'
            stats={[{ label: 'Test', value: 123 }]}
          />
        )

        const grid = container.querySelector('.my-custom-grid')
        expect(grid).toBeInTheDocument()
      })
    })
  })
})
