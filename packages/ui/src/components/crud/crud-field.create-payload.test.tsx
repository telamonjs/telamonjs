/**
 * consumer QA: the create sub-form receives the parent id (so `component`
 * renderers can use it), but AdminForm also injected it into the submitted values —
 * the child POST carried `"id": "<parentId>"` and whitelisting APIs answered 400.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CrudField from './crud-field'
import type { FormField } from '../../types/forms/admin-form'

const Probe = ({ id }: { id: string }) => <span data-testid='probe-id'>{id}</span>

describe('CrudField create payload', () => {
  it('passes the parent id to component renderers but never in the child values', async () => {
    const create = vi.fn().mockResolvedValue(true)
    const field: FormField = {
      name: 'contatos',
      label: 'Contatos',
      type: 'crud',
      crudConfig: {
        loadData: async () => [],
        columns: [{ header: 'Nome', accessorKey: 'nome' }],
        fields: [
          { name: 'nome', label: 'Nome', type: 'text' },
          { name: 'extra', label: 'Extra', type: 'component', Component: Probe },
        ],
        create,
      },
    }
    render(<CrudField id='parent-1' field={field} />)

    await userEvent.click((await screen.findAllByTestId('crud-field-add-button'))[0])
    expect(await screen.findByTestId('probe-id')).toHaveTextContent('parent-1')

    await userEvent.type(screen.getByLabelText(/Nome/), 'Fulano')
    await userEvent.click(screen.getByRole('button', { name: /salvar|criar/i }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    const [values, params] = create.mock.calls[0]
    expect(values).toMatchObject({ nome: 'Fulano' })
    expect(values).not.toHaveProperty('id')
    expect(params).toEqual({ id: 'parent-1' })
  })

  it('shows the API message when the child create fails (not "Erro ao processar formulário")', async () => {
    const err = new Error('x') as Error & { message: unknown }
    err.message = ['nome should not be empty']
    const field: FormField = {
      name: 'contatos',
      label: 'Contatos',
      type: 'crud',
      crudConfig: {
        loadData: async () => [],
        columns: [{ header: 'Nome', accessorKey: 'nome' }],
        fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        create: vi.fn().mockRejectedValue(err),
      },
    }
    render(<CrudField id='parent-1' field={field} />)
    await userEvent.click((await screen.findAllByTestId('crud-field-add-button'))[0])
    await userEvent.click(await screen.findByRole('button', { name: /salvar|criar/i }))
    expect(await screen.findByText('nome should not be empty')).toBeInTheDocument()
    expect(screen.queryByText('Erro ao processar formulário')).not.toBeInTheDocument()
  })
})
