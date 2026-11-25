/**
 * Recharts' own defaults (#666 axis/ticks, #ccc grid) are light-only. Every
 * cartesian chart routes them through the theme tokens so dark mode follows.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LineChart } from './LineChart'
import { AreaChart } from './AreaChart'
import { BarChart } from './BarChart'
import { PieChart } from './PieChart'
import { ChartWidgetChart } from '../../dashboard/widgets/ChartWidgetChart'

vi.mock('recharts', () => import('../../test/__mocks__/recharts'))

const data = [
  { name: 'Jan', a: 1 },
  { name: 'Feb', a: 2 },
]
const AXIS = 'hsl(var(--muted-foreground))'
const GRID = 'hsl(var(--border))'
const SURFACE = 'hsl(var(--background))'

const cartesian = {
  LineChart: () => <LineChart data={data} dataKeys={['a']} />,
  AreaChart: () => <AreaChart data={data} dataKeys={['a']} />,
  'BarChart horizontal': () => <BarChart data={data} dataKeys={['a']} />,
  'BarChart vertical': () => (
    <BarChart data={data} dataKeys={['a']} layout='vertical' />
  ),
  ...Object.fromEntries(
    (['line', 'bar'] as const).map(type => [
      `ChartWidget ${type}`,
      () => (
        <ChartWidgetChart
          data={data}
          type={type}
          xAxisKey='name'
          dataKeys={['a']}
          valueKey='a'
          nameKey='name'
          colors={['#000']}
          height={200}
          showLegend
          showGrid
        />
      ),
    ])
  ),
}

describe('chart theme tokens', () => {
  for (const [name, Chart] of Object.entries(cartesian)) {
    it(`${name}: axes, ticks, grid and tooltip use theme tokens`, () => {
      render(<Chart />)
      for (const axis of [
        screen.getByTestId('x-axis'),
        screen.getByTestId('y-axis'),
      ]) {
        expect(axis).toHaveAttribute('data-stroke', AXIS)
        expect(axis).toHaveAttribute('data-tick-fill', AXIS)
      }
      expect(screen.getByTestId('cartesian-grid')).toHaveAttribute(
        'data-stroke',
        GRID
      )
      expect(screen.getByTestId('tooltip')).toHaveAttribute('data-bg', SURFACE)
    })
  }

  it('PieChart: tooltip uses theme tokens', () => {
    render(<PieChart data={[{ name: 'A', value: 1 }]} />)
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-bg', SURFACE)
  })
})
