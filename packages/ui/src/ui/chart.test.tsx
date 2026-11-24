import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { LegendPayload, TooltipPayload } from 'recharts'

// ResponsiveContainer measures 0×0 in jsdom; the mock renders its children as-is
vi.mock('recharts', () => import('../test/__mocks__/recharts'))

import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  type ChartConfig,
} from './chart'

const config: ChartConfig = {
  sales: { label: 'Sales', color: '#f00' },
}

// Typed with recharts' own payload types: a recharts bump that changes them breaks here first
const tooltipPayload: TooltipPayload = [
  {
    dataKey: 'sales',
    name: 'sales',
    value: 1200,
    color: '#f00',
    payload: { month: 'Jan', sales: 1200 },
    graphicalItemId: 'bar-sales',
  },
]

const legendPayload: LegendPayload[] = [
  { value: 'sales', dataKey: 'sales', color: '#f00' },
]

describe('ChartTooltipContent', () => {
  it('renders the configured label and the value of each payload entry', () => {
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent active payload={tooltipPayload} label='Jan' />
      </ChartContainer>
    )

    expect(screen.getByText('Sales')).toBeInTheDocument()
    expect(screen.getByText((1200).toLocaleString())).toBeInTheDocument()
  })

  it('renders nothing when inactive', () => {
    const { container } = render(
      <ChartContainer config={config}>
        <ChartTooltipContent active={false} payload={tooltipPayload} />
      </ChartContainer>
    )

    expect(container.querySelector('.grid.min-w-\\[8rem\\]')).toBeNull()
  })

  it('calls formatter with recharts arguments: value, name, entry, index, whole payload', () => {
    const formatter = vi.fn(() => 'formatted')
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          payload={tooltipPayload}
          formatter={formatter}
        />
      </ChartContainer>
    )

    expect(screen.getByText('formatted')).toBeInTheDocument()
    expect(formatter).toHaveBeenCalledWith(
      1200,
      'sales',
      tooltipPayload[0],
      0,
      tooltipPayload
    )
  })
})

describe('ChartLegendContent', () => {
  it('renders the configured label of each legend entry', () => {
    render(
      <ChartContainer config={config}>
        <ChartLegendContent payload={legendPayload} />
      </ChartContainer>
    )

    expect(screen.getByText('Sales')).toBeInTheDocument()
  })
})
