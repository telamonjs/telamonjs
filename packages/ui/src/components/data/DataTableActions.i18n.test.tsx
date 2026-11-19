import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Row } from '@tanstack/react-table'
import { DataTableActions } from './DataTableActions'
import { msg } from '../../i18n/msg'
import { telamonjsMessages } from '../../i18n/messages'
import { withAppMessages } from '../../test/intl'
import { TEST_IDS } from '../../utils/test-ids'
import type { DataTableActionsConfig } from '../../types/actions'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/items',
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

interface Item extends Record<string, unknown> {
  id: number
  name: string
}

function makeRow(data: Item): Row<Item> & { original: Item & { id: number } } {
  return { original: data } as unknown as Row<Item> & {
    original: Item & { id: number }
  }
}

const appMessages = {
  users: {
    archive: 'Archive',
    archiveTitle: 'Archive {name}?',
    archiveDescription: '{name} will be hidden',
    archiveFailed: 'Could not archive {name}',
    archived: '{name} archived',
  },
}

const renderEn = (config: DataTableActionsConfig<Item>) =>
  render(<DataTableActions<Item> row={makeRow({ id: 1, name: 'John' })} config={config} />, {
    wrapper: withAppMessages(appMessages),
  })

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
})

describe('DataTableActions i18n', () => {
  it('resolves a MessageRef ActionConfig.label (msg("users.archive")) against app messages', () => {
    const config: DataTableActionsConfig<Item> = {
      custom: [{ id: 'archive', label: msg('users.archive'), onClick: () => {} }],
    }

    render(
      <NextIntlClientProvider locale='en' messages={{ ...telamonjsMessages.en, ...appMessages }}>
        <DataTableActions<Item> row={makeRow({ id: 1, name: 'John Doe' })} config={config} />
      </NextIntlClientProvider>,
    )

    expect(screen.getByText('Archive')).toBeInTheDocument()
  })

  it('confirmDialog title/description as (row) => MessageRef are resolved', () => {
    renderEn({
      custom: [
        {
          id: 'archive',
          label: 'Archive',
          onClick: () => {},
          confirmDialog: {
            title: (r) => msg('users.archiveTitle', { name: r.name }),
            description: (r) => msg('users.archiveDescription', { name: r.name }),
          },
        },
      ],
    })
    expect(screen.getByText('Archive John?')).toBeInTheDocument()
    expect(screen.getByText('John will be hidden')).toBeInTheDocument()
  })

  it('confirmDialog title/description as (row) => string keep working', () => {
    renderEn({
      custom: [
        {
          id: 'archive',
          label: 'Archive',
          onClick: () => {},
          confirmDialog: { title: (r) => `Arquivar ${r.name}?`, description: () => 'Some' },
        },
      ],
    })
    expect(screen.getByText('Arquivar John?')).toBeInTheDocument()
  })

  it('confirmDialog: true uses library messages in the active locale (no English literals)', () => {
    renderEn({ standard: { delete: true } })
    expect(screen.getByText(telamonjsMessages.en.telamonjs.dialog.confirmActionTitle)).toBeInTheDocument()
    expect(screen.getByText(telamonjsMessages.en.telamonjs.common.confirm)).toBeInTheDocument()
    expect(screen.getByText(telamonjsMessages.en.telamonjs.common.cancel)).toBeInTheDocument()
  })

  it('errorMessage / successMessage accept MessageRef (static and from a function)', async () => {
    renderEn({
      custom: [
        {
          id: 'fail',
          label: 'Fail',
          onClick: () => Promise.reject(new Error('boom')),
          errorMessage: (r) => msg('users.archiveFailed', { name: r.name }),
        },
        {
          id: 'ok',
          label: 'Ok',
          onClick: () => Promise.resolve(),
          successMessage: msg('users.archived', { name: 'X' }),
        },
      ],
    })
    fireEvent.click(screen.getByTestId(TEST_IDS.ROW_ACTION.custom('fail', 1)))
    await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith('Could not archive John'))
    fireEvent.click(screen.getByTestId(TEST_IDS.ROW_ACTION.custom('ok', 1)))
    await vi.waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('X archived'))
  })

  it('error without message falls back to the localized unknown-error text', async () => {
    renderEn({ custom: [{ id: 'fail', label: 'Fail', onClick: () => Promise.reject(new Error('')) }] })
    fireEvent.click(screen.getByTestId(TEST_IDS.ROW_ACTION.custom('fail', 1)))
    await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith(telamonjsMessages.en.telamonjs.toast.unknownError))
  })
})
