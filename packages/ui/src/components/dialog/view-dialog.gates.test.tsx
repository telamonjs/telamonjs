import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ViewDialog } from './view-dialog'

vi.mock('../../hooks/use-mobile', () => ({ useIsMobile: () => false }))

interface Item extends Record<string, unknown> {
  id: string
  nome: string
}

const base = {
  id: '1',
  open: true,
  onOpenChange: vi.fn(),
  fetchAction: vi.fn().mockResolvedValue({ id: '1', nome: 'Ana' }),
  title: 'Ficha',
  renderContent: () => <div>conteudo</div>,
  onEdit: vi.fn(),
  onDelete: vi.fn().mockResolvedValue(undefined),
}

describe('ViewDialog footer gates (canEdit / canDelete)', () => {
  it('without gates both buttons show (unchanged behavior)', async () => {
    render(<ViewDialog<Item> {...base} />)
    expect(await screen.findByTestId('view-dialog-edit-button')).toBeInTheDocument()
    expect(screen.getByTestId('view-dialog-delete-button')).toBeInTheDocument()
  })

  it('gates evaluate the loaded item and hide what they refuse', async () => {
    render(
      <ViewDialog<Item>
        {...base}
        canEdit={item => item.nome === 'Ana'}
        canDelete={item => item.nome !== 'Ana'}
      />
    )
    expect(await screen.findByTestId('view-dialog-edit-button')).toBeInTheDocument()
    expect(screen.queryByTestId('view-dialog-delete-button')).not.toBeInTheDocument()
  })

  it('no footer at all when every gate refuses', async () => {
    render(<ViewDialog<Item> {...base} canEdit={() => false} canDelete={() => false} />)
    await screen.findByText('conteudo')
    expect(screen.queryByTestId('view-dialog-edit-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('view-dialog-delete-button')).not.toBeInTheDocument()
  })
})
