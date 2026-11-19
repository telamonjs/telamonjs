import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '../../test/ui-mocks'
import { CrudViewDialog } from './crud-view-dialog'

vi.mock('../../hooks/use-mobile', () => ({ useIsMobile: () => false }))

type Row = { id: string; nome: string }

const view = {
  title: 'Equipamento',
  renderContent: (r: Row & Record<string, unknown>) => <p>{r.nome}</p>,
}

describe('CrudViewDialog', () => {
  it('opens the config view dialog with getForView', async () => {
    const getForView = vi.fn().mockResolvedValue({ id: '3', nome: 'Via view' })
    const getForEdit = vi.fn()
    render(
      <CrudViewDialog<Row>
        config={
          {
            dialogs: { view },
            mutations: { getForView, getForEdit },
            form: {},
          } as never
        }
        id='3'
        open
        onOpenChange={vi.fn()}
      />
    )
    expect(await screen.findByText('Via view')).toBeInTheDocument()
    expect(getForView).toHaveBeenCalledWith('3')
    expect(getForEdit).not.toHaveBeenCalled()
  })

  it('falls back to getForEdit', async () => {
    const getForEdit = vi.fn().mockResolvedValue({ id: '3', nome: 'Via edit' })
    render(
      <CrudViewDialog<Row>
        config={
          { dialogs: { view }, mutations: { getForEdit }, form: {} } as never
        }
        id='3'
        open
        onOpenChange={vi.fn()}
      />
    )
    await waitFor(() => expect(getForEdit).toHaveBeenCalledWith('3'))
  })

  it('renders nothing without dialogs.view', () => {
    const { container } = render(
      <CrudViewDialog<Row>
        config={{ dialogs: {}, mutations: {}, form: {} } as never}
        id='3'
        open
        onOpenChange={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
