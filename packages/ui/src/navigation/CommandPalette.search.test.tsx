import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette, type CommandPaletteItem } from './CommandPalette'

// real Radix dialog (setup mocks ui/dialog globally) — needed for open auto-focus
vi.unmock('../ui/dialog')

const items: CommandPaletteItem[] = [
  { id: 'man', label: 'Manutenção', type: 'navigation', href: '/admin/manutencao' },
  { id: 'vei', label: 'Produtos', type: 'navigation', href: '/admin/produtos' },
  { id: 'off', label: 'Desligado', type: 'navigation', href: '/x', disabled: true },
]

describe('CommandPalette (consumer QA 7.3.1)', () => {
  it('search ignores accents ("manutencao" finds "Manutenção")', async () => {
    render(<CommandPalette items={items} open onOpenChange={() => undefined} />)
    await userEvent.type(screen.getByRole('combobox'), 'manutencao')
    expect(screen.getByText('Manutenção')).toBeInTheDocument()
    expect(screen.queryByText('Produtos')).not.toBeInTheDocument()
  })

  it('does not list disabled items', () => {
    render(<CommandPalette items={items} open onOpenChange={() => undefined} />)
    expect(screen.queryByText('Desligado')).not.toBeInTheDocument()
  })

  it('reopening clears the query and focuses the input', async () => {
    const { rerender } = render(<CommandPalette items={items} open onOpenChange={() => undefined} />)
    await userEvent.type(screen.getByRole('combobox'), 'vei')
    rerender(<CommandPalette items={items} open={false} onOpenChange={() => undefined} />)
    rerender(<CommandPalette items={items} open onOpenChange={() => undefined} />)
    const input = screen.getByRole('combobox')
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(screen.getByText('Manutenção')).toBeInTheDocument()
  })
})
