import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StatCard } from './stat-card'

const baseProps = {
  label: 'Produtos',
  icon: 'activity',
  color: 'blue',
} as const

describe('StatCard — animate', () => {
  it('sem animate renderiza o valor exato formatado', () => {
    render(<StatCard {...baseProps} value={1234} />)
    expect(screen.getByText('1.234')).toBeInTheDocument()
  })

  it('com animate=true monta já no valor alvo (sem flicker inicial)', () => {
    render(<StatCard {...baseProps} value={42} animate />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('com animate=true anima até o novo valor quando value muda', async () => {
    const { rerender } = render(
      <StatCard {...baseProps} value={0} animate animationDuration={50} />
    )
    rerender(
      <StatCard {...baseProps} value={200} animate animationDuration={50} />
    )
    await waitFor(() => {
      expect(screen.getByText('200')).toBeInTheDocument()
    })
  })

  it('valor string nunca anima — renderiza como veio', () => {
    render(<StatCard {...baseProps} value='R$ 1,2k' animate />)
    expect(screen.getByText('R$ 1,2k')).toBeInTheDocument()
  })

  it('valor animado passa pelo formatNumber (pt-BR)', async () => {
    const { rerender } = render(
      <StatCard {...baseProps} value={0} animate animationDuration={50} />
    )
    rerender(
      <StatCard {...baseProps} value={9500} animate animationDuration={50} />
    )
    await waitFor(() => {
      expect(screen.getByText('9.500')).toBeInTheDocument()
    })
  })
})

// PRD 068 item 7: subtitle muted at /70 measured 2.72:1; label truncation opt-out
describe('StatCard — contrast and wrapLabel', () => {
  for (const variant of ['tinted', 'outlined', 'accent'] as const) {
    it(`${variant}: subtitle uses full muted-foreground (no /70)`, () => {
      render(<StatCard {...baseProps} value={1} variant={variant} subtitle='no mês' />)
      expect(screen.getByText('no mês').className).not.toMatch(/muted-foreground\/70/)
      expect(screen.getByText('no mês')).toHaveClass('text-muted-foreground')
    })
  }

  for (const variant of ['outlined', 'accent'] as const) {
    it(`${variant}: label truncates by default`, () => {
      render(<StatCard {...baseProps} value={1} variant={variant} />)
      expect(screen.getByText('Produtos')).toHaveClass('truncate')
    })

    it(`${variant}: wrapLabel lets the label wrap`, () => {
      render(<StatCard {...baseProps} value={1} variant={variant} wrapLabel />)
      expect(screen.getByText('Produtos')).not.toHaveClass('truncate')
      expect(screen.getByText('Produtos')).toHaveClass('break-words')
    })
  }
})
