/**
 * consumer QA: CrudField rendered on its own (no Dialog /
 * AdminForm ancestor) crashed on "Adicionar" — the add button was a Radix
 * DialogTrigger outside its Dialog. The global ui/dialog mock hid it.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CrudField from './crud-field'
import type { FormField } from '../../types/forms/admin-form'

vi.unmock('../../ui/dialog')

describe('CrudField standalone', () => {
  it('opens the sub-form without a parent Dialog', async () => {
    const field: FormField = {
      name: 'contatos',
      label: 'Contatos',
      type: 'crud',
      crudConfig: {
        loadData: async () => [],
        columns: [{ header: 'Nome', accessorKey: 'nome' }],
        fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        create: vi.fn().mockResolvedValue(true),
      },
    }
    render(<CrudField id='parent-1' field={field} />)
    await userEvent.click((await screen.findAllByTestId('crud-field-add-button'))[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
