import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TabToolbar } from './TabToolbar'

describe('TabToolbar.AutoRefresh', () => {
  it('shows "Ao vivo" with the last update time and never spins', () => {
    const { container } = render(
      <TabToolbar.AutoRefresh
        enabled
        onToggle={vi.fn()}
        updatedAt={new Date('2026-10-01T15:21:00-03:00')} // instante fixo: o setup formata em America/Sao_Paulo, o runner do CI roda em UTC
      />
    )
    const btn = screen.getByTestId('toolbar-auto-refresh-toggle')
    expect(btn).toHaveTextContent('Ao vivo')
    expect(btn).toHaveTextContent('15:21')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.animate-spin')).toBeNull()
  })

  it('shows "Pausado" when disabled and toggles on click', () => {
    const onToggle = vi.fn()
    render(<TabToolbar.AutoRefresh enabled={false} onToggle={onToggle} />)
    const btn = screen.getByTestId('toolbar-auto-refresh-toggle')
    expect(btn).toHaveTextContent('Pausado')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('omits the time when updatedAt is 0 (react-query before first fetch)', () => {
    render(<TabToolbar.AutoRefresh enabled onToggle={vi.fn()} updatedAt={0} />)
    expect(screen.getByTestId('toolbar-auto-refresh-toggle')).not.toHaveTextContent('·')
  })
})

describe('TabToolbar.FilterSelect', () => {
  it('shows the count next to each option', async () => {
    render(
      <TabToolbar.FilterSelect
        label='Conexão'
        value='todos'
        onChange={vi.fn()}
        options={[
          { value: 'todos', label: 'Todos' },
          { value: 'online', label: 'Online', dot: 'bg-green-500', count: 1015 },
        ]}
      />
    )
    await userEvent.click(screen.getByTestId('toolbar-filter-select-trigger'))
    expect(screen.getByTestId('filter-select-option-online')).toHaveTextContent('1.015')
  })
})
