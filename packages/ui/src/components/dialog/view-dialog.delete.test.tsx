import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewDialog } from './view-dialog'

vi.mock('../../hooks/use-mobile', () => ({ useIsMobile: () => false }))

interface Item extends Record<string, unknown> {
  id: string
  nome: string
}

const props = {
  id: '1',
  open: true,
  onOpenChange: vi.fn(),
  fetchAction: vi.fn().mockResolvedValue({ id: '1', nome: 'Ana' }),
  title: 'Ficha',
  renderContent: () => <div>conteudo</div>,
  onDelete: vi.fn().mockResolvedValue(undefined),
}

describe('ViewDialog delete footer (#11)', () => {
  it('uses custom label and function confirm texts resolved with the item', async () => {
    render(
      <ViewDialog<Item>
        {...props}
        deleteLabel='Desativar'
        deleteConfirmation={{
          title: item => `Desativar ${item.nome}?`,
          description: item => `${item.nome} perde o acesso`,
        }}
      />
    )
    const btn = await screen.findByTestId('view-dialog-delete-button')
    expect(btn).toHaveTextContent('Desativar')
    await screen.findByText('conteudo')
    await userEvent.click(btn)
    expect(screen.getByText('Desativar Ana?')).toBeInTheDocument()
    expect(screen.getByText('Ana perde o acesso')).toBeInTheDocument()
  })

  it('defaults to generic label when nothing is configured', async () => {
    render(<ViewDialog<Item> {...props} />)
    const btn = await screen.findByTestId('view-dialog-delete-button')
    expect(btn).toHaveTextContent('Excluir')
  })
})
