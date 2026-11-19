/**
 * Lacuna 8 (consumer QA): sub-field `description` was dropped by convertSingleField and
 * crudConfig.title/description/emptyTitle/emptyDescription were never read.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CrudField from './crud-field'
import { AdminForm } from '../forms/AdminForm'
import { msg } from '../../i18n/msg'
import { withAppMessages } from '../../test/intl'
import type { FormField } from '../../types/forms/admin-form'
import { TEST_IDS } from '../../utils/test-ids'

vi.mock('../forms/AdminForm', () => ({
  AdminForm: vi.fn(() => <div data-testid='admin-form' />),
}))
vi.mock('../../ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

const app = {
  pay: { title: 'Payments', desc: 'Each payment lowers the balance', empty: 'No payments', emptyDesc: 'Add the first one', hint: 'Paid at' },
}

const field = (crudConfig: FormField['crudConfig']): FormField => ({
  name: 'pagamentos',
  label: 'Pagamentos',
  type: 'crud',
  crudConfig,
})

describe('CrudField crudConfig', () => {
  it('reads title/description/emptyTitle/emptyDescription (MessageRef)', async () => {
    render(
      <CrudField
        id='p1'
        field={field({
          title: msg('pay.title'),
          description: msg('pay.desc'),
          emptyTitle: msg('pay.empty'),
          emptyDescription: msg('pay.emptyDesc'),
          loadData: async () => [],
          columns: [{ header: 'Data', accessorKey: 'data' }],
          fields: [],
        })}
      />,
      { wrapper: withAppMessages(app) },
    )
    expect(screen.getByText('Payments')).toBeInTheDocument()
    expect(screen.getByText('Each payment lowers the balance')).toBeInTheDocument()
    // SubList renders desktop + mobile views
    await waitFor(() => expect(screen.getAllByText('No payments').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Add the first one').length).toBeGreaterThan(0)
  })

  it('hides the delete action when crudConfig has no delete (was a silent no-op)', async () => {
    const config = (del?: () => Promise<unknown>) =>
      field({
        loadData: async () => [{ id: 'r1', nome: 'Row 1' }],
        columns: [{ header: 'Nome', accessorKey: 'nome' }],
        fields: [],
        delete: del,
      })
    const deleteId = TEST_IDS.ROW_ACTION.delete('r1')

    const { unmount } = render(<CrudField id='p1' field={config()} />)
    await waitFor(() => expect(screen.getAllByText('Row 1').length).toBeGreaterThan(0))
    expect(screen.queryAllByTestId(deleteId)).toHaveLength(0)
    unmount()

    render(<CrudField id='p1' field={config(async () => true)} />)
    await waitFor(() => expect(screen.getAllByTestId(deleteId).length).toBeGreaterThan(0))
  })

  it('keeps the sub-field description when converting fields', () => {
    render(
      <CrudField
        id='p1'
        field={field({
          title: 'Pagamentos',
          loadData: async () => [],
          columns: [{ header: 'Data', accessorKey: 'data' }],
          fields: [{ name: 'data', label: 'Data', type: 'date', description: msg('pay.hint') }],
        })}
      />,
    )
    // the (mocked) dialog renders its content eagerly → AdminForm already received the fields
    const props = vi.mocked(AdminForm).mock.calls.at(-1)?.[0] as { fields?: FormField[] }
    expect(props.fields?.[0].description).toEqual(msg('pay.hint'))
  })
})
