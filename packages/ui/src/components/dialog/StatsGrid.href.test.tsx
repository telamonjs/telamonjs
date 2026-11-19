import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatsGrid, StatsRow } from './StatsGrid'
import type { HeaderStatsConfig } from '../../types/dialog-header'

interface V {
  id: number
  corridas: number
}
const stats: HeaderStatsConfig<V> = {
  items: [
    {
      label: 'Corridas',
      value: v => v.corridas,
      icon: 'Route',
      color: 'blue',
      href: v => (v.corridas ? `/corridas?produto=${v.id}` : null),
    },
    { label: 'Km', value: '10', icon: 'Gauge', color: 'green' },
  ],
}

describe('StatItem href (7.19)', () => {
  it.each([
    ['row', StatsRow],
    ['grid', StatsGrid],
  ] as const)('%s: links the stat with href, plain card without', (_, C) => {
    render(<C<V> item={{ id: 7, corridas: 3 }} stats={stats} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/corridas?produto=7')
    expect(screen.getByRole('link')).toHaveTextContent('Corridas')
  })

  it('function returning null keeps it a plain card', () => {
    render(<StatsRow<V> item={{ id: 7, corridas: 0 }} stats={stats} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Corridas')).toBeInTheDocument()
  })
})
